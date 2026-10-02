import test from 'node:test';import assert from 'node:assert/strict';
import {parseCSV,cleanCSV,serializeCSV} from '../4/data-tools.mjs';
test('quoted commas, newlines, escaped quotes and BOM survive roundtrip',()=>{
  const rows=parseCSV('\uFEFFname,note\r\n"Doe, Jo","said ""hi""\nnext line"\r\n');
  assert.deepEqual(rows,[['name','note'],['Doe, Jo','said "hi"\nnext line']]);assert.deepEqual(parseCSV(serializeCSV(rows)),rows);
});
test('cleanup previews explicit trims, exact normalized duplicates and blanks',()=>{
  const result=cleanCSV(parseCSV('name,count\n Jo , 2 \nJo,2\n,\nJoe,2'));
  assert.deepEqual(result.rows,[['name','count'],['Jo','2'],['Joe','2']]);assert.equal(result.duplicates,1);assert.equal(result.empty,1);assert.equal(result.trimmed,2);
});
test('header is retained and spreadsheet formulas protected without converting negative numbers',()=>{
  const result=cleanCSV([['=head','count'],['=HYPERLINK("evil")','-42'],['@sum','+4']]);
  assert.equal(result.protectedCells,3);assert.equal(result.rows[1][1],'-42');assert.equal(result.rows[1][0][0],"'");
  assert.equal(cleanCSV([['name'],['=A1']],{protect:false}).rows[1][0],'=A1');
});
test('unclosed/partial quotes rejected; all-empty input is safe',()=>{
  assert.throws(()=>parseCSV('a,"unclosed'));assert.throws(()=>parseCSV('a,"yes"bad'));assert.throws(()=>parseCSV('a,b"c'));assert.deepEqual(cleanCSV(parseCSV('')).rows,[]);
});
test('bounds stop large files and oversized row counts',()=>{
  assert.throws(()=>parseCSV('x'.repeat(2097153)));assert.throws(()=>parseCSV('x\n'.repeat(20002)));
});
