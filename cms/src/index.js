'use strict';

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  /**
   * Leaves Strapi's public role without content permissions.
   *
   * Human editors authenticate through the Admin panel. Astro will use a
   * separately created, read-only API token after the public-site repository
   * is introduced, so this bootstrap intentionally does not seed grants.
   *
   * @returns {void}
   */
  bootstrap() {},
};
