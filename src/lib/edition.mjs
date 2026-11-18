const editionFormatter = new Intl.DateTimeFormat('ru-RU', {
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Moscow',
});

/** @param {Date} [date] */
export function getEdition(date = new Date()) {
  const parts = editionFormatter.formatToParts(date);
  const month = parts.find((part) => part.type === 'month').value;
  const year = parts.find((part) => part.type === 'year').value;

  return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${year}`;
}

/** @param {string} edition */
export function getEditionTitle(edition) {
  return `Онлайн-казино: ${edition}, 18+`;
}
