describe('Navigation', () => {
  it('land on login page', () => {
    cy.visit('/')
    
    cy.url().should('include', '/login')
    cy.get('#authing-guard-container').contains('testing')
  })
})