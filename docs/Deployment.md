See Also: [Ops.md](Ops.md)

# Vercel.com deployment

The easiest deployment method is using Github + Vercel. Steps in addition to
setting up environmental variables:

* Go to Settings > Functions, set Function Max Duration to 30s. This is to
  accommodate slow queries due to the small DB instance.
* Use tools like Github Actions or Pipedream to set up *hourly* cron jobs.
  See .github/workflows/cron.yml for more details.

# Docker deployment

1. Create .env file in the project's root folder
1. Set APP_DOCKER_IMAGE=<app_image_name> in .env, for example, "mentors_app"
1. Run `docker compose build` to build the image.
1. Generate SSL certificate, modify `docker-compose.yml` to point to the
   generated certificate and key files.

# Production deployment

1. Production deployment is done by Github Actions. See `.github/workflows/deploy-docker.yml` for details.
1. Production SSL certificate is managed by [LetsEncrypt](https://letsencrypt.org/).

## Redirect yuanjian.org

1. To wildcard redirect yuanjian.org to yjjxj.cn, point yuanjian.org & www.yuanjian.org to a vercel.com deployment. See details in _app.ts.
