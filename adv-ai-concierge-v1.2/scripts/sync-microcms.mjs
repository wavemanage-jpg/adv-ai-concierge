// Run manually or from a scheduled private job. NEVER give this script a draftKey.
import {loadKnowledge,saveKnowledgeAtomically} from '../lib/knowledge.mjs';
const {MICROCMS_SERVICE:service,MICROCMS_API_KEY:key,MICROCMS_ENDPOINT:endpoint,MICROCMS_TITLE_FIELD:titleField='title',MICROCMS_BODY_FIELD:bodyField='body',MICROCMS_PUBLIC_URL_TEMPLATE:urlTemplate}=process.env;
if (!service || !key || !endpoint || !urlTemplate) {console.error('Required: MICROCMS_SERVICE, MICROCMS_API_KEY, MICROCMS_ENDPOINT, MICROCMS_PUBLIC_URL_TEMPLATE');process.exit(1);}
if (!/^[a-z0-9-]+$/.test(service) || !/^[a-zA-Z0-9_-]+$/.test(endpoint) || !urlTemplate.startsWith('https://') || !urlTemplate.includes('{id}')) {throw Error('Invalid microCMS configuration');}
const stripHtml=value => String(value??'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,8000);
async function getAll(){
 const items=[];let offset=0,total=Infinity;
 while(offset<total){
  const url=new URL(`https://${service}.microcms.io/api/v1/${endpoint}`);
  url.searchParams.set('limit','100');url.searchParams.set('offset',String(offset));
  const r=await fetch(url,{headers:{'X-MICROCMS-API-KEY':key},signal:AbortSignal.timeout(15000)});
  if(!r.ok) throw Error(`microCMS HTTP ${r.status}`);
  const d=await r.json();if(!Array.isArray(d.contents)||!Number.isInteger(d.totalCount))throw Error('Unexpected microCMS response');
  for(const item of d.contents){
   if(typeof item.id!=='string')continue;
   items.push({source:'microcms',id:item.id,title:stripHtml(item[titleField]).slice(0,200),summary:stripHtml(item[bodyField]),url:urlTemplate.replace('{id}',encodeURIComponent(item.id)),published:true});
  }
  total=d.totalCount;offset+=d.contents.length;if(!d.contents.length)break;
 }
 if(items.length!==total)throw Error('Incomplete microCMS pagination; existing knowledge preserved');
 return items;
}
const existing=await loadKnowledge();
const fresh=await getAll();
// Retain manually curated website items, while removing unpublished/deleted microCMS entries.
await saveKnowledgeAtomically([...existing.filter(x=>x.source!=='microcms'),...fresh]);
console.log(`Synced ${fresh.length} published microCMS articles`);
