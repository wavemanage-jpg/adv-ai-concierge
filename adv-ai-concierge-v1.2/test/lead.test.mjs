import test from 'node:test';
import assert from 'node:assert/strict';
import {server} from '../server.mjs';

test('lead creation requires explicit consent and valid fields; duplicates rejected',async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  async function post(path,obj){return fetch(base+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(obj)});}
  try {
    const sess=await post('/api/session',{});
    assert.equal(sess.status,201);
    const {token}=await sess.json();
    const lead={token,company_name:'Test Inc.',contact_name:'テスト担当',email:'tester@example.com',inquiry_summary:'Webサイトのリニューアルを検討しています',consent:true};
    assert.equal((await post('/api/lead',{...lead,consent:false})).status,400);
    assert.equal((await post('/api/lead',{...lead,email:'invalid'})).status,400);
    const submitted=await post('/api/lead',lead);
    assert.equal(submitted.status,201);
    const body=await submitted.json();assert.equal(body.received,true);assert.ok(body.id);
    assert.equal((await post('/api/lead',lead)).status,409);
    assert.equal((await post('/api/lead',{...lead,token:'a'.repeat(64)})).status,401);
  } finally { await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve())); }
});
