import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const assets = new URL('../../dist/_astro/', import.meta.url);
const css = readdirSync(assets)
  .filter((name) => name.endsWith('.css'))
  .map((name) => readFileSync(new URL(name, assets), 'utf8'))
  .join('\n');

test('image frame uses top corners on mobile and left corners from sm', () => {
  assert.match(
    css,
    /\.after\\:rounded-t-card::?after\{[^}]*border-top-left-radius:var\(--radius-card\);[^}]*border-top-right-radius:var\(--radius-card\)/,
  );
  assert.match(css, /\.sm\\:after\\:rounded-tr-none::?after\{[^}]*border-top-right-radius:0/);
  assert.match(
    css,
    /\.sm\\:after\\:rounded-bl-card::?after\{[^}]*border-bottom-left-radius:var\(--radius-card\)/,
  );
  assert.doesNotMatch(css, /\.program-media\[data-astro-[^\]]+\]::?after/);
});
