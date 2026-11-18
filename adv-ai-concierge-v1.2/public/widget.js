/* ADV AI Concierge v1.0 — Standalone embeddable widget (no framework/dependencies) */
(() => {
  if (window.__advAiConciergeInstalled) return;
  window.__advAiConciergeInstalled = true;
  const script = document.currentScript;
  const base = (script?.dataset.apiBase || new URL(script.src).origin).replace(/\/$/, '');
  const title = script?.dataset.title || 'ADV-WAVE AI コンシェルジュ';
  const rawAccent = script?.dataset.accent || '#176db0';
  const accent = /^#[0-9a-fA-F]{6}$/.test(rawAccent) ? rawAccent : '#176db0';
  const host = document.createElement('div');
  host.id = 'adv-ai-concierge-root';
  document.body.appendChild(host);
  const root = host.attachShadow({mode:'open'});
  const style = document.createElement('style');
  style.textContent = `
    :host{all:initial} *{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Noto Sans JP",sans-serif}
    .launcher{position:fixed;bottom:24px;right:24px;z-index:2147483645;background:${accent};border:0;border-radius:99px;color:white;box-shadow:0 8px 26px #0003;padding:14px 19px;cursor:pointer;font-size:14px;font-weight:700}
    .panel{position:fixed;bottom:84px;right:24px;width:min(380px,calc(100vw - 24px));height:min(560px,calc(100dvh - 110px));z-index:2147483646;background:white;border:1px solid #dce4ec;border-radius:18px;box-shadow:0 16px 44px #0003;display:flex;flex-direction:column;overflow:hidden;color:#152533}
    .panel[hidden]{display:none}.head{background:${accent};color:#fff;padding:16px;display:flex;align-items:center;justify-content:space-between;font-size:15px;font-weight:700}
    .close{background:transparent;border:0;color:white;font-size:23px;cursor:pointer}.messages{flex:1;overflow:auto;padding:16px;background:#f6f9fc;display:flex;flex-direction:column;gap:10px}
    .bubble{max-width:91%;font-size:14px;line-height:1.65;padding:10px 13px;border-radius:14px;white-space:pre-wrap;overflow-wrap:anywhere}
    .ai{align-self:flex-start;background:white;border:1px solid #e1e7ee}.user{align-self:flex-end;background:#dceafa}.status{font-size:12px;color:#56697c;padding:0 16px}
    .form{display:flex;gap:8px;padding:12px;border-top:1px solid #e7edf3}.input{flex:1;min-width:0;font-size:14px;border:1px solid #ccd6df;border-radius:10px;padding:10px}.send{background:${accent};border:0;border-radius:10px;color:white;padding:0 13px;cursor:pointer}.send:disabled{opacity:.5;cursor:not-allowed}
    .footer{padding:0 12px 10px;font-size:11px;color:#647588}.footer a{color:${accent}}
    .lead{padding:10px 12px;border-top:1px solid #e7edf3;display:none;gap:7px;flex-direction:column}.lead.visible{display:flex}.lead input,.lead textarea{width:100%;border:1px solid #ccd6df;border-radius:8px;padding:7px;font:inherit;font-size:13px}.lead textarea{min-height:65px;resize:vertical}.lead label{font-size:12px}.lead button{border:0;border-radius:8px;padding:9px;background:${accent};color:#fff;cursor:pointer}.lead button:disabled{opacity:.5}.leadInfo{font-size:12px;color:#526071}
    @media(max-width:480px){.launcher{right:12px;bottom:12px}.panel{right:12px;bottom:68px;width:calc(100vw - 24px);height:min(630px,calc(100dvh - 84px))}}
  `;
  root.appendChild(style);
  const button=document.createElement('button');button.className='launcher';button.textContent='AIに相談する';button.setAttribute('aria-expanded','false');
  const panel=document.createElement('section');panel.className='panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label',title);
  const head=document.createElement('header');head.className='head';const heading=document.createElement('span');heading.textContent=title;const close=document.createElement('button');close.className='close';close.type='button';close.textContent='×';close.setAttribute('aria-label','閉じる');head.append(heading,close);
  const messages=document.createElement('div');messages.className='messages';messages.setAttribute('aria-live','polite');
  const status=document.createElement('p');status.className='status';
  const form=document.createElement('form');form.className='form';const input=document.createElement('input');input.className='input';input.placeholder='ご相談内容を入力...';input.maxLength=1600;input.setAttribute('aria-label','メッセージ');const send=document.createElement('button');send.type='submit';send.className='send';send.textContent='送信';form.append(input,send);
  const footer=document.createElement('div');footer.className='footer';footer.textContent='AIによるご案内です。個人情報や機密情報の入力はお控えください。 ';const contact=document.createElement('a');contact.href='https://adv-wave.co.jp/';contact.target='_blank';contact.rel='noopener noreferrer';contact.textContent='公式サイト・お問い合わせ';footer.append(contact);
  const leadToggle=document.createElement('button');leadToggle.type='button';leadToggle.textContent='担当者に相談を送る';leadToggle.className='leadToggle';
  leadToggle.style.cssText=`margin:0 12px 8px;padding:9px;background:white;color:${accent};border:1px solid ${accent};border-radius:9px;cursor:pointer`;
  const leadForm=document.createElement('form');leadForm.className='lead';
  const createField=(label,name,max,required=false)=>{const field=document.createElement('input');field.name=name;field.maxLength=max;field.placeholder=label;field.required=required;field.setAttribute('aria-label',label);return field;};
  const company=createField('会社名（任意）','company_name',150);
  const name=createField('お名前','contact_name',120,true);
  const email=createField('メールアドレス','email',254,true);email.type='email';
  const summary=document.createElement('textarea');summary.name='inquiry_summary';summary.placeholder='ご相談内容（5文字以上）';summary.maxLength=1500;summary.minLength=5;summary.required=true;
  const consentLabel=document.createElement('label');const consent=document.createElement('input');consent.type='checkbox';consent.required=true;consent.style.width='auto';consentLabel.append(consent,document.createTextNode(' 個人情報の取り扱いに同意して送信する'));
  const privacy=document.createElement('a');privacy.href=script?.dataset.privacyUrl || 'https://adv-wave.co.jp/';privacy.target='_blank';privacy.rel='noopener noreferrer';privacy.textContent='プライバシー情報を確認';
  const leadSubmit=document.createElement('button');leadSubmit.type='submit';leadSubmit.textContent='相談を送信';
  const leadInfo=document.createElement('span');leadInfo.className='leadInfo';leadInfo.setAttribute('role','status');
  leadForm.append(company,name,email,summary,privacy,consentLabel,leadSubmit,leadInfo);
  leadToggle.addEventListener('click',()=>{leadForm.classList.toggle('visible');});
  leadForm.addEventListener('submit', async e=>{e.preventDefault();if(!consent.checked)return;leadSubmit.disabled=true;leadInfo.textContent='送信中...';try{if(!token)token=(await post('/api/session',{})).token;const result=await post('/api/lead',{token,company_name:company.value,contact_name:name.value,email:email.value,inquiry_summary:summary.value,consent:consent.checked});leadInfo.textContent='受付が完了しました。受付ID: '+result.id;leadSubmit.disabled=true;}catch(err){leadInfo.textContent=err.message||'送信できませんでした';leadSubmit.disabled=false;}});
  panel.append(head,messages,status,form,leadToggle,leadForm,footer);root.append(button,panel);
  let token=null;let busy=false;
  function bubble(role,text){const el=document.createElement('div');el.className=`bubble ${role}`;el.textContent=text;messages.append(el);messages.scrollTop=messages.scrollHeight;}
  function toggle(open){panel.hidden=!open;button.setAttribute('aria-expanded',String(open));if(open)input.focus();else button.focus();}
  button.addEventListener('click',()=>toggle(panel.hidden));close.addEventListener('click',()=>toggle(false));
  bubble('ai','こんにちは！ADV-WAVEのAIアシスタントです。Web制作やAI活用など、お気軽にご相談ください。');
  async function post(path,body){const res=await fetch(`${base}${path}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const data=await res.json();if(!res.ok)throw new Error(data.error||'通信エラー');return data;}
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(busy)return;const msg=input.value.trim();if(!msg)return;
    busy=true;send.disabled=true;input.disabled=true;status.textContent='回答を作成中...';input.value='';bubble('user',msg);
    try {if(!token)token=(await post('/api/session',{})).token;const answer=await post('/api/chat',{token,message:msg});bubble('ai',answer.reply);if (typeof answer.contact_url === 'string') { try { const target = new URL(answer.contact_url); if (target.protocol === 'https:' && target.hostname === 'adv-wave.co.jp') contact.href = target.href; } catch {} }}
    catch(err){bubble('ai',err.message||'通信に失敗しました。もう一度お試しください。');}
    finally{busy=false;send.disabled=false;input.disabled=false;status.textContent='';input.focus();}
  });
})();
