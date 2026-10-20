import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createVpsLeadApp } from '../server/lead-delivery-app.js';
// A clean CI checkout has no ignored report directory.
await mkdir(resolve('_agent-reports'), { recursive: true });
let fixtureIp = 1;
const body = {name:'Локальный тест',contact:'fixture@example.com',message:'Только локальная фикстура',service:'Съёмка',source:'/',formId:'homepage-contact',consentAccepted:true,consentVersion:'1.0',policyVersion:'2.0'};
async function withSmtp(options,run){
 const directory=await mkdtemp(resolve('_agent-reports/48-handler-fixture-'));
 const env={LEAD_VPS_ENABLED:'true',LEAD_DELIVERY_CHANNEL:'smtp-yandex',LEAD_JOURNAL_DIR:directory,LEAD_SMTP_USER:'fixture@yandex.ru',LEAD_SMTP_PASSWORD:'fixture-only',LEAD_MAIL_TO:'owner@example.com',SUPABASE_URL:'https://fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture-only',...options.env};
 const server=createVpsLeadApp({env,smtp:options.smtp||{admin:()=>({rpc:async()=>({data:'local-consent-id'})}),deliver:async()=>{}}}).listen(0,'127.0.0.1');
 await new Promise(resolve=>server.once('listening',resolve));
 try{const origin=`http://127.0.0.1:${server.address().port}`;const csrf=await fetch(origin+'/api/csrf');const token=(await csrf.json()).csrfToken;
 const headers={'Content-Type':'application/json',Origin:'https://yelyginn.ru',Cookie:`yel_csrf=${token}`,'X-CSRF-Token':token,'X-Forwarded-For':`198.18.0.${fixtureIp++}`};
 const submit=(data=body,extra={})=>fetch(origin+'/api/send-form',{method:'POST',headers:{...headers,...extra},body:JSON.stringify(data)});
 await run({directory,origin,submit,token,headers,env});}
 finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});}
}
test('SMTP draft remains disabled with missing secrets, unsafe journal, relay, Telegram or unknown channel',async()=>{
 for(const env of [{LEAD_SMTP_PASSWORD:''},{LEAD_JOURNAL_DIR:'relative'},{SUPABASE_SERVICE_ROLE_KEY:''},{LEAD_RELAY_ENABLED:'true'},{LEAD_TELEGRAM_ENABLED:'true'},{LEAD_DELIVERY_CHANNEL:'unknown'}]){
  await withSmtp({env},async({origin})=>{const response=await fetch(origin+'/api/send-form');assert.equal(response.status,503);});
 }
});
test('SMTP draft preserves CSRF, active consent, validation and origin before any journal or mail',async()=>{
 let calls=0;
 await withSmtp({smtp:{admin:()=>({rpc:async()=>{calls++;return{data:'fixture'};}}),deliver:async()=>calls++}},async({submit,directory})=>{
  assert.equal((await submit(body,{'X-CSRF-Token':''})).status,403);
  assert.equal((await submit({...body,consentAccepted:false})).status,400);
  assert.equal((await submit({...body,consentVersion:'old'})).status,400);
  assert.equal((await submit({...body,policyVersion:'old'})).status,400);
  assert.equal((await submit({...body,contact:'invalid'})).status,400);
  assert.equal((await submit(body,{Origin:'https://fixture.invalid'})).status,403);
  assert.equal(calls,0);assert.deepEqual(await readdir(directory),[]);
 });
});
test('SMTP draft durably records the lead and real consent RPC before the mail fixture',async()=>{
 let consent=false,mail=false;
 await withSmtp({smtp:{admin:()=>({rpc:async(name,args)=>{assert.equal(name,'record_lead_with_consent');assert.equal(args.p_consent_version,'1.0');assert.equal(args.p_policy_version,'2.0');consent=true;return{data:'fixture-consent-id'};}}),deliver:async record=>{
  assert.ok(consent);assert.equal(record.message,body.message);mail=true;
 }}},async({submit,directory})=>{
  const response=await submit();assert.equal(response.status,200);assert.equal((await response.json()).ok,true);assert.ok(mail);
  const files=await readdir(directory);const record=JSON.parse(await readFile(join(directory,files.find(f=>f.endsWith('.json'))),'utf8'));
  assert.equal(record.contact,body.contact);assert.equal(record.consentAccepted,true);assert.equal(record.formId,body.formId);assert.ok(record.documentHash);
  const events=await readFile(join(directory,record.id+'.events.jsonl'),'utf8');assert.match(events,/consent_recorded/);assert.match(events,/fixture-consent-id/);assert.match(events,/mail_sent/);
 });
});
test('SMTP failure preserves the complete lead and queues acceptance instead of claiming mail delivery',async()=>{
 await withSmtp({smtp:{admin:()=>({rpc:async()=>({data:'fixture-id'})}),deliver:async()=>{throw new Error('fixture SMTP failure');}}},async({submit,directory})=>{
  const response=await submit();assert.equal(response.status,202);const data=await response.json();assert.equal(data.ok,true);assert.equal(data.queued,true);
  const files=await readdir(directory);const record=JSON.parse(await readFile(join(directory,files.find(f=>f.endsWith('.json'))),'utf8'));assert.equal(record.message,body.message);
  assert.match(await readFile(join(directory,record.id+'.events.jsonl'),'utf8'),/mail_failed/);
 });
});
test('SMTP draft never sends on consent RPC failure or acknowledges a failed local write',async()=>{
 let mail=0;
 await withSmtp({smtp:{admin:()=>({rpc:async()=>({error:{message:'fixture'}})}),deliver:async()=>mail++}},async({submit,directory})=>{
  assert.equal((await submit()).status,503);const files=await readdir(directory);assert.equal(files.length,2);assert.match(await readFile(join(directory,files.find(f=>f.endsWith('.jsonl'))),'utf8'),/consent_failed/);
 });
 await withSmtp({smtp:{admin:()=>({rpc:async()=>{assert.fail('RPC must follow local durable write');}}),journal:{record:async()=>{throw new Error('fixture disk full');}},deliver:async()=>mail++}},async({submit})=>{
  const response=await submit();assert.equal(response.status,503);assert.equal((await response.json()).ok,false);
 });assert.equal(mail,0);
});
test('SMTP draft retains the five-per-ten-minute limit',async()=>{
 let mail=0;
 await withSmtp({smtp:{admin:()=>({rpc:async()=>({data:'fixture-id'})}),deliver:async()=>mail++}},async({submit})=>{
  for(let n=0;n<5;n++)assert.equal((await submit()).status,200);
  assert.equal((await submit()).status,429);assert.equal(mail,5);
 });
});
