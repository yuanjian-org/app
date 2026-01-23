import { defineConfig } from 'cypress';

/**
 * Example: https://github.com/cypress-io/cypress-realworld-app/blob/develop/cypress.config.js
 */
export default defineConfig({
  env: {
    SECURE_LOGIN_SESSION_COOKIE: "[Add your prod login session cookie]",
    // LOGIN_SESSION_COOKIE: [Add your local login session cookie],
  },

  e2e: {
    baseUrl: 'https://mentors.org.cn',
    // baseUrl: 'http://localhost:3000',
    defaultCommandTimeout: 10000,
    specPattern: "cypress/e2e/**/*.test.{ts,tsx}",
  },
});
