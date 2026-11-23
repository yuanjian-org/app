#!/bin/sh
#
# Watches Docker events and records why containers die. Runs on the host via
# the `docker-death-logger` systemd service (configured by deploy.yml).
# Restarting dead containers is handled separately by Docker itself via each
# service's `restart:` policy; this script only logs.
#
# For every death it appends to $LOG_FILE (and prints to stdout, so
# `sudo journalctl -u docker-death-logger` works too), keeping $LOG_FILE under
# $MAX_LOG_SIZE bytes (1 MB by default):
#   - timestamp, container name, exit code and a human-readable explanation
#   - an "OOM" line if the kernel OOM killer killed the container
#   - up to $TAIL_LINES lines of the container's output before it died
#
# Note: we deliberately avoid `docker inspect` for the cause of death. The
# restart policy usually restarts the container before inspect runs, which
# resets fields like State.OOMKilled. Event data is immune to that race.
#
set -u
umask 077

LOG_FILE="${LOG_FILE:-./logs/container-deaths.log}"
MAX_LOG_SIZE="${MAX_LOG_SIZE:-1048576}"
TAIL_LINES="${TAIL_LINES:-50}"
# Remembers each container's previous death time, so that the log excerpt
# for a death doesn't repeat output from earlier crashes.
STATE_DIR="${STATE_DIR:-/run/docker-death-logger}"

LOG_DIR="$(dirname "$LOG_FILE")"
mkdir -p "$LOG_DIR" "$STATE_DIR"
chmod 700 "$LOG_DIR" "$STATE_DIR"
if [ -f "$LOG_FILE" ]; then
  chmod 600 "$LOG_FILE"
fi

ESC="$(printf '\033')"

# Strip ANSI escape sequences and control characters (keeping tabs/newlines)
# so attacker-controlled container output cannot forge log entries or inject
# terminal escape codes when admins view the log file.
sanitize_stream() {
  LC_ALL=C sed "s|${ESC}\[[0-?]*[ -/]*[@-~]||g" \
    | LC_ALL=C tr -d '\000-\010\013-\037\177'
}

# Keep $LOG_FILE within $MAX_LOG_SIZE bytes by trimming the oldest content.
trim_log() {
  [ -f "$LOG_FILE" ] || return 0
  if [ "$(wc -c < "$LOG_FILE")" -le "$MAX_LOG_SIZE" ]; then
    return 0
  fi
  # Keep the last $MAX_LOG_SIZE bytes and drop the first (likely partial) line
  # whenever multiple lines remain. Overwrite in place to preserve the inode.
  tail -c "$MAX_LOG_SIZE" "$LOG_FILE" | awk '
    NR == 1 { first = $0; next }
    { print }
    END { if (NR == 1) print first }
  ' > "$LOG_FILE.tmp" \
    && cat "$LOG_FILE.tmp" > "$LOG_FILE" \
    && rm -f "$LOG_FILE.tmp"
}

log() {
  printf '%s\n' "$*" | tee -a "$LOG_FILE"
  trim_log
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
  # Validate container ID is hex before using it in a state file path.
  case "$id" in
    ''|*[!0-9a-fA-F]*) continue ;;
  esac

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

  docker logs "$@" --until "$event_time" --tail "$TAIL_LINES" -- "$id" 2>&1 \
    | sanitize_stream \
    | sed 's/^/    | /' \
    | tee -a "$LOG_FILE"
  trim_log
done

# `docker events` only exits if the Docker daemon goes away. Exit non-zero so
# systemd's Restart=always policy brings it back.
log "$(date -u +%Y-%m-%dT%H:%M:%SZ) docker events stream ended"
exit 1
