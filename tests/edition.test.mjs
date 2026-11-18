import test from 'node:test';
import assert from 'node:assert/strict';
import { getEdition, getEditionTitle } from '../src/lib/edition.mjs';
import { updateEdition } from '../src/scripts/update-edition.mjs';

test('Russian month and year, no manual date in heading', () => {
  assert.equal(getEdition(new Date('2026-11-15T12:00:00Z')), 'Ноябрь 2026');
  assert.equal(getEdition(new Date('2026-12-31T21:05:00Z')), 'Январь 2027');
  assert.equal(getEdition(new Date('2027-02-01T12:00:00Z')), 'Февраль 2027');
});

test('page title uses the same edition as the heading', () => {
  assert.equal(getEditionTitle('Январь 2027'), 'Онлайн-казино: Январь 2027, 18+');
});

test('browser updater refreshes heading and title without programme data', () => {
  const elements = [{ textContent: 'Ноябрь 2026' }, { textContent: 'Ноябрь 2026' }];
  const document = {
    title: 'Old title',
    querySelectorAll(selector) {
      assert.equal(selector, '[data-edition]');
      return elements;
    },
  };

  updateEdition(document, new Date('2026-12-31T21:05:00Z'));

  assert.ok(elements.every((element) => element.textContent === 'Январь 2027'));
  assert.equal(document.title, 'Онлайн-казино: Январь 2027, 18+');
});
