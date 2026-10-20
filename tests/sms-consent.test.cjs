// Run with: node tests/sms-consent.test.cjs (uses the provisioned Playwright install).
const {chromium} = require('/home/brian/echo-review/node_modules/playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const root = path.resolve(__dirname, '..');
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/assets/interest-list.mjs') {
      res.setHeader('content-type', 'text/javascript');
      return res.end('export const mountInterestPlaces=async()=>{};export const challengeApi=async()=>({render:(_,o)=>o.callback()});');
    }
    const file = path.join(root, pathname === '/1/' ? '1/index.html' : pathname);
    try { res.setHeader('content-type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.json') ? 'application/json' : 'text/html'); res.end(fs.readFileSync(file)); }
    catch {res.writeHead(404).end();}
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless:true});
  try {
    const page = await browser.newPage({viewport:{width:390,height:844}});
    let posts = 0;
    await page.route('https://api.meissner.services/**', route => {posts++; return route.abort();});
    await page.goto(`http://127.0.0.1:${server.address().port}/1/#sms-opt-in`);
    const form = page.locator('meissner-contact form'); await form.waitFor();
    const checkbox = form.locator('input[type=checkbox]');
    assert.equal(await checkbox.isChecked(), false);
    assert.equal(await form.locator('details').count(), 0);
    assert.equal(await page.locator('#sms-opt-in').evaluate(el=>el.open), true);
    await form.locator('[name=email]').fill('test@example.com');
    await form.locator('[name=message]').fill('Test project');
    const payload = () => form.evaluate(el => Object.fromEntries(new FormData(el)));
    assert.equal((await payload()).message, 'Test project');
    assert.equal(await form.evaluate(el=>el.checkValidity()), true);
    await checkbox.check();
    const phone = form.locator('input[type=tel]').last();
    assert.equal(await form.evaluate(el=>el.checkValidity()), false);
    await phone.fill('bad'); assert.equal(await form.evaluate(el=>el.checkValidity()), false);
    await phone.fill('+12025550123'); assert.equal(await form.evaluate(el=>el.checkValidity()), true);
    const first = await payload(), second = await payload();
    assert.deepEqual(first, second); // serialization must not accumulate consent in the textarea
    const proof = JSON.parse(first.message.split('SMS consent record: ')[1]);
    assert.equal(proof.sms_consent,true); assert.equal(proof.mobile,'+12025550123');
    assert.match(proof.source, /\/1\/$/); assert.match(proof.disclosure, /Msg&data rates may apply/);
    assert.match(proof.disclosure, /STOP/); assert.match(proof.disclosure, /HELP/);
    assert.equal(await form.locator('a[href="/sms/privacy/"]').count(),1);
    assert.equal(await form.locator('a[href="/sms/terms/"]').count(),1);
    await checkbox.uncheck(); assert.equal((await payload()).message,'Test project');
    assert.equal(await phone.isDisabled(),true); assert.equal(await form.evaluate(el=>el.checkValidity()), true);
    assert.equal(posts,0);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({path:path.join(root,'..','candidate-opt-in.png'),fullPage:true});
    console.log('PASS: optional unchecked consent, validation, durable message proof, no duplicate proof, no POST, mobile layout');
  } finally {await browser.close(); await new Promise(resolve=>server.close(resolve));}
})().catch(err=>{console.error(err);process.exitCode=1;});
