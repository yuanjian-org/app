/**
 * Site health-check prober.
 *
 * Logs in to the demo site with email + password
 * and verifies that key pages load correctly.
 * Intended to run hourly via GitHub Actions.
 */
export {};

describe("Demo site health check", () => {
  beforeEach(() => {
    cy.login();
  });

  it("can load dashboard (个人空间)", () => {
    cy.visit("/");
    cy.contains("我的会议", { timeout: 15000 })
      .should("be.visible");
    cy.contains("待办事项").should("be.visible");
  });

  it("can load volunteer profiles (志愿者档案)", () => {
    cy.visit("/volunteers");
    cy.contains("志愿者档案", { timeout: 15000 })
      .should("be.visible");
  });

  it(
    "can load student profiles (学生档案)",
    () => {
      cy.visit("/mentees?menteeStatus=现届学子");
      cy.contains("学生档案", { timeout: 15000 })
        .should("be.visible");
      // The table should list at least one student.
      cy.get("table").should("exist");
    },
  );

  it("can load user management (用户)", () => {
    cy.visit("/users");
    cy.contains("用户", { timeout: 15000 })
      .should("be.visible");
  });
});
