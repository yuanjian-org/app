describe("Navigation Test", () => {
	beforeEach(() => {
		// TODO: Add database seeding for e2e test user instead of using local profiles.
		cy.login();
		// Visit a route in order to allow cypress to actually set the cookie
		cy.visit("/");
	})

	it("can direct to coachees", () => {
		cy.visit("/coachees");
		cy.findAllByText("资深导师职责").should("be.visible");
	});
});