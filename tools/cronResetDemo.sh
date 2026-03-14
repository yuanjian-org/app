#!/bin/sh

# This script is intended to be run daily via crond inside the Docker container.
# It calls the tRPC endpoint to reset the demo database.

if [ "$IS_DEMO" != "true" ]; then
  echo "Not in demo mode, skipping database reset."
  exit 0
fi

echo "Starting daily demo database reset..."

# The endpoint is called via localhost because it runs in the same container.
# We use the INTEGRATION_AUTH_TOKEN for authentication.
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $INTEGRATION_AUTH_TOKEN" \
  -d '{"json":null}' \
  http://localhost:3000/api/v1/migration.resetDemoDatabase)

echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"result":'; then
  echo "Demo database reset successful."
else
  echo "Demo database reset failed."
  exit 1
fi
