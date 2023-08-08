# Yuanjian App - 远见教育平台

A Web app that supports mentorship programs at [Visionary Education Foundation (远见教育基金会)](http://yuanjian.org),
developed by VEF volunteers.

## Getting Started

1. Install `node.js` and `yarn`.
1. Install `postgresql` and start it locally. Aternatively, create a remote test db at [Neon](http://neon.tech).
1. Create file `.env.local` in the repository root, and:
   - If you are an active Yuanjian volunteer, copy content from [this Notion page](https://www.notion.so/yuanjian/env-local-fde6a9fbc7854a5da2a08425b6562724).
   - Otherwise, copy content from [`.env.template`](.env.template) and configure required fields.
1. Run `yarn` to install dependency packages.
1. Run `yarn sync-database` to initialize the database.
1. Run `yarn dev` to start local server. By default it will listen on [`localhost:3000`](http://localhost:3000).
1. Visit this local server from broswer. Log in with your personal email address.
1. Run `yarn gen-test-data` to finish setup and populate test data.
1. Finally, restart your local server to clean up cached data.
1. To run e2e tests, see [Cypress E2E Testing](./cypress/README.md).

## Getting Started Using Docker (Work In Progress)

1. Install [Docker](https://www.docker.com/).
1. [TODO] Postgresql instructions TBD. Currently you must use Neon for database if using Docker.
1. Create file `.env.local` in the repository root, and:
    - If you are an active Yuanjian volunteer, copy content from [this Notion page](https://www.notion.so/yuanjian/env-local-fde6a9fbc7854a5da2a08425b6562724).
    - Otherwise, copy content from [`.env.template`](.env.template) and configure required fields.
1. Run `yarn docker-dev`.
    - [Optional] Run `docker exec -it yuanjian-app-dev sh` to start a new shell session in the
    container, then run `yarn sync-database` and/or `yarn gen-test-data` if needed. `Ctrl + d` to
    exit.
    - Hotswap is enabled by default.
    - Quick references to some useful `docker` and `docker compose` commands:
        - `docker compose logs -tf`: Show NextJS logs in the running container.
            - `-t`: Show timestamp.
            - `-f`: Follow log output.
        - `docker ps`: Show all currently running containers.
        - `docker compose ps`: Show all currently running Docker compose apps.
        - `docker stop yuanjian-app-dev`: Stop a container.
        - `docker compose rm -sf`: Stop and remove all containers.
            - `-s`: Stop all containers if they are running.
            - `-f`: Skip removal confirmation.
        - [more](https://docs.docker.com/engine/reference/commandline/cli/).
1. Visit [`localhost:3000`](http://localhost:3000) from broswer. Log in with your personal email address.
1. To run e2e tests, see [Cypress E2E Testing](./cypress/README.md).

## Frameworks Used

- Full stack: [Next.js](https://nextjs.org/)
- Typing: `typescript`, [`trpc`](https://trpc.io/), `zod`
- UI: [Chakra UI](https://chakra-ui.com/)
- End-to-end Testing: [Cypress](https://www.cypress.io/)

## Code Structure

We follow [next.js convention](https://nextjs.org/docs/getting-started/project-structure#top-level-folders):

|  |  |
|---|---|
| `public` | Static assets. |
| `src` | Source folder. Files under `src` but outside of `src/api` may be executed either in the browser or on the server. |
| `src/api` | Files to be executed on the server only. |
| `src/pages` | `next.js` [Page Router](https://nextjs.org/docs/pages/building-your-application/routing). Migrating to App Router remains future work. |
| `src/shared` | Files shared between `src/api` and the rest of `src`. |
| `tools` | Command-line scripts. |
| `cypress/e2e` | End-to-end tests. See [`cypress/README.md`](cypress/README.md) for details. |

**IMPORTANT**: To prevent security and programming issues,

* files in `src/shared` must not refer to files outside of `src/shared`,
* files in `src/api` must not refer to files outside of `src/api` or `src/shared`, and
* files outside of `src/api` must not refer to files in `src/api`

That is, only the dependencies demonstrated below are allowed:

```mermaid
graph TD;
    src[the rest of src]-->|ok|src/shared;
    src/api-->|ok|src/shared;
```

<br>
<br>
<br>
<div class="vercel banner">
<a href="https://vercel.com/?utm_source=yuanjian&utm_campaign=oss">
  <Img src="./public/img/vercel-banner.svg" alt="Vercel Banner" />
</a>
</div>
