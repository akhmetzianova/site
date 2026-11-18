import assert from 'node:assert/strict';
import test from 'node:test';
import { stringify } from 'yaml';
import { parsePrograms } from '../src/lib/programs.mjs';

const DEFAULT_REF = 'https://example.com';

function parseEntries(entries) {
  return parsePrograms(stringify(entries));
}

test('affiliate parameters stay untouched', () => {
  const ref = 'https://example.com/?open=register&p=t52f&next=%2Fgames%3Fa%3D1';
  const [program] = parseEntries([{ name: '1win', ref }]);

  assert.equal(program.refs[0].url, ref);
  assert.equal(program.refs[0].title, 'Играть');
  assert.equal(program.name, '1win');
  assert.equal(program.refs[0].go, '/go/1win.html');
});

test('minimal entry gets neutral defaults; an empty catalogue is supported', () => {
  const [program] = parseEntries([{ name: 'Example', ref: DEFAULT_REF }]);

  assert.equal(program.logo, null);
  assert.equal(program.logoBackground, null);
  assert.equal(program.image, null);
  assert.deepEqual(program.payments, []);
  assert.deepEqual(program.categories, []);
  assert.ok(program.description);
  assert.deepEqual(parsePrograms('[]'), []);
});

test('multiple programmes support optional media, payments and categories', () => {
  const programs = parseEntries([
    {
      name: 'One',
      ref: DEFAULT_REF,
      logo: '/images/logo.svg',
      image: 'https://example.com/cover.webp',
      imageAlt: 'Обложка',
      payments: ['Visa', 'Mastercard', 'Bitcoin', 'Мир'],
      categories: ['Live-казино', 'Слоты', 'Ставки'],
    },
    { name: 'Two', ref: 'https://example.org' },
  ]);

  assert.equal(programs.length, 2);
  assert.equal(programs[0].logo, '/images/logo.svg');
  assert.equal(programs[0].imageAlt, 'Обложка');
  assert.deepEqual(programs[0].payments, ['Visa', 'Mastercard', 'Bitcoin', 'Мир']);
  assert.deepEqual(programs[0].categories, ['Live-казино', 'Слоты', 'Ставки']);
});

test('logo backgrounds accept HEX colors and reject invalid CSS', () => {
  for (const color of ['#415368', '#fff', '#ABCDEF', '', null]) {
    const [program] = parseEntries([{ name: 'One', ref: DEFAULT_REF, logoBackground: color }]);
    assert.equal(program.logoBackground, color || null);
  }
  for (const color of ['red', '#12', '#12345g', '#fff; color: red', 123, {}]) {
    assert.throws(
      () => parseEntries([{ name: 'One', ref: DEFAULT_REF, logoBackground: color }]),
      /запись 1, logoBackground/,
    );
  }
});

test('redirect slugs are generated, explicitly set or Unicode-encoded', () => {
  const programs = parseEntries([
    { name: 'Casino One!', ref: DEFAULT_REF },
    { name: 'Название', slug: 'custom-casino', ref: DEFAULT_REF },
    { name: 'Казино', ref: DEFAULT_REF },
  ]);

  assert.equal(programs[0].slug, 'casino-one');
  assert.equal(programs[0].refs[0].go, '/go/casino-one.html');
  assert.equal(programs[1].refs[0].go, '/go/custom-casino.html');
  assert.equal(programs[2].refs[0].go, `/go/${encodeURIComponent('казино')}.html`);
});

test('multiple refs preserve URLs and titles and generate distinct redirects', () => {
  const url = 'https://example.com/?click_id={click_id}&next=%2Fgames%3Fa%3D1';
  const programs = parseEntries([
    {
      name: 'One',
      refs: [
        { url, title: 'Telegram' },
        { url, title: 'Сайт' },
      ],
    },
    { name: 'One 2', slug: 'one-2', ref: DEFAULT_REF },
  ]);
  assert.deepEqual(programs[0].refs, [
    { url, title: 'Telegram', slug: 'one', go: '/go/one.html' },
    { url, title: 'Сайт', slug: 'one--2', go: '/go/one--2.html' },
  ]);
  const paths = programs.flatMap((program) => program.refs.map((ref) => ref.go));
  assert.equal(new Set(paths).size, paths.length);
  assert.equal(parseEntries([{ name: 'One', refs: [{ url, title: 'Сайт' }] }])[0].refs.length, 1);
});

test('invalid and conflicting refs are rejected', () => {
  for (const refs of [
    null,
    [],
    'https://example.com',
    [null],
    [{}],
    [{ url: DEFAULT_REF }],
    [{ url: DEFAULT_REF, title: ' ' }],
    [{ url: 'javascript:alert(1)', title: 'Сайт' }],
    [{ url: DEFAULT_REF, title: 123 }],
  ]) {
    assert.throws(() => parseEntries([{ name: 'One', refs }]), /запись 1/);
  }
  assert.throws(
    () =>
      parseEntries([
        {
          name: 'One',
          ref: DEFAULT_REF,
          refs: [{ url: DEFAULT_REF, title: 'Сайт' }],
        },
      ]),
    /только ref или refs/,
  );
});

test('unsafe, empty and incorrectly typed slugs are rejected', () => {
  for (const slug of ['../outside', 'foo/bar', '', 'two words', 'a.html', 'a--b', 123]) {
    assert.throws(() => parseEntries([{ name: 'One', slug, ref: DEFAULT_REF }]));
  }
});

test('duplicate slugs fail instead of overwriting a redirect', () => {
  assert.throws(() =>
    parseEntries([
      { name: 'One', ref: DEFAULT_REF },
      { name: 'ONE', ref: DEFAULT_REF },
    ]),
  );

  assert.throws(() =>
    parseEntries([
      { name: 'One', slug: 'shared', ref: DEFAULT_REF },
      { name: 'Two', slug: 'shared', ref: DEFAULT_REF },
    ]),
  );
});

test('invalid schema and unsafe URLs report the offending YAML entry', () => {
  const invalidEntries = [
    null,
    { name: 'One' },
    { ref: DEFAULT_REF },
    { name: ' ', ref: DEFAULT_REF },
    { name: 'One', ref: 'javascript:alert(1)' },
    { name: 'One', ref: 'https://user:password@example.com' },
    { name: 'One', ref: DEFAULT_REF, logo: '//evil.test/a' },
    { name: 'One', ref: DEFAULT_REF, image: 'data:image/svg+xml,foo' },
    { name: 'One', ref: DEFAULT_REF, payments: [1] },
    { name: 'One', ref: DEFAULT_REF, categories: [1] },
    { name: 'One', ref: DEFAULT_REF, description: 123 },
    { name: 'One', ref: DEFAULT_REF, imageAlt: false },
  ];

  for (const entry of invalidEntries) {
    assert.throws(() => parseEntries([entry]), /all\.yaml, запись 1/);
  }
});

test('payments and categories accept empty lists and reject invalid values', () => {
  for (const field of ['payments', 'categories']) {
    assert.deepEqual(parseEntries([{ name: 'One', ref: DEFAULT_REF, [field]: [] }])[0][field], []);
    for (const value of [null, 'Visa, Мир', 1, {}, [''], ['  '], [null]]) {
      assert.throws(
        () => parseEntries([{ name: 'One', ref: DEFAULT_REF, [field]: value }]),
        new RegExp(`запись 1, ${field}:`),
      );
    }
  }
});

test('malformed YAML and a non-list root are rejected', () => {
  assert.throws(() => parsePrograms('name: [unterminated'));
  assert.throws(() => parsePrograms('name: One'), /ожидается список программ/);
});
