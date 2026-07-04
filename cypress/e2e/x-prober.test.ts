export {};

describe("X site health check", () => {
  beforeEach(() => {
    cy.session(["prober@prob.er", "probingwin"], () => {
      cy.visit("/auth/login");
      cy.origin("https://yuantuapp.com", () => {
        cy.contains("邮箱").click();
        cy.contains("密码").click();
        cy.get('input[name="email"]').type(
          Cypress.env("PROBER_EMAIL") || "prober@prob.er",
        );
        cy.get('input[name="password"]').type(
          Cypress.env("PROBER_PASSWORD") || "probingwin",
        );
        cy.contains("button", "登录").click();
      });
      // Wait for the dashboard to confirm login succeeded.
      cy.contains("挑战问题", { timeout: 15000 }).should("be.visible");
    });
  });

  it("can see 挑战问题 menu and load project listing", () => {
    cy.visit("/");

    // Check for "挑战问题" menu item and click it
    cy.contains("挑战问题", { timeout: 15000 }).should("be.visible").click();

    // Wait for the projects to load, verify projects view exists
    cy.url().should("include", "/projects");
    cy.contains("挑战问题", { timeout: 15000 }).should("be.visible");
  });
});
