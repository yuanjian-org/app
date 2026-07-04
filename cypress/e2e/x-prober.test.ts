export {};

describe("X site health check", () => {
  beforeEach(() => {
    cy.session(["prober@prob.er", "probingwin"], () => {
      cy.visit("/auth/login");
      cy.origin("https://yuantuapp.com", () => {
        cy.get('button[role="tab"]').eq(2).click(); // Email/Password tab
        cy.contains('[role="tab"]', "密码").click(); // sub-tab
        cy.get('input[name="email"]').type("prober@prob.er");
        cy.get('input[name="password"]').type("probingwin");
        cy.contains("button", "登录").click();
      });
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
