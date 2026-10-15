/** Worker /scope contract, fixed Amy bands, no bearer and no synthetic success. */
export const PRICE_BANDS = Object.freeze({
  diagnostic: 'A paid diagnostic first: a fixed USD 50 to 100 step that maps the job, with a quote for the build after it.',
  typical: 'Typical small job: USD 100 to 500, fixed price, agreed before work starts.',
  larger: 'Bigger than a typical small job: we propose a fixed-price first milestone, and quote the rest after you have seen it working.',
  not_a_fit: 'Not something we take on: tax or legal advice, filing with your credentials, or anything that needs a performance or profit claim.'
});
export const DRAFT_LABEL = 'AI-generated draft. A human reviews it before any quote.';
export function scopeRequest(text, token) {
  text=String(text).trim();
  if(text.length<10 || text.length>600)throw new Error('Describe your project in 10–600 characters.');
  if(typeof token!=='string' || !token)throw new Error('Complete the spam check before requesting a draft.');
  return {text,lang:'en',variant:'1','cf-turnstile-response':token};
}
function text(value) {if(typeof value!=='string' || !value.trim() || value.length>4000)throw new Error('The draft response could not be checked. Please retry.');return value.trim();}
export function checkedDraft(value) {
  if(!value || value.ok!==true || value.draft!==true || typeof value.id!=='string' || !value.id || value.id.length>200 || !Object.hasOwn(PRICE_BANDS,value.price_band?.id) || !Array.isArray(value.options) || value.options.length!==3 || !Array.isArray(value.we_need) || value.we_need.length<2 || value.we_need.length>4)throw new Error('The draft response could not be checked. Please retry.');
  const summary=text(value.summary),options=value.options.map(o=>({name:text(o?.name),what_you_get:text(o?.what_you_get)})),needs=value.we_need.map(text);
  // Model prose must never supply a quote or a deadline; reject rather than invent replacements.
  const unsafe=/(?:[$€£]\s*\d|\b(?:USD|EUR|GBP)\s*\d|\b\d+(?:\.\d+)?\s*(?:USD|EUR|GBP|dollars?|euros?|hours?|days?|weeks?|months?|minutes?)\b)/i;
  if([summary,...options.flatMap(o=>[o.name,o.what_you_get]),...needs].some(s=>unsafe.test(s)))throw new Error('The draft included an unapproved price or timing. Please retry or contact us.');
  return {id:value.id,label:DRAFT_LABEL,summary,options,we_need:needs.map(s=>/credential|password|secret|api[ -]?key/i.test(s)?'Access you grant to the relevant tools; do not share passwords or API keys here.':s),price:PRICE_BANDS[value.price_band.id]};
}
export async function requestScope(fetcher,request,signal) {
  const response=await fetcher('https://api.meissner.services/scope',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(request),credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',redirect:'error',signal});
  let value;try{value=await response.json();}catch{throw new Error('The draft service returned an unreadable response. Please retry.');}
  if(!response.ok){
    if(response.status===503)throw new Error('Draft unavailable. Please retry; no draft has been generated here.');
    if(response.status===400 && value?.error==='text_10_to_600_chars')throw new Error('Describe your project in 10–600 characters.');
    if(response.status===400 && value?.error==='captcha_failed')throw new Error('The spam check expired or failed. Complete it again and retry.');
    throw new Error('The draft service could not complete this request. Please retry or contact us.');
  }
  return checkedDraft(value);
}
export function buildChecklist({outcome='',format='',sample='',rules=''}) {
  return [outcome.trim() && `The result achieves: ${outcome.trim()}`,format.trim() && `The delivered output uses: ${format.trim()}`,sample.trim() && `Check the result against this example: ${sample.trim()}`,rules.trim() && `Validate these rules and edge cases: ${rules.trim()}`].filter(Boolean);
}
export function appendDraft(parent,draft,doc=parent.ownerDocument) {
  parent.replaceChildren();
  const add=(tag,content,root=parent)=>{const e=doc.createElement(tag);e.textContent=content;root.append(e);return e;};
  add('strong',draft.label);add('p',draft.summary);const list=add('ol','');
  for(const option of draft.options){const item=add('li','',list);add('strong',option.name,item);add('p',option.what_you_get,item);}
  add('h3','What we would need');const needs=add('ul','');draft.we_need.forEach(s=>add('li',s,needs));add('p',draft.price);add('p','This draft is a starting point, not a quote or a delivery promise.');
}
