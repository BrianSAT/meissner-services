import test from 'node:test';import assert from 'node:assert/strict';import {shareLines} from '../assets/echo-share-card.mjs';
const rows=[{cid:'i1:4.HERO',iteration:1,rater:'owner',style:5,copy:4,note:'Private client words https://meissner.services/4/?s=secret&r=owner'},{cid:'i1:3.HERO',iteration:1,rater:'team',style:1,copy:null,note:'another rater'},{cid:'i2:slot-hero',iteration:2,rater:'owner',style:2,copy:null,note:'another iteration'}];
test('default summary card includes own iteration ratings, no private notes or capability link',()=>{
  const lines=shareLines(rows,1,'owner');assert.equal(lines.length,2);assert.match(lines[0],/5 echoes/);assert.doesNotMatch(lines.join('\n'),/Private|secret|another/);
});
test('explicit note consent still redacts private review links; N/A never appears as preference',()=>{
  const lines=shareLines([...rows,{cid:'i1:4.CSV',iteration:1,style:0,copy:null}],1,'owner',{includeNotes:true});
  assert.match(lines[0],/Private client words/);assert.match(lines[0],/private review link omitted/);assert.doesNotMatch(lines.join('\n'),/s=secret|0 echoes/);
});
