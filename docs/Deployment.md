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
1. For Github-based auto build and deployment, read `.github/workflows/*.yml`
