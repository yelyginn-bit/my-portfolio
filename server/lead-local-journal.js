import { constants } from 'node:fs';
import { mkdir, lstat, open } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { randomUUID } from 'node:crypto';

export function createLocalLeadJournal(directory) {
  async function ensureDirectory() {
    if (!isAbsolute(directory || '')) throw new Error('Private journal directory required');
    await mkdir(directory, { mode: 0o700 }).catch(error => { if (error.code !== 'EEXIST') throw error; });
    const stat = await lstat(directory);
    if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077)) throw new Error('Unsafe journal permissions');
  }
  async function syncDirectory() { const fd = await open(directory, constants.O_RDONLY | constants.O_DIRECTORY); try { await fd.sync(); } finally { await fd.close(); } }
  return {
    async record(lead) {
      await ensureDirectory();
      const id = randomUUID(); const record = { ...lead, id, receivedAt: new Date().toISOString() };
      const fd = await open(join(directory, id + '.json'), constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
      try { await fd.writeFile(JSON.stringify(record) + '\n'); await fd.sync(); } finally { await fd.close(); }
      await syncDirectory(); return record;
    },
    async event(id, status, details = {}) {
      if (!/^[0-9a-f-]{36}$/.test(id) || !['consent_failed','consent_recorded','mail_sent','mail_failed'].includes(status)) throw new Error('Invalid journal event');
      await ensureDirectory();
      const fd = await open(join(directory, id + '.events.jsonl'), constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT | constants.O_NOFOLLOW, 0o600);
      try { const stat = await fd.stat(); if (!stat.isFile() || (stat.mode & 0o077)) throw new Error('Unsafe journal file'); await fd.writeFile(JSON.stringify({ status, at: new Date().toISOString(), ...(typeof details.leadId === "string" ? { leadId: details.leadId.slice(0,160) } : {}) }) + '\n'); await fd.sync(); } finally { await fd.close(); }
      await syncDirectory();
    },
  };
}
