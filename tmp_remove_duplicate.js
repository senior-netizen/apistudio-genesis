import fs from 'node:fs';

const path = 'squirrel/backend/prisma/schema.prisma';
const text = fs.readFileSync(path, 'utf8');
const first = text.indexOf('model ApiKey {');
const second = text.indexOf('model ApiKey {', first + 1);
const auditLog = text.indexOf('model AuditLog {', second);

if (second === -1 || auditLog === -1) {
  throw new Error('second ApiKey block not found');
}

fs.writeFileSync(path, text.slice(0, second) + text.slice(auditLog), 'utf8');
