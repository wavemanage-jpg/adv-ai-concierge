import test from 'node:test';
import assert from 'node:assert/strict';
import {server} from '../server.mjs';
import {createMemoryStore} from '../lib/storage.mjs';
test('lead uniqueness is enforced in storage', async()=>{
  const store=createMemoryStore();
  const token=await store.createSession();
  const lead={company_name:'Test',contact_name:'Example',email:'a@example.com',inquiry_summary:'test inquiry'};
  assert.ok(await store.createLead(token,lead));
  assert.equal(await store.createLead(token,lead),null);
});
test('POST chat rejects wrong media type',async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const r=await fetch(`http://127.0.0.1:${server.address().port}/api/chat`,{
      method:'POST',headers:{'content-type':'text/plain'},body:'test'
    });
    assert.equal(r.status,415);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
