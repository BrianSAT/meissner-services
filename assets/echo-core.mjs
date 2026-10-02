/** Pure Echo Review preferences/layout logic; no DOM, network or credentials. */
export const measures = ['style', 'copy'];
export function ratingId(iteration, logical) {
  if (!Number.isInteger(iteration) || iteration < 1 || !logical) throw new Error('Invalid rating identity');
  return `i${iteration}:${logical}`;
}
export function score(value) {
  if (value === null || Number.isFinite(value) && value >= 0 && value <= 5) return value;
  throw new Error('Scores are null, N/A (0), or finite 1–5');
}
export function ratingsFor(rows, iteration, rater = "owner") {
  const result = new Map();
  for (const row of rows || []) {
    if (Number(row.iteration) !== iteration || (row.rater || 'owner') !== rater || !row.cid?.startsWith(`i${iteration}:`)) continue;
    result.set(row.cid.slice(row.cid.indexOf(':') + 1), {...row, style: score(row.style ?? null), copy: score(row.copy ?? null)});
  }
  return result;
}
export function answered(row) { return !!row && measures.every(m => row[m] !== null && row[m] !== undefined); }
export function progress(components, ratings) {
  return {answered: components.filter(c => answered(ratings.get(c.cid))).length, total: components.length};
}
export function nextUnrated(components, ratings, current) {
  const start = components.findIndex(c => c.cid === current);
  for (let offset = 1; offset <= components.length; offset++) {
    const component = components[(start + offset + components.length) % components.length];
    if (!answered(ratings.get(component.cid))) return component;
  }
  return null;
}
export function summarize(catalog, ratings) {
  const types = [...new Set(catalog.map(c => c.type))].sort();
  return types.map(type => {
    const candidates = catalog.filter(c => c.type === type);
    const result = {type, candidates, measures: {}};
    for (const measure of measures) {
      const ranked = candidates.map(c => ({...c, value: ratings.get(c.cid)?.[measure], source:ratings.get(c.cid)?.sources?.[measure] || 'direct'}))
        .filter(c => typeof c.value === 'number' && c.value > 0)
        .sort((a, b) => (b.source==='direct'?1:0)-(a.source==='direct'?1:0) || b.value - a.value || a.cid.localeCompare(b.cid));
      const direct = ranked.filter(c=>c.source==='direct');
      const average = direct.length ? direct.reduce((sum,c)=>sum+c.value,0)/direct.length:null;
      const gap = ranked.length >= 2 ? ranked[0].value - ranked[1].value : null;
      result.measures[measure] = {ranked, average, gap, rated: direct.length, inherited:ranked.filter(c=>c.source==='inherited'), total: candidates.length,
        liked: direct.filter(c => c.value >= 4), disliked: direct.filter(c => c.value <= 2),
        inconclusive: direct.length < 2 || gap <= 0.5};
    }
    return result;
  });
}
export function synthesize(catalog, ratings, iteration = 2) {
  const sectionTypes = ['hero', 'logo', 'process', 'method', 'pricing', 'story', 'speed', 'terms', 'faq', 'contact', 'canonical'];
  const candidates = catalog.filter(c => c.kind === 'section' || !c.parent);
  const summaries = summarize(candidates, ratings);
  const families = new Map();
  for (const c of candidates) {
    const value = ratings.get(c.cid)?.style;
    if (value > 0) { const old = families.get(String(c.page)) || [0, 0]; families.set(String(c.page), [old[0] + value, old[1] + 1]); }
  }
  const rankedThemes = [...families].map(([family, [sum, count]]) => ({family, value: sum / count}))
    .sort((a, b) => b.value - a.value || a.family.localeCompare(b.family));
  const theme = rankedThemes[0]?.family || '1';
  const slots = [];
  for (const type of sectionTypes) {
    const summary = summaries.find(g => g.type === type);
    if (!summary) continue;
    const fallback = summary.candidates.slice().sort((a, b) => a.cid.localeCompare(b.cid))[0];
    const copy = summary.measures.copy.ranked[0] || fallback;
    const bestStyle = summary.measures.style.ranked[0];
    const themed = summary.candidates.find(c => String(c.page) === theme) || fallback;
    const themedValue = ratings.get(themed.cid)?.style ?? 0;
    // A clear per-slot preference overrides the whole-page family.
    const style = bestStyle && (bestStyle.source === 'direct' && ratings.get(themed.cid)?.sources?.style !== 'direct' || bestStyle.value >= themedValue + 1) ? bestStyle : themed;
    slots.push({id: `slot-${type}`, type, copy_from: copy.cid, style_from: String(style.page), style_cid: style.cid,
      copy_candidates: summary.measures.copy.ranked.map(c => c.cid),
      style_candidates: summary.measures.style.ranked.map(c => c.cid),
      provisional_copy: summary.measures.copy.inconclusive, provisional_style: summary.measures.style.inconclusive,
      copy_signal:copy.source || 'unrated',style_signal:style.source || ratings.get(style.cid)?.sources?.style || 'unrated'});
  }
  return {version: 1, iteration, theme, slots, order: slots.map(s => s.id), hidden: []};
}
export function normalizeLayout(layout) {
  const slots = (layout.slots || []).filter((s, i, list) => s.id && list.findIndex(x => x.id === s.id) === i);
  const ids = new Set(slots.map(s => s.id));
  const order = [...new Set([...(layout.order || []), ...ids])].filter(id => ids.has(id));
  return {...layout, slots, order, hidden: [...new Set(layout.hidden || [])].filter(id => ids.has(id))};
}
export function move(layout, id, beforeId) {
  const result = normalizeLayout(layout);
  if (!result.order.includes(id) || id === beforeId) return result;
  result.order = result.order.filter(item => item !== id);
  const index = beforeId === null ? result.order.length : result.order.indexOf(beforeId);
  if (index < 0) return normalizeLayout(layout);
  result.order.splice(index, 0, id);
  return result;
}
export function cycleCandidate(slot, measure, catalog) {
  const field = measure === 'copy' ? 'copy_from' : 'style_cid';
  const ranked = slot[`${measure}_candidates`] || [];
  const alternatives = [...new Set([...ranked, ...catalog.filter(c => c.type === slot.type && (c.kind === 'section' || !c.parent)).map(c => c.cid)])];
  if (!alternatives.length) return slot;
  const current = alternatives.indexOf(slot[field]);
  const cid = alternatives[(current + 1) % alternatives.length];
  const result = {...slot, [field]: cid};
  if (measure === 'style') result.style_from = String(catalog.find(c => c.cid === cid)?.page || '1');
  return result;
}

export function reviewPlan() { return {version:2, required_pages:['1','2','3','4','5','6','7'], rule:'one-positive-measure-anywhere-per-page', denominator:7}; }
export function pageProgress(ratings) {
  const done = new Set();
  for(const [cid,row] of ratings){
    const page = String(row.variant || cid.split('.')[0]);
    if(/^[1-7]$/.test(page) && measures.some(m=>row[m]>=1 && row[m]<=5))done.add(page);
  }
  return {answered:done.size,total:7,done:[...done].sort(),next:reviewPlan().required_pages.find(page=>!done.has(page)) || null};
}
export function inheritSignals(catalog,direct) {
  const pageValues=new Map();
  for(const [cid,row] of direct){
    const page=String(row.variant || catalog.find(c=>c.cid===cid)?.page || cid.split('.')[0]);
    const values=pageValues.get(page) || {style:[],copy:[]};
    for(const measure of measures)if(row[measure]>0)values[measure].push(row[measure]);
    pageValues.set(page,values);
  }
  const result=new Map();
  for(const c of catalog){
    const original=direct.get(c.cid) || {}, values=pageValues.get(String(c.page)) || {style:[],copy:[]};
    const row={...original,sources:{}};
    for(const measure of measures){
      const mean=values[measure].length?values[measure].reduce((n,v)=>n+v,0)/values[measure].length:null;
      if(original[measure]===0){row[measure]=0;row.sources[measure]='na';}
      else if(original[measure]>0){row[measure]=original[measure];row.sources[measure]='direct';}
      else{row[measure]=mean;row.sources[measure]=mean===null?'unrated':'inherited';}
    }
    result.set(c.cid,row);
  }
  return result;
}
export function aggregateRatings(rows, iteration) {
  const buckets = new Map();
  const latest = new Map();
  for (const row of rows || []) if(Number(row.iteration) === iteration && row.cid?.startsWith(`i${iteration}:`)) latest.set(`${row.rater || 'owner'}:${row.cid}`, row);
  for (const row of latest.values()) {
    const cid = row.cid.slice(row.cid.indexOf(':') + 1);
    const bucket = buckets.get(cid) || {style: [], copy: []};
    for(const measure of measures) if(row[measure] > 0) bucket[measure].push({rater:row.rater || 'owner', value:row[measure]});
    buckets.set(cid,bucket);
  }
  const ratings=new Map(), splits=[];
  for(const [cid,bucket] of buckets){
    const row={};
    for(const measure of measures){
      const values=bucket[measure];row[measure]=values.length?values.reduce((n,v)=>n+v.value,0)/values.length:null;
      if(values.length>=2) splits.push({cid,measure,raters:values.length,min:Math.min(...values.map(v=>v.value)),max:Math.max(...values.map(v=>v.value)),agreement:Math.max(...values.map(v=>v.value))-Math.min(...values.map(v=>v.value))<=1});
    }
    ratings.set(cid,row);
  }
  return {ratings,splits};
}
export function activeMilliseconds(spans) {
  const valid=spans.filter(v=>Array.isArray(v) && v.length===2 && Number.isFinite(v[0]) && Number.isFinite(v[1]) && v[1]>v[0]).sort((a,b)=>a[0]-b[0]);
  let total=0,start=null,end=null;
  for(const span of valid){if(start===null){[start,end]=span;}else if(span[0]<=end){end=Math.max(end,span[1]);}else{total+=end-start;[start,end]=span;}}
  return total+(start===null?0:end-start);
}
/** Preserve raw order separately; a singleton is a favorite, not a divide-by-zero. */
export function rankScores(order) {
  if(new Set(order).size!==order.length)throw new Error('Duplicate ranked candidate');
  return new Map(order.map((id,index)=>[id,order.length===1?5:5-4*index/(order.length-1)]));
}

export function comparisonCandidates(catalog,type) {
  return ['1','2','3','4','5','6','7'].flatMap(page=>{
    const choices=catalog.filter(c=>String(c.page)===page && c.type===type && c.kind==='section');
    const chosen=choices.find(c=>!c.cid.includes('.ES.')) || choices[0];
    return chosen?[chosen]:[];
  });
}
