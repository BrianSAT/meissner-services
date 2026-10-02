import {ratingsFor} from './echo-core.mjs';
export function shareLines(rows,iteration,rater,{includeNotes=false}={}) {
  const choices=[];
  for(const [id,row] of ratingsFor(rows,iteration,rater)){
    if(!/^[A-Za-z0-9_.-]{1,100}$/.test(id))continue;
    for(const measure of ['style','copy'])if(row[measure]>=1)choices.push({id,measure,value:row[measure],note:row.note});
  }
  choices.sort((a,b)=>b.value-a.value || a.id.localeCompare(b.id) || a.measure.localeCompare(b.measure));
  return choices.slice(0,6).map(({id,measure,value,note})=>{
    const label=id.replaceAll('.',' · ').slice(0,60),line=`${Number(value.toFixed(3))} echoes · ${label} · ${measure}`;
    const safeNote=String(note || '').replace(/https?:\/\/[^\s]*[?&]s=[^\s]*/gi,'[private review link omitted]').slice(0,160);
    return includeNotes && safeNote?`${line}\nNote: ${safeNote}`:line;
  });
}
export function drawShareCard(canvas,lines,iteration) {
  const ctx=canvas.getContext('2d');canvas.width=1200;canvas.height=900;
  ctx.fillStyle='#eeeae0';ctx.fillRect(0,0,1200,900);ctx.fillStyle='#20241d';ctx.fillRect(0,0,1200,170);
  ctx.fillStyle='#d4e757';ctx.font='bold 28px Arial';ctx.fillText('MEISSNER SERVICES / ECHO REVIEW',60,65);
  ctx.fillStyle='#ffffff';ctx.font='bold 46px Arial';ctx.fillText(`My choices · iteration ${iteration}`,60,125);
  ctx.fillStyle='#20241d';ctx.font='24px Arial';let y=230;
  for(const line of lines){for(const paragraph of line.split('\n')){
    const words=paragraph.split(/\s+/);let current='';
    for(const word of words){const next=current?current+' '+word:word;if(ctx.measureText(next).width>1080 && current){if(y<=750)ctx.fillText(current,60,y);y+=34;current=word;}else current=next;}if(y<=750)ctx.fillText(current,60,y);y+=34;
  }y+=20;if(y>740)break;}
  if(!lines.length)ctx.fillText('My next version starts with the choices I make.',60,230);
  ctx.font='21px Arial';ctx.fillText('Generated locally from my ratings · no AI output',60,815);
  ctx.fillText('Try the prototypes: meissner.services/review/',60,855);
}
export function mountShareCard(parent,getRows,iteration,rater) {
  const section=document.createElement('section');section.className='echo-feature';section.dataset.component='REVIEW.SHARE';section.dataset.type='share-card';section.id='REVIEW.SHARE';
  const heading=document.createElement('h2');heading.textContent='Make your choices shareable.';
  const text=document.createElement('p');text.textContent='Generate a summary image entirely on this device. It contains selected ratings, never your private review link. Notes are excluded unless you choose to include them. Preview it before sharing.';
  const controls=document.createElement('div');controls.dataset.echoInteractive='';
  const label=document.createElement('label'),consent=document.createElement('input');consent.type='checkbox';label.append(consent,' Include my selected private rating notes in the image');
  const generate=document.createElement('button');generate.type='button';generate.textContent='Create summary image';
  const download=document.createElement('a');download.download='my-echo-review.png';download.hidden=true;download.textContent='Download PNG';
  const share=document.createElement('button');share.type='button';share.textContent='Share image';share.hidden=true;
  const canvas=document.createElement('canvas');canvas.hidden=true;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Your locally generated Echo summary; text also listed below');
  const transcript=document.createElement('ul'),status=document.createElement('p');status.setAttribute('role','status');
  let url=null,file=null;
  function invalidate(){download.hidden=true;share.hidden=true;canvas.hidden=true;transcript.replaceChildren();file=null;if(url)URL.revokeObjectURL(url);url=null;status.textContent='Create a new image to apply your privacy choice.';}
  consent.addEventListener('change',invalidate);
  generate.addEventListener('click',async()=>{
    invalidate();const lines=shareLines(getRows(),iteration,rater,{includeNotes:consent.checked});drawShareCard(canvas,lines,iteration);canvas.hidden=false;
    for(const line of lines){const li=document.createElement('li');li.textContent=line;transcript.append(li);}
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob){status.textContent='This browser could not create a PNG.';return;}
    url=URL.createObjectURL(blob);download.href=url;download.hidden=false;file=new File([blob],'my-echo-review.png',{type:'image/png'});
    share.hidden=!navigator.canShare?.({files:[file]});status.textContent=consent.checked?'Preview includes your selected notes. Check it before sharing.':'Preview contains ratings only; private notes and review link excluded.';
  });
  share.addEventListener('click',async()=>{if(!file)return;try{await navigator.share({files:[file],title:'My Echo Review choices'});}catch{status.textContent='Sharing cancelled or unavailable. You can download the PNG.';}});
  controls.append(label,generate,download,share);section.append(heading,text,controls,canvas,transcript,status);parent.append(section);
}
