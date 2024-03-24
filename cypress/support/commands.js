import '@testing-library/cypress/add-commands'
// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

Cypress.Commands.add("login", () => {
    cy.session('auth', () => {
        cy.intercept("/api/auth/session", { fixture: "session.json" }).as("session");

        // Set the cookie for cypress.
        // It has to be a valid cookie so next-auth can decrypt it and confirm its validity.
        // It needs to be freshed periodically.
        cy.setCookie("next-auth.session-token", Cypress.env('TEST_SESSION_COOKIE'));
    })
});