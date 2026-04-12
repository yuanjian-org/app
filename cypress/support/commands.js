/**
 * Log in via the email + password form on demo sites.
 * Wraps the login flow in cy.session() so the session
 * is cached across tests within a spec file.
 */
Cypress.Commands.add(
  "login",
  (email = "admin@de.mo", password = "yuanjian") => {
    cy.session([email, password], () => {
      cy.visit("/auth/login");
      cy.contains("密码").click();
      cy.get('input[name="email"]').type(email);
      cy.get('input[name="password"]').type(password);
      cy.contains("button", "登录").click();
      // Wait for the dashboard to confirm login succeeded.
      cy.contains("个人空间", { timeout: 15000 })
        .should("be.visible");
    });
  },
);
