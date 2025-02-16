# Renew SSL Certificate

Let's Encrypt's automatic renewal at `/etc/cron.d/certbot` requires port 80 to be open on the host which is occupied by the container. So we have to manually renew the certificate once every 3 months. TODO: Fine a better solution.

1. Stop docker containers.
2. Run `certbot -q renew --no-random-sleep-on-renew`.
3. Start docker containers.
