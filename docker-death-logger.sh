#!/bin/sh
#
# Watches Docker events and records why containers die. Runs inside the
# `death-logger` service defined in docker-compose.*.yml, with the host's
# Docker socket mounted. Restarting dead containers is handled separately by
# Docker itself via each service's `restart:` policy; this script only logs.
#
# For every death it appends to $LOG_FILE (and prints to stdout, so
# `docker logs death-logger` works too):
#   - timestamp, container name, exit code and a human-readable explanation
#   - an "OOM" line if the kernel OOM killer killed the container
#   - up to $TAIL_LINES lines of the container's output before it died
#
# Note: we deliberately avoid `docker inspect` for the cause of death. The
# restart policy usually restarts the container before inspect runs, which
# resets fields like State.OOMKilled. Event data is immune to that race.
#
set -u

LOG_FILE="${LOG_FILE:-/logs/container-deaths.log}"
TAIL_LINES="${TAIL_LINES:-50}"
# Remembers each container's previous death time, so that the log excerpt
# for a death doesn't repeat output from earlier crashes.
STATE_DIR=/tmp/death-logger

mkdir -p "$(dirname "$LOG_FILE")" "$STATE_DIR"

log() {
  printf '%s\n' "$*" | tee -a "$LOG_FILE"
}

# Translate a container exit code into a likely cause.
explain() {
  case "$1" in
    0) echo "clean exit" ;;
    125) echo "docker failed to run the container" ;;
    126) echo "command not executable" ;;
    127) echo "command not found" ;;
    # Node.js aborts with SIGABRT on fatal errors such as JS heap exhaustion.
    134) echo "SIGABRT: aborted, e.g. Node.js fatal error / heap OOM" ;;
    137) echo "SIGKILL: killed by OOM killer or docker kill" ;;
    139) echo "SIGSEGV: segmentation fault" ;;
    143) echo "SIGTERM: stopped, e.g. docker stop or host shutdown" ;;
    *)
      # Exit codes above 128 mean "terminated by signal (code - 128)".
      if [ "$1" -gt 128 ] 2>/dev/null; then
        echo "killed by signal $(($1 - 128))"
      else
        echo "application error"
      fi
      ;;
  esac
}

log "$(date -u +%Y-%m-%dT%H:%M:%SZ) death-logger started"

# One pipe-separated line per event: action|id|name|exitCode|timeNano
EVENT_FMT='{{.Action}}|{{.Actor.ID}}|'
EVENT_FMT="$EVENT_FMT"'{{index .Actor.Attributes "name"}}|'
EVENT_FMT="$EVENT_FMT"'{{index .Actor.Attributes "exitCode"}}|{{.TimeNano}}'

# `oom` events fire just before the matching `die` event when the kernel OOM
# killer strikes, so logging both makes memory-related deaths obvious.
docker events \
  --filter type=container \
  --filter event=die \
  --filter event=oom \
  --format "$EVENT_FMT" |
while IFS='|' read -r action id name code nano; do
  # Split nanoseconds since epoch into "<secs>.<nanos>", the timestamp
  # format accepted by `docker logs --since/--until`.
  secs="${nano%?????????}"
  event_time="$secs.${nano#"$secs"}"
  ts="$(date -u -d "@$secs" +%Y-%m-%dT%H:%M:%SZ)"

  if [ "$action" = "oom" ]; then
    log "$ts $name OOM: container ran out of memory"
    continue
  fi

  log "$ts $name DIED exit=$code ($(explain "$code"))"

  # Show output up to the moment of death, starting from the previous death
  # (if any) so that each excerpt only covers the run that just died.
  prev_file="$STATE_DIR/$id"
  if [ -f "$prev_file" ]; then
    set -- --since "$(cat "$prev_file")"
  else
    set --
  fi
  echo "$event_time" > "$prev_file"

  docker logs "$@" --until "$event_time" --tail "$TAIL_LINES" "$id" 2>&1 \
    | sed 's/^/    | /' \
    | tee -a "$LOG_FILE"
done

# `docker events` only exits if the Docker daemon goes away. Exit non-zero so
# this container's own restart policy brings it back.
log "$(date -u +%Y-%m-%dT%H:%M:%SZ) docker events stream ended"
exit 1
