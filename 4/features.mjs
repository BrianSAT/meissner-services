import {parseCSV,cleanCSV,serializeCSV} from './data-tools.mjs';
const byId=id=>document.getElementById(id), source=byId('csv-source'), status=byId('csv-status');
let result=null;
function table(rows,host){
  host.replaceChildren();const table=document.createElement('table'),caption=document.createElement('caption');caption.textContent=`First ${Math.min(8,rows.length)} records`;table.append(caption);
  for(const [i,row] of rows.slice(0,8).entries()){const tr=document.createElement('tr');for(const value of row){const cell=document.createElement(i===0?'th':'td');if(i===0)cell.scope='col';cell.textContent=value;tr.append(cell);}table.append(tr);}host.append(table);
}
function preview(){
  try {const rows=parseCSV(source.value);result=cleanCSV(rows,{trim:byId('csv-trim').checked,dedupe:byId('csv-dedupe').checked,protect:byId('csv-protect').checked});
    table(rows,byId('csv-before'));table(result.rows,byId('csv-after'));byId('csv-download').disabled=!result.rows.length;
    status.textContent=`${rows.length} records → ${result.rows.length}. ${result.duplicates} duplicate rows removed; ${result.empty} blank rows removed; ${result.trimmed} fields trimmed; ${result.protectedCells} spreadsheet formulas made literal. No fuzzy matching or AI.`;
  }catch(error){result=null;byId('csv-download').disabled=true;status.textContent=error.message;}
}
async function openFile(file){if(!file)return;if(file.size>2*1024*1024){result=null;byId('csv-download').disabled=true;status.textContent='Try a file smaller than 2 MB.';return;}source.value=await file.text();preview();}
byId('csv-file').addEventListener('change',e=>openFile(e.target.files[0]));
byId('csv-demo').addEventListener('click',()=>{source.value='name,email,note\r\n"Doe, Jo", jo@example.test ,"said ""hello"""\r\n"Doe, Jo",jo@example.test,"said ""hello"""\r\nAna,ana@example.test, first draft \r\n,,\r\n';preview();});
byId('csv-preview').addEventListener('click',preview);
const drop=byId('csv-drop');drop.addEventListener('dragover',e=>{e.preventDefault();});drop.addEventListener('drop',e=>{e.preventDefault();openFile(e.dataTransfer.files[0]);});
byId('csv-download').addEventListener('click',()=>{
  if(!result)return;const url=URL.createObjectURL(new Blob([serializeCSV(result.rows)],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='workshop-cleaned.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
let historyLoaded=false;
byId('history-open').addEventListener('toggle',async e=>{
  if(!e.target.open || historyLoaded)return;
  try {const response=await fetch('/4/history.json');if(!response.ok)throw new Error('History unavailable');const history=await response.json();
    const slider=byId('history-slider');slider.max=String(history.revisions.length-1);slider.disabled=false;
    const minutes=Math.round((Date.parse(history.revisions.at(-1).timestamp)-Date.parse(history.revisions[0].timestamp))/60000);
    byId('history-elapsed').textContent=`First retained Workshop revision to the latest archived revision: ${minutes} minutes of elapsed clock time. This is not active work time or a turnaround promise.`;
    function show(){const revision=history.revisions[Number(slider.value)];byId('history-frame').src=revision.snapshot;byId('history-label').textContent=`${Number(slider.value)+1} / ${history.revisions.length} · ${new Date(revision.timestamp).toLocaleString()} · ${revision.title}`;byId('history-commit').href=`https://github.com/BrianSAT/meissner-services/commit/${revision.sha}`;byId('history-commit').textContent=`See retained commit ${revision.sha.slice(0,7)}`;}
    slider.addEventListener('input',show);show();historyLoaded=true;
  }catch(error){byId('history-label').textContent=error.message;}
});
