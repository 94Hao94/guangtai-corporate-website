import { createPasswordRecord } from '../lib/access-session.mjs';

/**
 * Reads one password from standard input and emits only its salted record.
 * @returns {Promise<void>} Resolves after the record is written.
 * @throws {Error} When standard input is empty, oversized, or unreadable.
 */
async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const input = Buffer.concat(chunks).toString('utf8');
  const password = input.replace(/\r?\n$/, '');
  process.stdout.write(`${createPasswordRecord(password)}\n`);
}

await main();
