// Prepared, disabled adapter. Production /api/send-form remains untouched.
import { getAdmin } from './api/_lib/db.js';
import { readJsonBody, sha256 } from './api/_lib/util.js';
import { rateLimit, requestIp, verifyCsrf } from './api/_lib/security.js';
import { createLocalLeadJournal } from './lead-local-journal.js';
import { sendLeadMail, smtpConfigured } from './lead-smtp-transport.js';
const trim = (value, max) => String(value || '').trim().slice(0,max);
const contactValid = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
 || /^@[a-zA-Z0-9_]{5,32}$/.test(value) || /^https?:\/\/t\.me\/[a-zA-Z0-9_]{5,32}\/?$/.test(value)
 || (value.replace(/\D/g,'').length>=10 && value.replace(/\D/g,'').length<=15);
export function createSmtpLeadHandler({env=process.env, admin=getAdmin,
 journal=createLocalLeadJournal(env.LEAD_JOURNAL_DIR), deliver=record=>sendLeadMail(record,{env})}={}) {
 return async function smtpLead(req,res) {
  if(req.method==='OPTIONS')return res.status(200).json({ok:true});
  if(req.method==='GET')return res.status(200).json({ok:true,configured:smtpConfigured(env),channel:'smtp-yandex'});
  if(req.method!=='POST')return res.status(405).json({ok:false});
  try {
   if(!verifyCsrf(req))return res.status(403).json({ok:false,error:'Обновите страницу и повторите отправку'});
   const body=readJsonBody(req);
   if(body.consentAccepted!==true || body.consentVersion!=='1.0' || body.policyVersion!=='2.0'
    || !['homepage-contact','calculator-lead','data-request'].includes(body.formId))return res.status(400).json({ok:false,error:'Необходимо подтвердить действующее согласие на обработку данных'});
   if(!body.name||!body.contact||!body.message)return res.status(400).json({ok:false,error:'Заполните обязательные поля'});
   if(body.website)return res.status(200).json({ok:true});
   const lead={name:trim(body.name,160),contact:trim(body.contact,200),message:trim(body.message,1500),service:trim(body.service,160),source:trim(body.source||'site',120)};
   if(lead.name.length<2||lead.message.length<5||!contactValid(lead.contact))return res.status(400).json({ok:false,error:'Проверьте имя, контакт и описание задачи'});
   const ip=requestIp(req);
   if(!rateLimit(`smtp-lead:${ip}`,{limit:5,windowMs:600000}))return res.status(429).json({ok:false,error:'Слишком много заявок. Попробуйте позже.'});
   const client=admin(); if(!client || !smtpConfigured(env))return res.status(503).json({ok:false,error:'Сервис заявок временно недоступен'});
   const normalized=lead.contact.toLowerCase().replace(/\s+/g,'');
   const masked=normalized.includes('@')?`${normalized.slice(0,2)}***${normalized.slice(normalized.indexOf('@'))}`:`***${normalized.replace(/\D/g,'').slice(-4)}`;
   const page=String(body.pageUrl||body.source||'/').split('?')[0].slice(0,240);
   const documentHash=sha256(`policy:${body.policyVersion}|consent:${body.consentVersion}`);
   // No SMTP or success response is possible before fsync of the complete record.
   const record=await journal.record({...lead,consentAccepted:true,consentVersion:body.consentVersion,policyVersion:body.policyVersion,formId:body.formId,pageUrl:page,documentHash,ip,userAgent:trim(req.headers['user-agent'],400)});
   const result=await client.rpc('record_lead_with_consent',{
    p_name:lead.name,p_contact:lead.contact,p_message:`${lead.service?lead.service+': ':''}${lead.message}`,p_source:lead.source,
    p_contact_hash:sha256(normalized),p_contact_masked:masked,p_form_id:body.formId,p_page_url:page,p_policy_version:body.policyVersion,p_consent_version:body.consentVersion,p_document_hash:documentHash,p_ip:ip,p_user_agent:record.userAgent});
   if(result.error){await journal.event(record.id,'consent_failed');return res.status(503).json({ok:false,error:'Не удалось зарегистрировать согласие. Попробуйте позже.'});}
   await journal.event(record.id,'consent_recorded',{leadId:result.data});
   try{await deliver(record);}catch{
    await journal.event(record.id,'mail_failed');
    return res.status(202).json({ok:true,queued:true,leadId:result.data,message:'Заявка сохранена. Почтовое уведомление ожидает доставки.'});
   }
   await journal.event(record.id,'mail_sent');
   return res.status(200).json({ok:true,leadId:result.data,message:'Заявка принята'});
  }catch{return res.status(503).json({ok:false,error:'Не удалось сохранить заявку. Попробуйте позже.'});}
 };
}
