import { defineConfig } from 'cypress'

/**
 * Example: https://github.com/cypress-io/cypress-realworld-app/blob/develop/cypress.config.js
 */
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    defaultCommandTimeout: 10000,
    specPattern: "cypress/e2e/**/*.test.{ts,tsx}",
  },
});
