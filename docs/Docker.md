## Getting Started Using Docker

1. Install [Docker](https://www.docker.com/).
1. [TODO] Postgresql instructions TBD. Currently you must use Neon for database
if using Docker.
1. Create file `.env.local` in the repository root, and:
    - If you are an active Yuanjian volunteer, copy content from
    [this Notion page](https://www.notion.so/yuanjian/env-local-fde6a9fbc7854a5da2a08425b6562724).
    - Otherwise, copy content from [`.env.template`](.env.template) and
      configure required fields.
1. Run `yarn docker-dev` to run locally. Alternatively, `yarn docker-build` to
    only build docker images.
    - [Optional] Run `docker exec -it yuanjian-app-dev sh` to start a new shell
    session in the container, then run `yarn sync-database` and/or
    `yarn gen-test-data` if needed. `Ctrl + d` to exit.
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
1. Visit [`localhost:3000`](http://localhost:3000) from broswer. Sign up with 
your personal email address.
