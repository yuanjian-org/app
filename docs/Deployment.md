# Vercel.com deployment

The easiest deployment method is using Github + Vercel.

# Docker deployment

1. Create .env file in the project's root folder
1. Set APP_DOCKER_IMAGE=<app_image_name> in .env, for example, "mentors_app"
1. Run `docker compose build` to build the image.
1. For automatic build and deployment, read `.github/workflows/docker.yml`

# Setup common to all deployments

Use tools like Vercel, Github or Pipedream to set up *hourly* cron jobs to POST
these URLs:

* `/api/v1/cron.updateOngoingMeetings`
* `/api/v1/cron.syncSummaries`
