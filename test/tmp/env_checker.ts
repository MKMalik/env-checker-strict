// Auto-generated by env-checker-strict
// ⚠️ Do not modify manually


/**
 * Always throw error if sensitive environment variable
 * not found, to detect issues immediately after boot.
 * Make sure to run `npx env-checker-strict` to update
 * this list if new env vars are added.
 */


/**
 * List of required environment variables.
 * Used for strict validation and reference.
 */
export const ENV_LIST: string[] = [
  
];

/**
 * Access all environment variables with autocomplete and type safety support.
 */
export interface ENVS {
  
}

export const ENVS: ENVS = {
  
};

/**
 * Throws an error if any required environment variable is missing.
 */
export const checkEnvAndThrowError = (): void => {
  for (const env of ENV_LIST) {
    if (!process.env[env]) {
      const message =
        `[ENV ERROR] Missing required environment variable: ${env}\n` +
        `➡️  Make sure '${env}' is defined in your .env file.\n` +
        `📄 Location: ${import.meta.url || 'env-checker.ts'}`;

      console.error(message);
      throw new Error(message);
    }
  }
};