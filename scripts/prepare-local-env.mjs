import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
const path = '.env.local';
let text = await readFile(path, 'utf8');
text = text.replace(/^PGPASSWORD=(.*)$/m, (line, value) => {
  if (value.startsWith('"') || value.startsWith("'")) return line;
  return `PGPASSWORD=${JSON.stringify(value.trim())}`;
});
if (!/^SETUP_TOKEN=.+$/m.test(text)) {
  text += `\n# One-time first administrator setup.\nSETUP_TOKEN=${randomBytes(32).toString('hex')}\n`;
}
await writeFile(path, text, { mode: 0o600 });
console.log('Local setup token configured. Secrets were not printed.');
