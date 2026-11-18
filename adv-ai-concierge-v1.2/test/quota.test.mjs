import test from 'node:test';
import assert from 'node:assert/strict';
import {makeQuotaKey,checkSharedQuota} from '../lib/quota.mjs';

test('quota keys do not contain raw session identifiers',()=>{
  const key=makeQuotaKey('client','test-secret-token','random-long-salt');
  assert.match(key,/^[a-f0-9]{64}$/);
  assert.equal(key.includes('test-secret-token'),false);
  assert.notEqual(key,makeQuotaKey('client','test-secret-token','another-salt'));
});

test('quota rejects when one shared limit is exhausted and rolls back',async()=>{
  const queries=[];let releaseCount=0;
  const pool={connect:async()=>({query:async(sql)=>{queries.push(sql);return sql.startsWith('INSERT') ? {rowCount:queries.filter(x=>x.startsWith('INSERT')).length===2?0:1} : {rowCount:0};},release:()=>releaseCount++})};
  const ok=await checkSharedQuota(pool,'session','salt',new Date('2026-11-18T03:00:00Z'));
  assert.equal(ok,false);assert.ok(queries.includes('ROLLBACK'));assert.equal(releaseCount,1);
});
