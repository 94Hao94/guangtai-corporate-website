/**
 * Validates a required text value before Strapi persists a site page.
 * @param {unknown} value Candidate field value.
 * @param {string} field Human-readable field name for error reporting.
 * @returns {void}
 * @throws {Error} When the value is absent or contains only whitespace.
 */
function assertText(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} must not be empty`);
  }
}

/**
 * Validates alternative text when a media payload includes its metadata.
 * @param {unknown} media Media relation or metadata object supplied by Strapi.
 * @param {string} field Human-readable media field name.
 * @returns {void}
 * @throws {Error} When supplied media metadata omits alternative text.
 */
function assertMediaAlternativeText(media, field) {
  if (media && typeof media === 'object' && 'alternativeText' in media) {
    assertText(media.alternativeText, `${field}.alternativeText`);
  }
}

/**
 * Applies page-level validation shared by create and update lifecycle events.
 * @param {{ slug?: unknown, parentPath?: unknown, hero?: unknown, images?: unknown, ogImage?: unknown }} data Page data being persisted.
 * @returns {void}
 * @throws {Error} When route or supplied media metadata violates the content contract.
 */
function validatePage(data) {
  assertText(data.slug, 'slug');
  const path = `/${data.slug.trim().replace(/^\//, '')}`;

  if (typeof data.parentPath === 'string' && data.parentPath.trim() === path) {
    throw new Error('parentPath cannot reference the page itself');
  }

  assertMediaAlternativeText(data.hero, 'hero');
  assertMediaAlternativeText(data.ogImage, 'ogImage');
  if (Array.isArray(data.images)) {
    data.images.forEach((image) => assertMediaAlternativeText(image, 'images'));
  }
}

module.exports = {
  beforeCreate(event) {
    validatePage(event.params.data);
  },
  beforeUpdate(event) {
    validatePage(event.params.data);
  },
};
