import { getEdition, getEditionTitle } from '../lib/edition.mjs';

/**
 * Refresh only the edition text; programme data stays on the server.
 * @param {Document} root
 * @param {Date} [date]
 */
export function updateEdition(root, date = new Date()) {
  const edition = getEdition(date);

  for (const element of root.querySelectorAll('[data-edition]')) {
    element.textContent = edition;
  }

  root.title = getEditionTitle(edition);
}
