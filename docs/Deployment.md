# Vercel.com deployment

The easiest way for continuous deployment is using the Github + Vercel workflow.

# Docker deployment

1. Create .env file in the project's root folder
1. Set APP_DOCKER_IMAGE=<app_image_name> in .env, for example, "mentors_app"
1. Optionally, set NGINX_DOCKER_IMAGE to use a non-default nginx image.
1. Run `docker compose build && docker compose push` to build and push
production image.

# Common steps

Use tools like Vercel or Pipedream to set up *hourly* cron jobs to POST these
URLs:

* `/api/v1/cron.updateOngoingMeetings`
* `/api/v1/cron.syncSummaries`
