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

Continuous deployment is done by Github Actions. See `.github/workflows/deploy.yml`.

## 1. Configure GitHub Actions

Configure the following environment variables and secrets in GitHub Actions (Settings > Secrets and Variables > Actions) to enable CI/CD and automated cron tasks. All the variables are required:

- **`DOCKER_REPO_URL`**: URL of the Docker registry to push images to.
- **`DOCKER_REPO_USERNAME`**: Username to authenticate with the Docker registry.
- **`DOCKER_REPO_PASSWORD`**: (Secret) Password/token for the Docker registry.
- **`REMOTE_APP_IMAGE_BASE_NAME`**: The Docker image base name to be pushed to the production server.
- **`LOCAL_APP_IMAGE_BASE_NAME`**: The Docker image base name to be pulled from the production server. (Often uses the repo's internal domain name if hosted within the same VPC to speed up the pull).

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
1. Create `~/app/.env` with content `APP_IMAGE_BASE_NAME=<image>`. Replace "<image>" with the value of `LOCAL_APP_IMAGE_BASE_NAME`.
1. Copy docker-compose.host<N>.yml to `~/app/docker-compose.yml`.
1. `sudo chown -R root:root ~/app`
1. `sudo chmod 600 ~/app/.env*`
1. Add Github Actions' SSH public key to `~/.ssh/authorized_keys`.

All containers use `restart: unless-stopped`, so Docker restarts them
automatically when they crash and after host reboots. The `death-logger`
container records the reason of every container death (exit code, OOM status,
and the last lines of output) in `~/app/logs/container-deaths.log`. View it with
`sudo tail -n 200 ~/app/logs/container-deaths.log` or
`sudo docker logs death-logger`.

For convenience of day-to-day admin operations (optional):

1. Add `cd ~/app` to the end of `~/.bashrc`.

## 3. Acquire, renew and monitor SSL certificates

1. `sudo apt install certbot -y`
1. `sudo mkdir ~/app/certbot`
1. Install the initial certs on the host machine by running `sudo certbot certonly -d <domain>` for each domain name. When asked about the webroot, if the nginx container is not running, select 1. Otherwise, select `2` and then `$HOME/app/certbot` as the webroot. See more at http://letsencrypt.org/ and https://certbot.eff.org/instructions.
1. Modify `/etc/cron.d/certbot` and append `--webroot -w <home>/app/certbot --deploy-hook 'docker compose --project-directory <home>/app restart'` to certbot's command line. This allows the certbot to renew the certificate without requiring to stop the running server.
1. **REMEMBER**: For Aliyun ECS machines, reboot the host after a new domain name is acquired. For some reason Docker on these machines can't recognize the new certificate files otherwise.
1. Register an account at https://redsift.com and set up SSL expiry notification emails for free.

## 4. Configure cron-job.org triggers

Because GitHub Actions' native `schedule` (cron) trigger is best-effort and
frequently delays or drops runs under platform load, high-frequency workflows
(`.github/workflows/hourly-sync-meetings.yml` and
`.github/workflows/hourly-send-task-email.yml`) are triggered externally via
GitHub's `workflow_dispatch` REST API using https://cron-job.org.

### Step 1: Generate a GitHub Fine-Grained Personal Access Token (PAT)

1. In GitHub, open **Settings** (top-right user avatar) > **Developer settings**
   > **Personal access tokens** > **Fine-grained tokens** >
   **Generate new token**.
1. Set **Token name** (e.g., `cron-job.org workflow_dispatch`).
1. Set **Resource owner** to `yuanjian-org`.
1. Set **Expiration** (e.g., 1 year) and set a reminder to rotate the token
   before it expires.
1. Under **Repository access**, select **Only select repositories** and choose
   `yuanjian-org/app`.
1. Under **Permissions** > **Repository permissions**, set **Actions** to
   **Read and write** (leave all other permissions at default).
1. Click **Generate token** and copy the generated token (`github_pat_...`).

### Step 2: Create the cron jobs on cron-job.org

1. Sign up or log in at https://cron-job.org and go to **Cronjobs** >
   **Create cronjob**.
1. Create two cronjobs (one for `hourly-sync-meetings.yml` and one for
   `hourly-send-task-email.yml`) using the following settings:
   - **Common tab**:
     - **Title**: `Sync Meetings` (Job 1) or `Send Tasks And Emails` (Job 2)
     - **URL**:
       ```
       https://api.github.com/repos/yuanjian-org/app/actions/workflows/<FILE>/dispatches
       ```
       where `<FILE>` is:
       - Job 1: `hourly-sync-meetings.yml`
       - Job 2: `hourly-send-task-email.yml`
     - **Execution schedule**: Select **Every 10 minutes** or an alternative
       schedule.
   - **Advanced tab**:
     - **Request method**: `POST`
     - **Headers**:
       - `Accept`: `application/vnd.github+json`
       - `Authorization`: `Bearer <YOUR_GITHUB_PAT>`
       - `X-GitHub-Api-Version`: `2022-11-28`
       - `Content-Type`: `application/json`
     - **Request body**:
       ```json
       {"ref":"main"}
       ```
1. Click **TEST RUN** to verify that GitHub responds with `204 No Content` and
   that a new workflow run starts in the repository's **Actions** tab, then
   click **CREATE**.
