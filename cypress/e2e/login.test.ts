describe("Homepage test", () => {
	beforeEach(() => {
		// TODO: Add database seeding for e2e test user instead of using local profiles.
		cy.login();
		// Visit a route in order to allow cypress to actually set the cookie
		cy.visit("/");
	})

	it("can render home page", () => {
		cy.findAllByText("我的会议").should("be.visible");
	})

	it("can join meeting", () => {
		cy.get('div[id="__next"]').each(($ele) => {
			cy.wrap($ele).find('.chakra-button').contains("加入").click({force: true});
			cy.origin('https://meeting.tencent.com/', () => {
				// Add more cross-origin tests.
			  });
		})
	})

	it("can expand meeting details", () => {
		cy.get('div[id="__next"]').each(($ele) => {
			cy.wrap($ele).get(".chakra-linkbox").click();
		})
	})

	// it("nav button presents", () => {
		// cy.get(".chakra-button[aria-label='open menu']").click();
		// cy.get(".chakra-portal").should("be.visible");
		// cy.get(".button[aria-label='Close']").click();
		// cy.get(".chakra-portal").should("be.invisible");
	// })

	// it("can direct to coachees", () => {
	// 	cy.visit("/coachees");
	// 	cy.findAllByText("资深导师职责").should("be.visible");
	// });
});
