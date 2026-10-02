import test from 'node:test';
import assert from 'node:assert/strict';
import {activityRecorder} from '../assets/echo-activity.mjs';

function fixture(send,initial=[]) {
  let at=10000, saved=initial;
  const recorder=activityRecorder({now:()=>at,read:()=>saved,write:v=>{saved=v;},send,rater:'owner',device:'test-phone',idleMs:1000});
  return {recorder,at(v){at=v;},saved:()=>saved};
}
test('visible review activity stops at idle, background and review-off; successful upload clears outbox',async()=>{
  const uploads=[],f=fixture(async b=>{uploads.push(b);return {stored:b.spans.length,rejected:0};});
  f.recorder.enabled(true);f.recorder.input();f.at(10500);f.recorder.visible(false);f.at(12000);await f.recorder.flush();
  assert.deepEqual(uploads[0],{rater:'owner',device:'test-phone',spans:[[10000,10500]]});
  f.recorder.visible(true);f.at(13000);await f.recorder.flush();assert.equal(uploads.length,1);
  f.recorder.input();f.at(16000);await f.recorder.flush();assert.deepEqual(uploads[1].spans,[[13000,14000]]);
  f.recorder.enabled(false);f.recorder.input();f.at(17000);await f.recorder.flush();assert.equal(uploads.length,2);assert.equal(f.recorder.pending(),0);
});
test('offline activity survives reload and is replayed with stable device and rater',async()=>{
  const old=fixture(async()=>{throw new Error('offline');});old.recorder.enabled(true);old.recorder.input();old.at(10500);
  assert.equal(await old.recorder.flush(),false);assert.equal(old.recorder.pending(),1);
  const uploads=[],reload=fixture(async b=>{uploads.push(b);return {stored:1,rejected:0};},structuredClone(old.saved()));
  assert.equal(await reload.recorder.flush(),true);assert.deepEqual(uploads[0].spans,[[10000,10500]]);assert.equal(reload.recorder.pending(),0);
});
test('rejected receipt retains spans instead of claiming persistence',async()=>{
  const f=fixture(async()=>({stored:0,rejected:1}),[[10000,10500]]);
  assert.equal(await f.recorder.flush(),false);assert.equal(f.recorder.pending(),1);assert.match(f.recorder.error(),/retained/);
});
test('Worker batches never exceed200 and next flush sends remaining backlog',async()=>{
  const uploads=[],f=fixture(async b=>{uploads.push(b);return {stored:b.spans.length,rejected:0};},Array.from({length:205},(_,i)=>[i*10,i*10+1]));
  await f.recorder.flush();assert.equal(uploads[0].spans.length,200);assert.equal(f.recorder.pending(),5);
  await f.recorder.flush();assert.equal(uploads[1].spans.length,5);assert.equal(f.recorder.pending(),0);
});
test('acknowledgement does not discard activity appended during a slow upload',async()=>{
  let resolve;const f=fixture(()=>new Promise(r=>{resolve=r;}));f.recorder.enabled(true);f.recorder.input();f.at(10500);
  const first=f.recorder.flush();f.at(10800);f.recorder.input();f.at(11000);f.recorder.flush();
  resolve({stored:1,rejected:0});await first;assert.deepEqual(f.saved(),[[10500,11000]]);
});
