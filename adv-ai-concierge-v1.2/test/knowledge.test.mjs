import test from 'node:test';
import assert from 'node:assert/strict';
import {selectKnowledge,saveKnowledgeAtomically,loadKnowledge} from '../lib/knowledge.mjs';
import {createMemoryStore} from '../lib/storage.mjs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('only published knowledge loaded and matched',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'adv-knowledge-'));
 try {
  const p=join(dir,'knowledge.json');
  await saveKnowledgeAtomically([{title:'Web制作',summary:'サイト制作',url:'https://example.com/web',published:true},{title:'秘密',summary:'非公開',url:'https://example.com/hidden',published:false}],p);
  const all=await loadKnowledge(p);assert.equal(all.length,1);
  assert.equal(selectKnowledge(all,'Web制作について')[0].title,'Web制作');
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('session token isolates conversation history',async()=>{
 const store=createMemoryStore();const a=await store.createSession();const b=await store.createSession();
 assert.deepEqual(await store.getMessages(a),[]);assert.equal(await store.getMessages('bad'),null);
 await store.appendExchange(a,'hello','world');
 assert.equal((await store.getMessages(a)).length,2);assert.equal((await store.getMessages(b)).length,0);
});
