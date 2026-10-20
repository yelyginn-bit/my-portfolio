// Draft-only transport. Not imported by the production server or API router.
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const address = value => /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value || '');
const quote = value => `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
export function smtpConfigured(env) {
  return address(env.LEAD_SMTP_USER) && address(env.LEAD_MAIL_TO)
    && Boolean(env.LEAD_SMTP_PASSWORD) && !/[\r\n\0]/.test(env.LEAD_SMTP_PASSWORD);
}
export async function sendLeadMail(lead, { env = process.env, spawnProcess = spawn } = {}) {
  if (!smtpConfigured(env)) throw new Error('SMTP configuration missing');
  const body = Buffer.from(`Заявка ${lead.id}\nИмя: ${lead.name}\nКонтакт: ${lead.contact}\nУслуга: ${lead.service}\nЗадача: ${lead.message}\nИсточник: ${lead.source}\nВремя: ${lead.receivedAt}`, 'utf8').toString('base64').match(/.{1,76}/g).join('\r\n');
  const mail = [`From: ${env.LEAD_SMTP_USER}`, `To: ${env.LEAD_MAIL_TO}`,
    'Subject: =?UTF-8?B?' + Buffer.from('Заявка с yelyginn.ru').toString('base64') + '?=',
    `Date: ${new Date().toUTCString()}`, `Message-ID: <${randomUUID()}@yelyginn.ru>`,
    'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', body, ''].join('\r\n');
  // Secrets travel through a pipe, never argv, files, stdout or diagnostic errors.
  // curl performs CA/hostname verification; there is no insecure/proxy option.
  const config = ['url = "smtps://smtp.yandex.ru:465"', 'ssl-reqd',
    'proto = "=smtps"', 'connect-timeout = 10', 'max-time = 30', 'silent', 'show-error',
    `user = ${quote(env.LEAD_SMTP_USER + ':' + env.LEAD_SMTP_PASSWORD)}`,
    `mail-from = ${quote(env.LEAD_SMTP_USER)}`, `mail-rcpt = ${quote(env.LEAD_MAIL_TO)}`,
    'upload-file = "/dev/fd/3"', ''].join('\n');
  await new Promise((resolve, reject) => {
    const child = spawnProcess('curl', ['--disable', '--config', '-'], { stdio: ['pipe', 'ignore', 'ignore', 'pipe'], env: { PATH: process.env.PATH, LANG: 'C.UTF-8' } });
    const deadline = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('SMTP timeout')); }, 35000);
    const fail = () => { clearTimeout(deadline); child.kill(); reject(new Error('SMTP transport failed')); };
    child.on('error', fail);
    child.stdin.on('error', fail); child.stdio[3].on('error', fail);
    child.once('close', code => { clearTimeout(deadline); code === 0 ? resolve() : reject(new Error('SMTP transport failed')); });
    child.stdin.end(config); child.stdio[3].end(mail);
  });
}
