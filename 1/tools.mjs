import {scopeRequest,requestScope,appendDraft,buildChecklist} from './scope.mjs';
const form=document.querySelector('[data-scoper]'),status=form.querySelector('[role=status]'),submit=form.querySelector('[type=submit]'),result=document.querySelector('[data-scope-result]');
let token='',api=null,widget=null,loading=false,busy=false;
function ready(){submit.disabled=!token || busy;}
async function challenge(){
  if(loading)return;loading=true;status.textContent='Loading spam protection…';
  try{
    const config=await fetch('/assets/facts.json',{cache:'no-store',credentials:'omit'}).then(r=>{if(!r.ok)throw Error();return r.json();});
    if(!config.contact?.form?.turnstile_sitekey)throw Error();
    if(!window.turnstile)await new Promise((resolve,reject)=>{
      const src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      const existing=[...document.scripts].find(s=>s.src===src),script=existing || document.createElement('script');
      const timer=setTimeout(()=>reject(Error()),20000);
      script.addEventListener('load',()=>{clearTimeout(timer);resolve();},{once:true});script.addEventListener('error',()=>{clearTimeout(timer);reject(Error());},{once:true});
      if(!existing){script.src=src;script.async=true;document.head.append(script);}
    });
    api=window.turnstile;if(!api)throw Error();
    const target=form.querySelector('[data-challenge]');
    widget=api.render(target,{sitekey:config.contact.form.turnstile_sitekey,size:'compact',theme:'auto',language:'en',callback:value=>{token=value;ready();status.textContent='Ready to request your draft.';},'expired-callback':()=>{token='';ready();status.textContent='Spam check expired. Complete it again.';},'error-callback':()=>{token='';ready();status.textContent='Spam check unavailable. Use the contact links, or retry protection.';}});
  }catch{loading=false;status.textContent='Spam protection could not load. Retry protection, or use the contact links.';}
}
form.querySelector('[data-load-challenge]').addEventListener('click',()=>{if(api && widget!==null){token='';api.reset(widget);ready();}else challenge();});
form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;
  let request;try{request=scopeRequest(form.elements.project.value,token);}catch(e){status.textContent=e.message;return;}
  busy=true;form.elements.project.disabled=true;ready();result.replaceChildren();form.setAttribute('aria-busy','true');status.textContent='Requesting an AI draft…';
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
  try{const draft=await requestScope(fetch,request,controller.signal);appendDraft(result,draft);status.textContent='Draft ready. A human reviews it before any quote.';}
  catch(e){status.textContent=e.name==='AbortError'?'The request timed out. Please retry; no draft is shown.':e.message;}
  finally{clearTimeout(timer);busy=false;form.elements.project.disabled=false;token='';form.setAttribute('aria-busy','false');ready();if(api && widget!==null)api.reset(widget);}
});
const checklist=document.querySelector('[data-checklist]'),output=checklist.querySelector('[name=checklist]'),localStatus=checklist.querySelector('[role=status]');
checklist.addEventListener('submit',event=>{event.preventDefault();const values=Object.fromEntries(new FormData(checklist));const lines=buildChecklist(values);output.value=lines.join('\n');localStatus.textContent=lines.length?'Checklist built from your inputs. Edit each line before agreeing it.':'Add an outcome, output format, example or rule first.';});
checklist.querySelector('[data-download]').addEventListener('click',()=>{if(!output.value.trim()){localStatus.textContent='Build or write your checklist first.';return;}const url=URL.createObjectURL(new Blob(['# Draft acceptance checklist\n\n'+output.value],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='draft-acceptance-checklist.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);localStatus.textContent='Download requested. This is your editable draft, not an agreed scope.';});

checklist.querySelector("[type=submit]").disabled=false;
