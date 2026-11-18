import { parse } from 'yaml';

const DEFAULT_DESCRIPTION = 'Информация об играх и условиях доступна на сайте партнёра.';
const SLUG_PATTERN = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** @param {unknown} value @param {string} label */
function requiredText(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label}: ожидается непустая строка`);
  }

  return value.trim();
}

/** @param {unknown} value @param {string} label */
function optionalText(value, label) {
  if (value === undefined) return '';

  if (typeof value !== 'string') {
    throw new Error(`${label}: ожидается строка`);
  }

  return value;
}

/**
 * Validate without rewriting the original affiliate URL or its parameters.
 * @param {unknown} value
 * @param {string} label
 * @param {boolean} [allowLocal]
 */
function webUrl(value, label, allowLocal = false) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label}: ожидается непустая ссылка`);
  }

  if (allowLocal && /^\/(?!\/)/.test(value) && !value.includes('\\')) {
    return value;
  }

  try {
    const url = new URL(value);
    const validProtocol = url.protocol === 'https:' || url.protocol === 'http:';

    if (validProtocol && !url.username && !url.password) return value;
  } catch {
    // Invalid URLs are reported below with the YAML entry and field name.
  }

  const allowed = allowLocal ? 'http(s) или путь /images/…' : 'http(s)';
  throw new Error(`${label}: используйте ${allowed}`);
}

/** @param {unknown} value @param {string} label */
function optionalMedia(value, label) {
  if (value === undefined || value === null || value === '') return null;
  return webUrl(value, label, true);
}

/** @param {unknown} value @param {string} label */
function optionalColor(value, label) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value)) {
    throw new Error(`${label}: ожидается HEX-цвет, например #415368`);
  }
  return value;
}

/** @param {Record<string, unknown>} entry @param {string} name @param {string} label */
function programSlug(entry, name, label) {
  const generated = name
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '');

  if (entry.slug !== undefined && typeof entry.slug !== 'string') {
    throw new Error(`${label}: slug должен быть строкой`);
  }

  const slug = (entry.slug ?? generated).normalize('NFC');

  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(`${label}: slug должен содержать буквы, цифры и одиночные дефисы`);
  }

  return slug;
}

/** @param {unknown} value @param {string} label @returns {string[]} */
function textList(value, label) {
  if (value === undefined) return [];

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item.trim())) {
    throw new Error(`${label}: ожидается список непустых строк`);
  }

  return value;
}

/** @param {Record<string, unknown>} entry @param {string} slug @param {string} label */
function programRefs(entry, slug, label) {
  if (entry.ref !== undefined && entry.refs !== undefined) {
    throw new Error(`${label}: укажите только ref или refs`);
  }

  const refs = entry.refs === undefined ? [{ url: entry.ref, title: 'Играть' }] : entry.refs;
  if (!Array.isArray(refs) || refs.length === 0) {
    throw new Error(`${label}, refs: ожидается непустой список ссылок`);
  }

  return refs.map((ref, index) => {
    const field = `${label}, refs[${index}]`;
    if (!isRecord(ref)) throw new Error(`${field}: ожидается объект`);
    // Double hyphens cannot occur in a casino slug, so extra links cannot collide with it.
    const linkSlug = index === 0 ? slug : `${slug}--${index + 1}`;
    return {
      url: webUrl(ref.url, `${field}, url`),
      title: requiredText(ref.title, `${field}, title`),
      slug: linkSlug,
      go: `/go/${encodeURIComponent(linkSlug)}.html`,
    };
  });
}

/**
 * Pure parser shared by build-time pages and Node tests.
 * @param {string} source
 * @returns {import('../types/program').Program[]}
 */
export function parsePrograms(source) {
  const entries = parse(source);

  if (!Array.isArray(entries)) {
    throw new Error('data/all.yaml: ожидается список программ');
  }

  const slugs = new Set();

  return entries.map((entry, index) => {
    const label = `data/all.yaml, запись ${index + 1}`;

    if (!isRecord(entry)) {
      throw new Error(`${label}: ожидается объект`);
    }

    const name = requiredText(entry.name, `${label}, name`);
    const slug = programSlug(entry, name, label);

    if (slugs.has(slug)) {
      throw new Error(`${label}: повторяющийся slug «${slug}»`);
    }

    slugs.add(slug);

    return {
      name,
      slug,
      refs: programRefs(entry, slug, label),
      description:
        optionalText(entry.description, `${label}, description`).trim() || DEFAULT_DESCRIPTION,
      logo: optionalMedia(entry.logo, `${label}, logo`),
      logoBackground: optionalColor(entry.logoBackground, `${label}, logoBackground`),
      image: optionalMedia(entry.image, `${label}, image`),
      imageAlt: optionalText(entry.imageAlt, `${label}, imageAlt`),
      payments: textList(entry.payments, `${label}, payments`),
      categories: textList(entry.categories, `${label}, categories`),
    };
  });
}
