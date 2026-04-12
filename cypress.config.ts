import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'https://demo.yuantuapp.com',
    defaultCommandTimeout: 15000,
    specPattern: "cypress/e2e/**/*.test.{ts,tsx}",
  },
});
