/// <reference types="cypress" />
/// <reference types="@testing-library/cypress" />

declare namespace Cypress {
  interface Chainable {
    /**
     * Custom command to login using session cookies
     * @example cy.login()
     */
    login(): Chainable<void>;
  }
}
