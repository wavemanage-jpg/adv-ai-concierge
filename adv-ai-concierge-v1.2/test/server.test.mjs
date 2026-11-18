import test from 'node:test';
import assert from 'node:assert/strict';
import {server} from '../server.mjs';

test('health, session, chat and bad message',async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();const base=`http://127.0.0.1:${address.port}`;
  try {
    let r=await fetch(base+'/health');assert.equal(r.status,200);
    r=await fetch(base+'/api/session',{method:'POST'});assert.equal(r.status,201);
    const {token}=await r.json();assert.match(token,/^[a-f0-9]{64}$/);
    r=await fetch(base+'/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token,message:'Webサイトを作りたい'})});assert.equal(r.status,200);
    const body=await r.json();assert.match(body.reply,/Webサイト/);
    r=await fetch(base+'/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token,message:''})});assert.equal(r.status,400);
    r=await fetch(base+'/widget.js');assert.equal(r.status,200);assert.match(await r.text(),/ADV AI Concierge/);
  } finally {await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));}
});
