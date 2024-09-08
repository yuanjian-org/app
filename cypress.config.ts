import { defineConfig } from 'cypress'

/**
 * Example: https://github.com/cypress-io/cypress-realworld-app/blob/develop/cypress.config.js
 */
export default defineConfig({
  env: {
    // LOGIN_SESSION_COOKIE: "8741b1d9-bc1d-4bba-9e0b-6cb8d551978c",
    LOGIN_SECURE_COOKIE: "8741b1d9-bc1d-4bba-9e0b-6cb8d551978c",
  },

  e2e: {
    baseUrl: 'https://www.yuantuapp.com',
    // baseUrl: 'http://localhost:3000',
    defaultCommandTimeout: 10000,
    specPattern: "cypress/e2e/**/*.test.{ts,tsx}",
  },
});
