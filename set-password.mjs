#!/usr/bin/env node
/*
 * set-password.mjs — change the password on the Le Manuia holding page.
 *
 *   node set-password.mjs            ask for a new password, print the three
 *                                    lines to paste into index.html
 *   node set-password.mjs --write    the same, but edit index.html for you
 *   node set-password.mjs --check    ask for a password and say whether it is
 *                                    the one index.html currently expects
 *
 * No installing anything. Node on its own is enough — it needs nothing from
 * npm, and there is no package.json in this repository on purpose.
 *
 * The password is never written to any file. What goes into index.html is a
 * random salt and a PBKDF2-SHA256 hash, from which the password cannot be
 * recovered in any practical amount of time. Keep the password itself
 * somewhere sensible; there is no way to read it back out of the repository.
 *
 * A reminder, because it belongs next to this code: the page this feeds is a
 * curtain, not a lock. See README.md.
 */

import { pbkdf2, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/* These must match the values the page uses. If you change ITERATIONS here,
   change it in index.html too — the two have to agree or nothing will unlock. */
const ITERATIONS = 250000;
const KEY_BYTES = 32;
const SALT_BYTES = 16;

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGE = join(HERE, 'index.html');

/* ---------- deriving ---------- */

function derive(password, saltHex) {
  return new Promise((resolve, reject) => {
    /* NFKC is the normalisation the page applies before it checks, so it has
       to be applied here as well or the two will disagree over any password
       that can be typed more than one way. */
    const bytes = Buffer.from(password.normalize('NFKC'), 'utf8');
    const salt = Buffer.from(saltHex, 'hex');
    pbkdf2(bytes, salt, ITERATIONS, KEY_BYTES, 'sha256', (err, key) => {
      if (err) reject(err);
      else resolve(key.toString('hex'));
    });
  });
}

/* ---------- reading a password from the terminal ---------- */

const CR = String.fromCharCode(13);
const LF = String.fromCharCode(10);
const ETX = String.fromCharCode(3);    /* ctrl-C  */
const EOT = String.fromCharCode(4);    /* ctrl-D  */
const DEL = String.fromCharCode(127);
const BS = String.fromCharCode(8);

let pipedLines = null;

async function readPiped() {
  if (pipedLines !== null) return pipedLines;
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  pipedLines = Buffer.concat(chunks).toString('utf8').split(/\r?\n/);
  return pipedLines;
}

async function ask(prompt) {
  /* Not a terminal (a pipe, a CI job, an editor's run button): take the next
     line off stdin and do not try to be clever about echo. */
  if (!process.stdin.isTTY) {
    const lines = await readPiped();
    const line = lines.shift();
    if (line === undefined) {
      console.error('\nRan out of input. Expected a password on stdin.');
      process.exit(1);
    }
    return line;
  }

  /* A terminal: read it character by character so nothing is echoed. */
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    let buf = '';
    const done = (value) => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener('data', onData);
      process.stdout.write(LF);
      resolve(value);
    };
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === CR || ch === LF || ch === EOT) return done(buf);
        if (ch === ETX) {
          process.stdin.setRawMode(false);
          process.stdout.write(LF + 'Cancelled.' + LF);
          process.exit(130);
        }
        if (ch === DEL || ch === BS) buf = buf.slice(0, -1);
        else if (ch >= ' ') buf += ch;
      }
    };
    process.stdin.on('data', onData);
  });
}

/* ---------- reading and writing index.html ---------- */

/* Deliberately no regular expressions: find the variable, then swap what is
   between the next pair of single quotes. It is easier to be sure this is
   doing what it says. */
function valueOf(src, name) {
  const at = src.indexOf('var ' + name);
  if (at < 0) throw new Error('Could not find ' + name + ' in index.html.');
  const q1 = src.indexOf("'", at);
  const q2 = src.indexOf("'", q1 + 1);
  if (q1 < 0 || q2 < 0) throw new Error('Could not read ' + name + ' from index.html.');
  return src.slice(q1 + 1, q2);
}

function replaceValue(src, name, value) {
  const at = src.indexOf('var ' + name);
  if (at < 0) throw new Error('Could not find ' + name + ' in index.html.');
  const q1 = src.indexOf("'", at);
  const q2 = src.indexOf("'", q1 + 1);
  return src.slice(0, q1 + 1) + value + src.slice(q2);
}

/* ---------- the three jobs ---------- */

async function newPassword(alsoWrite) {
  const first = await ask('New password:        ');
  if (!first) {
    console.error('Nothing typed. Stopping without changing anything.');
    process.exit(1);
  }
  const again = await ask('Type it again:       ');
  if (first !== again) {
    console.error('\nThose two do not match. Nothing was changed. Run it again.');
    process.exit(1);
  }
  if (first.normalize('NFKC') !== first) {
    console.log('\nNote: that password was normalised (NFKC) before hashing, which is what');
    console.log('the page does too. It will still work.');
  }

  const saltHex = randomBytes(SALT_BYTES).toString('hex');
  const keyHex = await derive(first, saltHex);

  console.log('');
  console.log('Paste these two lines into index.html, over the two that are there now.');
  console.log('They are in the <script> block near the bottom, under "fixed values".');
  console.log('');
  console.log("  var SALT_HEX     = '" + saltHex + "';");
  console.log("  var EXPECTED_HEX = '" + keyHex + "';");
  console.log('');

  if (alsoWrite) {
    let src = await readFile(PAGE, 'utf8');
    src = replaceValue(src, 'SALT_HEX', saltHex);
    src = replaceValue(src, 'EXPECTED_HEX', keyHex);
    await writeFile(PAGE, src);
    console.log('index.html has been updated for you. Commit it and the new password is live.');
  } else {
    console.log('Nothing has been changed on disk. Run it with --write to edit index.html.');
  }
  console.log('The password itself is not stored anywhere. Write it down somewhere safe.');
}

async function checkPassword() {
  const src = await readFile(PAGE, 'utf8');
  const saltHex = valueOf(src, 'SALT_HEX');
  const expected = valueOf(src, 'EXPECTED_HEX');
  const typed = await ask('Password to test:    ');
  const got = await derive(typed, saltHex);
  const ok = got.length === expected.length &&
    timingSafeEqual(Buffer.from(got, 'hex'), Buffer.from(expected, 'hex'));
  if (ok) {
    console.log('\nThat is the password index.html expects.');
  } else {
    console.log('\nThat is NOT the password index.html expects.');
    process.exitCode = 1;
  }
}

/* ---------- go ---------- */

const args = process.argv.slice(2);
const usage = args.includes('--help') || args.includes('-h');

if (usage) {
  console.log('node set-password.mjs           print new salt and hash lines');
  console.log('node set-password.mjs --write   also edit index.html');
  console.log('node set-password.mjs --check   test a password against index.html');
} else if (args.includes('--check')) {
  await checkPassword();
} else {
  await newPassword(args.includes('--write'));
}
