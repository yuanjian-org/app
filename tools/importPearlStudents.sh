#!/usr/bin/env bash

# Usage: ./tools/importPearlStudents.sh <path_to_csv>
#
# Imports PearlStudent data from a CSV file into PostgreSQL using psql \copy
# into a temporary staging table followed by a bulk upsert on pearlId.
#
# The expected CSV format is (with header):
#
# 姓名,珍珠号,身份证后四位
# 张三,12345678901,1234
# 李四,98765432109,5678
#
# Ensure that DATABASE_URI is set in the environment before running.

set -euo pipefail
umask 077

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <path_to_csv>" >&2
  exit 1
fi

CSV_FILE="$1"

if [ ! -f "$CSV_FILE" ]; then
  echo "Error: File not found: $CSV_FILE" >&2
  exit 1
fi

if [ -z "${DATABASE_URI:-}" ]; then
  echo "Error: DATABASE_URI environment variable is not set." >&2
  exit 1
fi

# Move any password from DATABASE_URI into PGPASSWORD so credentials are not
# exposed in psql process arguments (ps aux), while preserving host/options.
PSQL_URI="$DATABASE_URI"
uri_re='^([a-zA-Z][a-zA-Z0-9+.-]*://[^/:@/?]+):([^@/?]*)@(.*)$'
if [[ "$DATABASE_URI" =~ $uri_re ]]; then
  raw_pass="${BASH_REMATCH[2]}"
  raw_pass="${raw_pass//\\/\\\\}"
  printf -v PGPASSWORD '%b' "${raw_pass//%/\\x}"
  export PGPASSWORD
  PSQL_URI="${BASH_REMATCH[1]}@${BASH_REMATCH[3]}"
fi

# Static SQL file containing no untrusted CSV data; CSV rows are streamed
# strictly via stdin into \copy ... FROM pstdin, preventing SQL injection and
# psql meta-command execution (\!).
SQL_FILE=$(mktemp)
trap 'rm -f "$SQL_FILE"' EXIT

cat > "$SQL_FILE" <<'EOSQL'
BEGIN;

CREATE TEMP TABLE tmp_pearl (
  row_num BIGSERIAL,
  name TEXT,
  pid TEXT,
  nid TEXT
) ON COMMIT DROP;

\copy tmp_pearl (name, pid, nid) FROM pstdin WITH (FORMAT csv, HEADER true)

WITH upserted AS (
  INSERT INTO "PearlStudents" (
    "pearlId",
    "name",
    "lowerCaseNationalIdLastFour",
    "createdAt",
    "updatedAt"
  )
  SELECT DISTINCT ON (pid)
    pid,
    name,
    nid,
    NOW(),
    NOW()
  FROM (
    SELECT
      row_num,
      btrim(COALESCE(pid, '')) AS pid,
      btrim(COALESCE(name, '')) AS name,
      lower(btrim(COALESCE(nid, ''))) AS nid
    FROM tmp_pearl
  ) s
  WHERE pid <> '' AND name <> ''
  ORDER BY pid, row_num DESC
  ON CONFLICT ("pearlId") DO UPDATE
  SET "name" = EXCLUDED."name",
      "lowerCaseNationalIdLastFour" =
        EXCLUDED."lowerCaseNationalIdLastFour",
      "updatedAt" = NOW()
  RETURNING 1
)
SELECT count(*) FROM upserted;

COMMIT;
EOSQL

echo "Importing records from $CSV_FILE to database ..."

# Keep header row and skip blank/whitespace-only lines before streaming to
# PostgreSQL COPY.
imported_count=$(
  awk 'NR == 1 || /[^[:space:]]/' "$CSV_FILE" |
    psql -X -q -t -A -v ON_ERROR_STOP=1 "$PSQL_URI" -f "$SQL_FILE"
)

echo "Successfully imported/updated $imported_count PearlStudent records."
