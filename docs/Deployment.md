See Also: [Ops.md](Ops.md)

# Vercel.com deployment

The easiest deployment method is using Github + Vercel. Steps in addition to
setting up environmental variables:

* Go to Settings > Functions, set Function Max Duration to 30s. This is to accommodate slow queries due to the small DB instance.
* Use tools like Github Actions or Pipedream to set up *hourly* cron jobs. See .github/workflows/cron.yml for more details.

# Local Docker deployment

1. Create .env file in the project's root folder
1. Set APP_DOCKER_IMAGE=<app_image_name> in .env, for example, "yuantu"
1. Run `docker compose build` to build the image.
1. Generate SSL certificate, modify `docker-compose.yml` to point to the generated certificate and key files.

# Production deployment

Continuous deployment is done by Github Actions. See `.github/workflows/deploy-docker.yml`. Prior to the first run of this Action, do the folloing on the server(s) that will be deployed to:

1. `sudo apt install docker`
1. `mkdir ~/app && echo APP_DOCKER_IMAGE=<image_name> > ~/app/.env`
1. Create and populate per-white-label env`~/app/.env.*` according to the
instructions in .env.template, 
1. Copy docker-compose.host<N>.yml to `~/app/docker-compose.yml`.
1. `sudo chown -R root:root ~/app`
1. `sudo chmod 600 .env*`

## SSL certification setup, renewal, and monitoring

1. `sudo apt install certbot -y`
1. `sudo mkdir ~/app/certbot`
1. Install the initial certs on the host machine by running `certbot certonly -d <domain>` for each domain name. When asked about the webroot, if the nginx container is not running, select 1. Otherwise, select `2` and then `$HOME/app/certbot` as the webroot. See more at http://letsencrypt.org/ and https://certbot.eff.org/instructions.
1. Modify `/etc/cron.d/certbot` and append `--webroot -w $HOME/app/certbot --deploy-hook 'docker compose --project-directory $HOME/app restart'` to certbot's command line. Replace `$HOME` with the actual home directory path. This allows the certbot to renew the certificate without requiring to stop the running server.
1. Register an account at https://redsift.com and set up SSL expiry notification emails for free.

## GitHub Actions Configuration

This document explains the necessary environment variables and secrets you need to configure in GitHub Actions (Settings > Secrets and Variables > Actions) to enable CI/CD and automated cron tasks.

### Deployment Matrix Configuration

- **`DEPLOYMENT_MATRIX`**: A required GitHub Action variable that defines the dynamic matrix of deployment hosts.
  Example format:
  ```json
  {"include":[{"host_id":"host0","hostname":"server1.example.com","env_files":".env .env.ustc .env.demo"},{"host_id":"host1","hostname":"server2.example.com","env_files":".env.x"}]}
  ```

### Docker Configuration

- **`DOCKER_REPO_URL`**: URL of the Docker registry to push images to.
- **`DOCKER_REPO_USERNAME`**: Username to authenticate with the Docker registry.
- **`DOCKER_REPO_PASSWORD`**: (Secret) Password/token for the Docker registry.
- **`REMOTE_APP_DOCKER_IMAGE`**: The Docker image name/tag to be pushed to the production server.
- **`LOCAL_APP_DOCKER_IMAGE`**: The Docker image name to be pulled from the production server. (Often uses the repo's internal domain name if hosted within the same VPC to speed up the pull).

### SSH Configuration

- **`SSH_USERNAME`**: The username to SSH into the servers during deployment.
- **`SERVER_SSH_PRIVATE_KEY`**: (Secret) The private key to authenticate the SSH connection into the servers for deploying and backing up databases.

### Cron Tasks Configuration

- **`INTEGRATION_MATRIX`**: (Secret) A JSON map providing integration auth tokens for each hostname.
  Example format:
  ```json
  {"yuantuapp.com": "xxx", "demo.yuantuapp.com": "yyy"}
  ```

Finally, push to the `main` branch to trigger the Deploy Docker action automatically.
