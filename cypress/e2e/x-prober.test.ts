export {};

describe("X site health check", () => {
  beforeEach(() => {
    const email: unknown = Cypress.env("PROBER_EMAIL");
    const password: unknown = Cypress.env("PROBER_PASSWORD");
    if (
      typeof email !== "string" ||
      !email ||
      typeof password !== "string" ||
      !password
    ) {
      throw new Error(
        "Missing CYPRESS_PROBER_EMAIL or CYPRESS_PROBER_PASSWORD.",
      );
    }

    cy.session("x-prober", () => {
      cy.visit("/auth/login");
      cy.origin(
        "https://yuantuapp.com",
        { args: { email, password } },
        ({ email: loginEmail, password: loginPassword }) => {
          cy.get('button[role="tab"]').eq(2).click(); // Email/Password tab
          cy.contains('[role="tab"]', "密码").click(); // sub-tab
          cy.get('input[name="email"]').type(loginEmail, { log: false });
          cy.get('input[name="password"]').type(loginPassword, { log: false });
          cy.contains("button", "登录").click();
        },
      );
      cy.contains("个人空间", { timeout: 15000 }).should("be.visible");
    });
  });

  it("can see '挑战问题' menu item and load project listing", () => {
    cy.visit("/");

    // verify the user can log in
    cy.contains("个人空间", { timeout: 15000 }).should("be.visible");

    // click on the menu item "挑战问题"
    cy.contains("挑战问题").click();

    // see the project listing after clicking on the menu item
    cy.contains("X-Challenge 问题", { timeout: 15000 }).should("be.visible");
  });
});
