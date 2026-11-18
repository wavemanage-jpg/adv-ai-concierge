import {readFile, writeFile, rename} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const DEFAULT_FILE = fileURLToPath(new URL('../knowledge.json', import.meta.url));
export async function loadKnowledge(filename=DEFAULT_FILE) {
  const data=JSON.parse(await readFile(filename,'utf8'));
  if (!Array.isArray(data)) throw Error('Knowledge must be an array');
  return data.filter(x=>x.published===true && typeof x.title==='string' && typeof x.summary==='string' && /^https:\/\//.test(x.url||''));
}
export function selectKnowledge(items, message, maxItems=5) {
  const raw=message.toLowerCase();
  const terms=[...(raw.match(/[a-z0-9]{2,}/g)||[]),...Array.from({length:Math.max(0,raw.length-1)},(_,i)=>raw.slice(i,i+2)).filter(t=>/[\p{L}\p{N}]/u.test(t))];
  return items.map(item=>({item,score:terms.reduce((n,term)=>n+((item.title+' '+item.summary).toLowerCase().includes(term)?1:0),0)}))
    .sort((a,b)=>b.score-a.score).slice(0,maxItems).filter(v=>v.score>0).map(v=>v.item);
}
export async function saveKnowledgeAtomically(items, filename=DEFAULT_FILE) {
  const tmp=filename+'.'+randomUUID()+'.tmp';
  try {await writeFile(tmp,JSON.stringify(items,null,2)+'\n',{mode:0o600});await rename(tmp,filename);}
  catch(err){try{const {unlink}=await import('node:fs/promises');await unlink(tmp);}catch{}throw err;}
}
