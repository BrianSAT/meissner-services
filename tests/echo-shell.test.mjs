import test from 'node:test';import assert from 'node:assert/strict';import {publicCacheKey,privateSnapshot,restoreSnapshot} from '../assets/echo-shell.mjs';
test('public cache excludes API, writes and private paths; strips capability queries',()=>{
  const origin='https://meissner.services';assert.equal(publicCacheKey(origin+'/4/?s=secret&r=team',origin),origin+'/4/');
  assert.equal(publicCacheKey('https://api.meissner.services/review/s/secret',origin),null);
  assert.equal(publicCacheKey(origin+'/review/s/secret',origin),null);assert.equal(publicCacheKey(origin+'/assets/shared.js',origin,'POST'),null);
  assert.equal(publicCacheKey(origin+'/review/components.json',origin),origin+'/review/components.json');assert.equal(publicCacheKey(origin+'/review/s/secret.json',origin),null);
});
test('private offline snapshot requires exact session/rater and excludes other raters',()=>{
  const value=privateSnapshot({ratings:[{cid:'i1:4.HERO',rater:'owner',style:5},{cid:'i1:4.HERO',rater:'team',style:1}],layouts:{},activity:{per_rater_ms:{owner:20,team:40}}},'one','owner');
  assert.equal(restoreSnapshot(value,'one','owner').ratings.length,1);assert.equal(restoreSnapshot(value,'two','owner'),null);assert.equal(restoreSnapshot(value,'one','team'),null);assert.deepEqual(value.session.activity.per_rater_ms,{owner:20});
});
