import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { parsePrograms } from '../../src/lib/programs.mjs';

const root = new URL('../../', import.meta.url);
const programs = parsePrograms(readFileSync(new URL('data/all.yaml', root), 'utf8'));
const refs = programs.flatMap((program) => program.refs);
const home = readFileSync(new URL('dist/index.html', root), 'utf8');
const decode = (text) =>
  text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

test('header script works with or without the review counter', () => {
  const script = /<script type="module">([\s\S]*?)<\/script>/.exec(home)?.[1];
  assert.ok(script, 'built header script exists');
  for (const counter of [null, { textContent: '' }]) {
    const document = { querySelectorAll: () => [], getElementById: () => counter, title: '' };
    let update;
    runInNewContext(script, {
      document,
      setInterval: (callback) => {
        update = callback;
      },
    });
    assert.equal(typeof update, 'function');
    assert.doesNotThrow(() => update());
    if (counter) assert.match(counter.textContent, /\d/);
  }
});

test('landing composes one heading and one card per YAML entry', () => {
  assert.equal((home.match(/<h1\b/g) || []).length, 1);
  assert.equal((home.match(/<article\b/g) || []).length, programs.length);
  assert.ok(home.includes('id="responsible-title"'));
  assert.ok(home.includes('data-edition'));
  assert.ok(!home.includes('<nav'));
});

test('single-link cards are clickable; multi-link cards have separate buttons', () => {
  const cards = [
    ...home.matchAll(
      /<(a|div)\b([^>]*\bclass="program-ranked\b[^>]*)>([\s\S]*?<\/article>)\s*<\/\1>/g,
    ),
  ];
  assert.equal(cards.length, programs.length);
  cards.forEach(([, tag, attributes, content], index) => {
    const program = programs[index];
    if (program.refs.length === 1) {
      assert.equal(tag, 'a');
      assert.ok(attributes.includes(`href="${program.refs[0].go}"`));
      assert.ok(attributes.includes('target="_blank"'));
      assert.ok(attributes.includes('rel="nofollow"'));
      assert.match(content, /<span\b[^>]*class="button\b/);
      assert.doesNotMatch(content, /<a\b/);
    } else {
      assert.equal(tag, 'div');
      assert.ok(!attributes.includes('href='));
      const buttons = [...content.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
      assert.equal(buttons.length, program.refs.length);
      buttons.forEach(([, attrs, text], i) => {
        assert.ok(attrs.includes(`href="${program.refs[i].go}"`));
        assert.ok(attrs.includes('target="_blank"'));
        assert.ok(attrs.includes('rel="nofollow"'));
        assert.equal(decode(text.trim()), program.refs[i].title);
        assert.doesNotMatch(text, /<a\b/);
      });
    }
  });
});

test('landing links to generated go files and does not disclose referral destinations', () => {
  const scripts = readdirSync(new URL('dist/_astro/', root))
    .filter((name) => name.endsWith('.js'))
    .map((name) => readFileSync(new URL(`dist/_astro/${name}`, root), 'utf8'))
    .join('\n');
  for (const ref of refs) {
    assert.ok(home.includes(`href="${ref.go}"`));
    assert.ok(!home.includes(new URL(ref.url).host));
    assert.ok(!scripts.includes(new URL(ref.url).host));
  }
});

test('every go file has an immediate HTML redirect with intact affiliate parameters', () => {
  for (const ref of refs) {
    const html = readFileSync(new URL(`dist/go/${ref.slug}.html`, root), 'utf8');
    const target = /http-equiv="refresh" content="([^"]*)"/.exec(html)?.[1];
    assert.equal(decode(target || ''), `0;url=${ref.url}`);
    assert.ok(html.includes('content="noindex, nofollow"'));
    assert.ok(html.includes('продолжите вручную'));
    assert.ok(!html.includes('<script'));
  }
});
