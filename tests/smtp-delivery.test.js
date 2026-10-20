import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { mkdtemp, readdir, readFile, stat, rm, chmod, symlink } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { sendLeadMail, smtpConfigured } from '../server/lead-smtp-transport.js';
import { createLocalLeadJournal } from '../server/lead-local-journal.js';
const env = { LEAD_SMTP_USER: 'fixture@yandex.ru', LEAD_MAIL_TO: 'owner@example.com', LEAD_SMTP_PASSWORD: 'fixture-only' };
const lead = { id:'fixture-id',name:'Тест',contact:'test@example.com',service:'Съёмка',message:'.\r\nQUIT\r\nBcc: attacker@example.com',source:'/',receivedAt:'2026-10-20' };
function fixtureProcess(exitCode, inspect) { return (command,args,options) => {
 const child=new EventEmitter();child.stdin=new PassThrough();child.stdio=[child.stdin,null,null,new PassThrough()];child.kill=()=>{};
 let config='',message='';child.stdin.on('data',s=>config+=s);child.stdio[3].on('data',s=>message+=s);
 child.stdio[3].once('finish',()=>queueMicrotask(()=>{inspect({command,args,options,config,message});child.emit('close',exitCode);}));return child;
}; }
test('SMTP uses only Yandex TLS465, keeps credentials out of argv and MIME-encodes visitor content', async()=>{
 await sendLeadMail(lead,{env,spawnProcess:fixtureProcess(0,({command,args,options,config,message})=>{
  assert.equal(command,'curl');assert.deepEqual(args,['--disable','--config','-']);assert.ok(!JSON.stringify(args).includes(env.LEAD_SMTP_PASSWORD));
  assert.ok(config.includes('smtps://smtp.yandex.ru:465'));assert.ok(config.includes('ssl-reqd'));assert.ok(config.includes('max-time = 30'));
  assert.ok(!config.includes('insecure'));assert.ok(!config.includes('proxy'));assert.equal(options.env.LEAD_SMTP_PASSWORD,undefined);
  assert.ok(message.includes('Content-Transfer-Encoding: base64'));assert.ok(!message.includes('\r\nBcc:'));assert.ok(Buffer.from(message.split('\r\n\r\n')[1].replace(/\s/g,''),'base64').toString().includes(lead.message));
 })});
});
test('SMTP rejects config injection and transport failure without disclosing secrets',async()=>{
 assert.equal(smtpConfigured({...env,LEAD_SMTP_PASSWORD:'bad\nurl = evil'}),false);assert.equal(smtpConfigured({...env,LEAD_MAIL_TO:'x@example.com\r\nBcc:bad@example.com'}),false);
 await assert.rejects(sendLeadMail(lead,{env,spawnProcess:fixtureProcess(67,()=>{})}),error=>error.message==='SMTP transport failed'&&!error.message.includes(env.LEAD_SMTP_PASSWORD));
});
test('local journal keeps accepted content and consent before notification, with private permissions',async()=>{
 const directory=await mkdtemp(resolve('_agent-reports/48-journal-fixture-'));
 try {const journal=createLocalLeadJournal(directory);const record=await journal.record({...lead,consentVersion:'1.0',policyVersion:'2.0'});
  await journal.event(record.id,'consent_recorded');await journal.event(record.id,'mail_failed');
  const stored=JSON.parse(await readFile(join(directory,record.id+'.json'),'utf8'));assert.equal(stored.message,lead.message);assert.equal(stored.consentVersion,'1.0');
  assert.equal((await stat(join(directory,record.id+'.json'))).mode&0o777,0o600);assert.equal((await stat(directory)).mode&0o777,0o700);
  assert.match(await readFile(join(directory,record.id+'.events.jsonl'),'utf8'),/mail_failed/);assert.equal((await readdir(directory)).length,2);
  await assert.rejects(journal.event('../escape','mail_sent'));
  await chmod(directory,0o755);await assert.rejects(journal.record(lead),/Unsafe journal/);
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('local journal refuses symlink directories and cannot acknowledge a disk failure',async()=>{
 const directory=await mkdtemp(resolve('_agent-reports/48-journal-fixture-'));
 try {await symlink(directory,join(directory,'link'));await assert.rejects(createLocalLeadJournal(join(directory,'link')).record(lead),/Unsafe journal/);
 await assert.rejects(createLocalLeadJournal(join(directory,'missing','child')).record(lead));}
 finally{await rm(directory,{recursive:true,force:true});}
});
