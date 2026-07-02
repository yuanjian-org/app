See Also: [Ops.md](Ops.md)

# Vercel.com deployment

The easiest deployment method is using Github + Vercel. Steps in addition to
setting up environmental variables:

* Go to Settings > Functions, set Function Max Duration to 30s. This is to accommodate slow queries due to the small DB instance.
* Use tools like Github Actions or Pipedream to set up *hourly* cron jobs. See .github/workflows/cron.yml for more details.

# Local Docker deployment

1. Create .env file in the project's root folder
1. Run `APP_IMAGE_BASE_NAME=yuantu docker compose build` to build the image.
1. Generate SSL certificate, modify `docker-compose.yml` to point to the generated certificate and key files.

# Production deployment

Continuous deployment is done by Github Actions. See `.github/workflows/deploy-docker.yml`.

## 1. Configure GitHub Actions

Configure the following environment variables and secrets in GitHub Actions (Settings > Secrets and Variables > Actions) to enable CI/CD and automated cron tasks. All the variables are required:

- **`DOCKER_REPO_URL`**: URL of the Docker registry to push images to.
- **`DOCKER_REPO_USERNAME`**: Username to authenticate with the Docker registry.
- **`DOCKER_REPO_PASSWORD`**: (Secret) Password/token for the Docker registry.
- **`REMOTE_APP_IMAGE_BASE_NAME`**: The Docker image name/tag to be pushed to the production server.
- **`LOCAL_APP_IMAGE_BASE_NAME`**: The Docker image name to be pulled from the production server. (Often uses the repo's internal domain name if hosted within the same VPC to speed up the pull).

- **`SSH_USERNAME`**: The username to SSH into the servers during deployment.
- **`SERVER_SSH_PRIVATE_KEY`**: (Secret) The private key to authenticate the SSH connection into the servers for deploying and backing up databases.

- **`DEPLOYMENT_MATRIX`**: A matrix of deployment hosts.
  Example format:
  ```json
  {"include":[
    {"host_id":"host0","hostname":"server1.example.com","white_labels":"a b"},
    {"host_id":"host1","hostname":"server2.example.com","white_labels":"c"}
  ]}
  ```

- **`INTEGRATION_MATRIX`**: (Secret) A map of integration auth tokens for each hostname.
  Example format:
  ```json
  {
    "whitelabel1.example.com": "xxx", 
    "whitelabel2.example.com": "yyy"
  }
  ```

## 2. Prepare host machines

1. `sudo apt install postgresql-client-*`
1. `sudo snap install docker`
1. `mkdir ~/app`
1. Create and populate per-white-label env`~/app/.env.*` according to the
instructions in .env.template, 
1. Copy docker-compose.host<N>.yml to `~/app/docker-compose.yml`.
1. `sudo chown -R root:root ~/app`
1. `sudo chmod 600 ~/app/.env*`
1. Add Github Actions' SSH public key to `~/.ssh/authorized_keys`.

For convenience of day-to-day admin operations (optional):

1. Add `cd ~/app` to the end of `~/.bashrc`.
1. Create `~/.env` with content `APP_IMAGE_BASE_NAME=<image>`. Replace "<image>" with the value of `LOCAL_APP_IMAGE_BASE_NAME`.

## 3. Acquire, renew and monitor SSL certificates

1. `sudo apt install certbot -y`
1. `sudo mkdir ~/app/certbot`
1. Install the initial certs on the host machine by running `sudo certbot certonly -d <domain>` for each domain name. When asked about the webroot, if the nginx container is not running, select 1. Otherwise, select `2` and then `$HOME/app/certbot` as the webroot. See more at http://letsencrypt.org/ and https://certbot.eff.org/instructions.
1. Modify `/etc/cron.d/certbot` and append `--webroot -w <home>/app/certbot --deploy-hook 'APP_IMAGE_BASE_NAME=<image> docker compose --project-directory <home>/app restart'` to certbot's command line. Replace `<home>` with the home directory path and `<image>` with the value of `LOCAL_APP_IMAGE_BASE_NAME`. This allows the certbot to renew the certificate without requiring to stop the running server.
1. **REMEMBER**: For Aliyun ECS machines, reboot the host after a new domain name is acquired. For some reason Docker on these machines can't recognize the new certificate files otherwise.
1. Register an account at https://redsift.com and set up SSL expiry notification emails for free.
