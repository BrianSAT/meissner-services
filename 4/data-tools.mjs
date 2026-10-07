/** RFC4180-style quoted fields, including embedded commas/newlines and escaped quotes. */
export function parseCSV(text) {
  if(text.length>2*1024*1024)throw new Error('Try a file smaller than 2 MB.');
  text=text.replace(/^\uFEFF/,'');let rows=[],row=[],cell='',quoted=false,closed=false;
  function field(){row.push(cell);cell='';closed=false;}
  function line(){field();rows.push(row);row=[];if(rows.length>20001)throw new Error('Try at most 20,000 data rows.');}
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(quoted){if(ch==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=ch;continue;}
    if(ch===','){field();continue;}
    if(ch==='\r' || ch==='\n'){if(ch==='\r' && text[i+1]==='\n')i++;line();continue;}
    if(ch==='"'){if(cell || closed)throw new Error('Unexpected quote: quote the entire field.');quoted=true;continue;}
    if(closed){if(ch===' ' || ch==='\t')continue;throw new Error('Unexpected text after a quoted field.');}
    cell+=ch;
  }
  if(quoted)throw new Error('A quoted field is missing its closing quote.');
  if(cell || row.length || closed)line();
  return rows;
}
export function cleanCSV(rows,{trim=true,dedupe=true,protect=true}={}) {
  let duplicates=0,empty=0,trimmed=0,protectedCells=0;const seen=new Set(),result=[];
  for(let i=0;i<rows.length;i++){
    let row=rows[i].map(v=>{const value=trim?v.trim():v;if(value!==v)trimmed++;return value;});
    if(row.every(v=>!v.trim())){empty++;continue;}
    const key=JSON.stringify(row);
    if(i>0 && dedupe && seen.has(key)){duplicates++;continue;}
    if(i>0)seen.add(key);
    if(protect)row=row.map(v=>{
      if(/^\s*[=+@-]/.test(v) && !/^[-+]?\d+(?:\.\d+)?(?:e[-+]?\d+)?$/i.test(v.trim())){protectedCells++;return "'"+v;}return v;
    });
    result.push(row);
  }
  return {rows:result,duplicates,empty,trimmed,protectedCells};
}
export function serializeCSV(rows){return rows.map(row=>row.map(v=>/[",\r\n]/.test(v)?'"'+v.replaceAll('"','""')+'"':v).join(',')).join('\r\n')+'\r\n';}
