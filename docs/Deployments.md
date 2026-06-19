# Deployment Configuration

This document explains the necessary environment variables and secrets you need to configure in GitHub Actions (Settings > Secrets and Variables > Actions) to enable CI/CD and automated cron tasks.

## Deployment Matrix Configuration

- **`DEPLOYMENT_MATRIX`**: A required GitHub Action variable that defines the dynamic matrix of deployment hosts.
  Example format:
  ```json
  {"include":[{"host_id":"host0","hostname":"server1.example.com","env_files":".env .env.ustc .env.demo"},{"host_id":"host1","hostname":"server2.example.com","env_files":".env.x"}]}
  ```

## Docker Configuration

- **`DOCKER_REPO_URL`**: URL of the Docker registry to push images to.
- **`DOCKER_REPO_USERNAME`**: Username to authenticate with the Docker registry.
- **`DOCKER_REPO_PASSWORD`**: (Secret) Password/token for the Docker registry.
- **`REMOTE_APP_DOCKER_IMAGE`**: The Docker image name/tag to be pushed to the production server.
- **`LOCAL_APP_DOCKER_IMAGE`**: The Docker image name to be pulled from the production server. (Often uses the repo's internal domain name if hosted within the same VPC to speed up the pull).

## SSH Configuration

- **`SSH_USERNAME`**: The username to SSH into the servers during deployment.
- **`SERVER_SSH_PRIVATE_KEY`**: (Secret) The private key to authenticate the SSH connection into the servers for deploying and backing up databases.

## Cron Tasks Configuration
- **`INTEGRATION_MATRIX`**: (Secret) A JSON map providing integration auth tokens for each hostname.
  Example format:
  ```json
  {"yuantuapp.com": "xxx", "demo.yuantuapp.com": "yyy"}
  ```

Finally, push to the `main` branch to trigger the Deploy Docker action automatically.
