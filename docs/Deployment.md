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

1. Continuous deployment is done by Github Actions. See `.github/workflows/deploy-docker.yml`.
1. Create ~/app/.env on the host machine before running this Github Action.

## SSL certification setup, renewal, and monitoring

1. Install the initial cert on the host machine by following certbot instructions at https://certbot.eff.org/instructions?ws=nginx&os=pip.
1. Modify `/etc/cron.d/certbot` and append `--webroot -w $ROOT/certbot docker compose --project-directory $REPO restart` to certbot's command line. Replace `$ROOT` with the root folder of the deployment, for example, `/alice/app`. This allows the certbot to renew the certificate without requiring to stop the running server.
1. Create an empty folder `$ROOT/certbot`.
1. Register an account at https://redsift.com and set up SSL expiry notification emails for free.

## Redirect yuanjian.org

1. To wildcard redirect yuanjian.org to yjjxj.cn, point yuanjian.org & www.yuanjian.org to a vercel.com deployment. See details in _app.ts.
