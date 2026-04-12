/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    /**
     * Log in via email + password UI flow.
     * Defaults to demo admin account.
     */
    login(
      email?: string,
      password?: string,
    ): Chainable<void>;
  }
}
