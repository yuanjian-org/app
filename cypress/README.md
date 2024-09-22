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

### Setup your Cypress env variables
- the Cypress suite requires an environment variable that should be stored in your `.env` and not committed to git.
  - TEST_SESSION_COOKIE=
    - to get the value for this variable, open your browser to your running app at `localhost:3000`.
    - inspect the page
    - click the "Application" tab
    - click "Cookies"
    - find the value for `next-auth.session-token`
    - copy that value and paste it in the `TEST_SESSION_COOKIE` variable in your `.env`
    - do not ever commit this value
    - this value will need to be updated whenever the cookie expires

### Setup test user
- the Cypress suite requires a user to run tests against.
 - The user may be stored at `.../cypress/fixtures/session.json`
    - to get the value for this variable, open your browser to your running app at `localhost:3000`.
    - inspect the page
    - click the "Network" tab
    - find a row named with "session"
    - click "Response" tab
    - copy that value and paste it in the `.../cypress/fixtures/session.json`
    - this value will need to be updated whenever the user attributions change

## Write new tests
You can start from reading [Writing Your First E2E Test](https://docs.cypress.io/guides/end-to-end-testing/writing-your-first-end-to-end-test) to understand basic concepts of Cypress testing.

Cypress provides sufficient [API/Command](https://docs.cypress.io/api/table-of-contents) to write tests. You can also write your own utils and add to `.../cypress/e2e/support/commands.js`.

Note new E2E tests should be added under `src/test/e2e-testing-cypress/cypress/e2e/`.
