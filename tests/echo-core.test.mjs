import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../assets/echo-core.mjs';
const catalog = ['1', '2', '3'].flatMap(page => ['hero', 'pricing', 'contact'].map(type => ({cid:`${page}.${type}`, type, kind:'section', parent:null, page})));
const rows = [
 {cid:'i1:1.hero',iteration:1,style:5,copy:1}, {cid:'i1:2.hero',iteration:1,style:2,copy:5},
 {cid:'i1:1.pricing',iteration:1,style:0,copy:null}, {cid:'i1:2.pricing',iteration:1,style:4,copy:4},
 {cid:'i1:3.pricing',iteration:1,style:4,copy:4}, {cid:'i2:1.hero',iteration:2,style:1,copy:1}
];
test('later round cannot replace previous ratings; malformed score rejected', () => {
 const first=core.ratingsFor(rows,1), second=core.ratingsFor(rows,2);
 assert.equal(first.get('1.hero').style,5); assert.equal(second.get('1.hero').style,1);
 assert.notEqual(core.ratingId(1,'slot-hero'),core.ratingId(2,'slot-hero'));
 for(const bad of [-1,6,'5',NaN,undefined]) assert.throws(()=>core.score(bad));
});
test('N/A is answered but excluded from means; null remains unrated',()=>{
 const ratings=core.ratingsFor(rows,1), pricing=core.summarize(catalog,ratings).find(c=>c.type==='pricing');
 assert.equal(pricing.measures.style.rated,2); assert.equal(pricing.measures.copy.rated,2);
 assert.equal(pricing.measures.style.average,4); assert.equal(pricing.measures.style.inconclusive,true);
 assert.equal(core.answered({style:0,copy:0}),true); assert.equal(core.answered({style:0,copy:null}),false);
 assert.equal(core.nextUnrated(catalog,ratings,'1.hero').cid,'1.pricing');
});
test('style and copy independently choose different winners and honest uncertainty',()=>{
 const summary=core.summarize(catalog,core.ratingsFor(rows,1)), hero=summary.find(s=>s.type==='hero');
 assert.equal(hero.measures.style.ranked[0].cid,'1.hero'); assert.equal(hero.measures.copy.ranked[0].cid,'2.hero');
 assert.equal(hero.measures.style.inconclusive,false); assert.equal(hero.measures.copy.disliked[0].cid,'1.hero');
 assert.equal(summary.find(s=>s.type==='contact').measures.copy.average,null);
 assert.equal(summary.find(s=>s.type==='contact').measures.copy.inconclusive,true);
});
test('deterministic synthesis separates content/style and does not fabricate a preference',()=>{
 const ratings=core.ratingsFor(rows,1), one=core.synthesize(catalog,ratings),two=core.synthesize(catalog.slice().reverse(),ratings);
 assert.deepEqual(one,two); assert.equal(one.slots[0].copy_from,'2.hero'); assert.equal(one.slots[0].style_from,'1');
 assert.equal(one.slots.find(s=>s.type==='contact').provisional_copy,true);
});
test('layout reorder/hide/restore survives serialization and removes unknown/duplicate ids',()=>{
 const initial=core.synthesize(catalog,new Map()), reordered=core.move(initial,'slot-contact','slot-hero');
 reordered.hidden=['slot-pricing','slot-pricing','unknown'];
 const restored=core.normalizeLayout(JSON.parse(JSON.stringify(reordered)));
 assert.deepEqual(restored.order,['slot-contact','slot-hero','slot-pricing']); assert.deepEqual(restored.hidden,['slot-pricing']);
 assert.deepEqual(core.move(restored,'slot-contact',null).order,['slot-hero','slot-pricing','slot-contact']);
});
test('runner-up swaps content independently of style and preserves durable slot identity',()=>{
 const layout=core.synthesize(catalog,core.ratingsFor(rows,1)); const slot=layout.slots[0];
 const swapped=core.cycleCandidate(slot,'copy',catalog); assert.equal(swapped.id,slot.id); assert.equal(swapped.style_from,slot.style_from); assert.notEqual(swapped.copy_from,slot.copy_from);
 const styled=core.cycleCandidate(slot,'style',catalog); assert.equal(styled.copy_from,slot.copy_from); assert.notEqual(styled.style_cid,slot.style_cid);
});
test('owner and teammate cannot overwrite or see each other as their own ratings',()=>{
 const mixed=[...rows,{cid:'i1:1.hero',iteration:1,rater:'team-a',style:1,copy:4}];
 assert.equal(core.ratingsFor(mixed,1,'owner').get('1.hero').style,5);
 assert.equal(core.ratingsFor(mixed,1,'team-a').get('1.hero').style,1);
 const aggregate=core.aggregateRatings(mixed,1);assert.equal(aggregate.ratings.get('1.hero').style,3);
 assert.equal(aggregate.splits.find(s=>s.cid==='1.hero' && s.measure==='style').agreement,false);
});
test('seven-page rule accepts either positive measure, excludes N/A, never grows',()=>{
 const plan=core.reviewPlan();assert.equal(plan.denominator,7);
 const r=new Map([['1.HERO',{style:5,copy:null}],['2.LOGO',{style:0,copy:0}],['3.CTA',{style:null,copy:1}],['HW.OTHER',{style:5,copy:5}]]);
 assert.deepEqual(core.pageProgress(r),{answered:2,total:7,done:['1','3'],next:'2'});
 r.set('1.EXTRA',{style:5,copy:5});assert.equal(core.pageProgress(r).total,7);
});
test('same-page inherited signal is weak and labelled; direct score and explicit N/A override it',()=>{
 const direct=new Map([['1.hero',{style:5,copy:null}],['1.pricing',{style:1,copy:0}]]);
 const inferred=core.inheritSignals(catalog,direct);
 assert.equal(inferred.get('1.contact').style,3);assert.equal(inferred.get('1.contact').sources.style,'inherited');
 assert.equal(inferred.get('1.pricing').style,1);assert.equal(inferred.get('1.pricing').sources.style,'direct');
 assert.equal(inferred.get('1.pricing').copy,0);assert.equal(inferred.get('2.contact').style,null);
 const summary=core.summarize(catalog,inferred).find(s=>s.type==='contact');assert.equal(summary.measures.style.rated,0);assert.equal(summary.measures.style.inherited.length,1);
});
test('active time unions overlapping recorders instead of double counting tabs/devices',()=>{
 assert.equal(core.activeMilliseconds([[0,1000],[500,1500],[2000,3000],[100,100],['bad',2]]),2500);
});

test('rank scores retain exact order, fractional echoes, singleton and empty tray',async()=>{
 const {rankScores,score}=await import('../assets/echo-core.mjs');
 const scores=rankScores(['a','b','c','d','e','f','g']);
 assert.equal(scores.get('a'),5);assert.equal(scores.get('b'),5-4/6);assert.equal(scores.get('g'),1);
 assert.equal(score(scores.get('b')),scores.get('b'));assert.equal(rankScores(['only']).get('only'),5);assert.equal(rankScores([]).size,0);
 assert.throws(()=>rankScores(['a','a']));assert.throws(()=>score(NaN));
});

test('compare and rank choose one original-language candidate per numbered page',async()=>{
 const {comparisonCandidates}=await import('../assets/echo-core.mjs');
 const c=[{cid:'6.HERO',page:'6',type:'hero',kind:'section'},{cid:'6.ES.HERO',page:'6',type:'hero',kind:'section'},{cid:'HW.HERO',page:'how-we-work',type:'hero',kind:'section'},{cid:'7.HELLO',page:'7',type:'hero',kind:'section'}];
 assert.deepEqual(comparisonCandidates(c,'hero').map(c=>c.cid),['6.HERO','7.HELLO']);
});

test('inheritance keeps style and copy evidence separate',async()=>{
 const {inheritSignals}=await import('../assets/echo-core.mjs');
 const signals=inheritSignals([{cid:'1.HERO',page:'1'},{cid:'1.CONTACT',page:'1'}],new Map([['1.HERO',{style:5,copy:null}]]));
 assert.equal(signals.get('1.CONTACT').style,5);assert.equal(signals.get('1.CONTACT').copy,null);
});

test('private layout retains selected copy and source identity without duplicate text inventory',async()=>{
 const {compactLayout}=await import('../assets/echo-core.mjs');
 const full={slots:[{id:'hero',copy_from:'1.HERO'}],copies:{'1.HERO':{title:'chosen'},'2.HERO':{title:'runner up'}},candidate_catalog:[{cid:'1.HERO',type:'hero',kind:'section',parent:null,page:'1',text:'huge duplicate'},{cid:'1.HERO.headline',kind:'component',parent:'1.HERO'}],order:['hero'],hidden:['hero']};
 const compact=compactLayout(full);assert.deepEqual(Object.keys(compact.copies),['1.HERO']);assert.equal(compact.candidate_catalog.length,1);assert.equal(compact.candidate_catalog[0].text,undefined);assert.deepEqual(compact.hidden,['hero']);assert.equal(full.copies['2.HERO'].title,'runner up');
});

test('activity clock excludes idle and hidden time, resumes only on activity',async()=>{
 const {activityClock,activeMilliseconds}=await import('../assets/echo-core.mjs');
 const clock=activityClock(1000);clock.input(100);assert.deepEqual(clock.take(500),[[100,500]]);
 clock.visible(false,700);assert.deepEqual(clock.take(3000),[[500,700]]);
 clock.visible(true,3000);assert.deepEqual(clock.take(3500),[]);
 clock.input(4000);assert.deepEqual(clock.take(7000),[[4000,5000]]);
 clock.input(8000);clock.input(8500);assert.equal(activeMilliseconds(clock.take(10000)),1500);
});

test('copy fetch completion cannot replace a style swap made while waiting',async()=>{
 const {swapLayout}=await import('../assets/echo-core.mjs');
 const catalog=[{cid:'1.HERO',page:'1',type:'hero',kind:'section'},{cid:'2.HERO',page:'2',type:'hero',kind:'section'}];
 let layout={slots:[{id:'hero',type:'hero',copy_from:'1.HERO',style_cid:'1.HERO',style_from:'1'}]};
 layout=swapLayout(layout,'hero','style',catalog);
 layout=swapLayout(layout,'hero','copy',catalog);
 assert.equal(layout.slots[0].style_from,'2');assert.equal(layout.slots[0].copy_from,'2.HERO');
});
