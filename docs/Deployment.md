See Also: [Ops.md](Ops.md)

# Vercel.com deployment

The easiest deployment method is using Github + Vercel. Steps in addition to
setting up environmental variables:

* Go to Settings > Functions, set Function Max Duration to 30s. This is to
  accommodate slow queries due to the small DB instance.
* Use tools like Github Actions or Pipedream to set up *hourly* cron jobs.
  See .github/workflows/cron.yml for more details.

# Local Docker deployment

1. Create .env file in the project's root folder
1. Set APP_DOCKER_IMAGE=<app_image_name> in .env, for example, "yuantu"
1. Run `docker compose build` to build the image.
1. Generate SSL certificate, modify `docker-compose.yml` to point to the
   generated certificate and key files.

# Production deployment

1. Continuous deployment is done by Github Actions. See `.github/workflows/deploy-docker.yml`. Prior to the first run of this Action, do the folloing:
1. Create and populate `$APP_ROOT/.env`, where `$APP_ROOT` is the root folder of the deployment, for example, `/alice/app`.
1. Copy docker-compose.yml to `$APP_ROOT/docker-compose.yml`.

## SSL certification setup, renewal, and monitoring

1. Create an empty folder `$APP_ROOT/certbot`.
1. Install the initial certs on the host machine by running `certbot certonly` for each domain name. When asked about the webroot, See more at http://letsencrypt.org/ and https://certbot.eff.org/instructions.
1. Modify `/etc/cron.d/certbot` and append `--webroot -w $APP_ROOT/certbot docker compose --project-directory $APP_ROOT restart` to certbot's command line. Replace `$APP_ROOT` with actual folder path. This allows the certbot to renew the certificate without requiring to stop the running server.
1. Register an account at https://redsift.com and set up SSL expiry notification emails for free.
