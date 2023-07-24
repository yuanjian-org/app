# E2E Testing

Cypress is a complete end to end testing framework that runs in the browser. 

## Run tests
Open up an interactive launchpad. For E2E tests, select E2E Testing on the left, and start testing after selecting a browser. A launchpad will open up automatically, if not, go to http://localhost:3000/__/#/specs. Each e2e/component test is treated as a spec. Corresponding test will run after clicking the spec you are interested.
```shell
yarn cypress-open
```
Run all tests from CLI in the background instead of a launchpad. Screenshots and screencasts of certain tests will still be added to the folder as untracked files.

```shell
yarn cypress-run
```

For more usage, refer to [Cypress Commands](https://docs.cypress.io/guides/guides/command-line).

## Write new tests
You can start from reading [Writing Your First E2E Test](https://docs.cypress.io/guides/end-to-end-testing/writing-your-first-end-to-end-test) to understand basic concepts of Cypress testing.

Cypress provides sufficient [API/Command](https://docs.cypress.io/api/table-of-contents) to write tests. You can also write your own utils and add to `.../cypress/e2e/support/commands.js`.

Note new E2E tests should be added under `src/test/e2e-testing-cypress/cypress/e2e/`.
