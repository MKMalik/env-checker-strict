// Auto-generated by env-checker-strict
// ⚠️ Do not modify manually


/**
 * Always throw error if sensitive environment variable
 * not found, to detect issues immediately after boot.
 * Make sure to update this list if new env vars are added.
 */


/**
 * List of required environment variables.
 * Used for strict validation and reference.
 */
const ENV_LIST = [
  'TZ',
  'SECRET',
  'APP_VERSION',
  'LOCATION',
  'VERSION'
];

/**
 * Access all environment variables with autocomplete and type safety support.
 * @typedef {Object} ENVS
 * @property {string} TZ
 * @property {string} SECRET
 * @property {string} APP_VERSION
 * @property {string} LOCATION
 * @property {string} VERSION
 */

/** @type {ENVS} */
const ENVS = {
  TZ: process.env.TZ,
  SECRET: process.env.SECRET,
  APP_VERSION: process.env.APP_VERSION,
  LOCATION: process.env.LOCATION,
  VERSION: process.env.VERSION
};

/**
 * Throws an error if any required environment variable is missing.
 */
const checkEnvAndThrowError = () => {
  for (const env of ENV_LIST) {
    if (!process.env[env]) {
      const message =
        `[ENV ERROR] Missing required environment variable: ${env}\n` +
        `➡️  Make sure '${env}' is defined in your .env file.\n` +
        `📄 Location: ${__filename}`;

      console.error(message);
      throw new Error(message);
    }
  }
};

module.exports = { checkEnvAndThrowError, ENVS };
