// Make this file a module
export {};

describe("Homepage test", () => {
	beforeEach(() => {
		// TODO: Add database seeding for e2e test user instead of using local profiles.
		cy.login();
		// Visit a route in order to allow cypress to actually set the cookie
		cy.visit("/");
	});

	it("can render home page", () => {
		cy.findByText("我的桌面").should("be.visible");
	});

	it("can join meeting", () => {
		cy.get('div[id="__next"]').each(($ele) => {
			cy.wrap($ele).find('.chakra-button').contains("加入").click({ force: true });
			cy.origin('https://meeting.tencent.com/', () => {
				// Add more cross-origin tests.
			  });
		});
	});

	it("can expand meeting details", () => {
		cy.get('div[id="__next"]').each(($ele) => {
			cy.wrap($ele).get(".chakra-linkbox").click();
		});
	});
});
