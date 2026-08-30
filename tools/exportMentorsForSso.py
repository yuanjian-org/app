#!/usr/bin/env python3

"""
Usage:
  echo -e "张三\\n李四" | \\
    ./tools/exportMentorsForSso.py <database_url> \\
      <sso_client_id>

Reads user names from stdin (one per line), looks up
each user in the source database, validates the user
has the "Mentor" role, then outputs SQL INSERT
statements for the SSO client's Users table.

The ssoUserId column is computed the same way as
hashUserIdForClient() in src/api/oauth2/utils.ts:
  sha256("<clientId>\\0<userId>") | base64url

Errors out if:
  - A user name matches zero or more than one user
  - The matched user does not have the "Mentor" role
  - Any general error (e.g. cannot connect to DB)
"""

import sys
import hashlib
import base64
import json
import psycopg2  # type: ignore


def hash_user_id_for_client(
  client_id: str, user_id: str
) -> str:
  """Replicate hashUserIdForClient(clientId, userId).

  Computes sha256(clientId + NUL + userId) and returns
  the digest as a base64url string (no padding).
  """
  data = f"{client_id}\0{user_id}".encode("utf-8")
  digest = hashlib.sha256(data).digest()
  # base64url encoding without trailing '=' padding
  return (
    base64.urlsafe_b64encode(digest)
    .rstrip(b"=")
    .decode("ascii")
  )


def sql_literal(value: object) -> str:
  """Format a Python value as a SQL literal.

  None becomes NULL. Dicts and lists are serialized as
  JSON strings (for JSONB columns). Strings are quoted
  with single-quote escaping.
  """
  if value is None:
    return "NULL"
  if isinstance(value, (dict, list)):
    # JSONB columns: serialize to JSON text, then
    # wrap in SQL quotes.
    json_str = json.dumps(
      value, ensure_ascii=False
    )
    return "'" + json_str.replace("'", "''") + "'"
  text = str(value)
  return "'" + text.replace("'", "''") + "'"


def main() -> None:
  if len(sys.argv) != 3:
    print(
      "Usage: <names on stdin> |"
      f" {sys.argv[0]} <database_url>"
      " <sso_client_id>",
      file=sys.stderr,
    )
    sys.exit(1)

  database_url = sys.argv[1]
  sso_client_id = sys.argv[2]

  # Read all user names from stdin, stripping
  # blank lines and carriage returns.
  names = [
    line.strip()
    for line in sys.stdin
    if line.strip()
  ]

  if not names:
    print(
      "Error: No user names provided on stdin.",
      file=sys.stderr,
    )
    sys.exit(1)

  # Connect to the source database.
  conn = psycopg2.connect(database_url)
  try:
    with conn.cursor() as cur:
      for name in names:
        process_user(
          cur, name, sso_client_id
        )
  finally:
    conn.close()


# Columns to read from the source database.
COLUMNS = [
  "id", "phone", "email", "name", "pinyin",
  "url", "wechat", "roles", "profile",
  "preference", "state",
]


def process_user(
  cur: "psycopg2.extensions.cursor",
  name: str,
  sso_client_id: str,
) -> None:
  """Look up a user by name, validate, and print
  the INSERT statement to stdout."""

  # Use a parameterized query to avoid SQL injection.
  col_list = ", ".join(f'"{c}"' for c in COLUMNS)
  cur.execute(
    f'SELECT {col_list} FROM "users"'
    ' WHERE "name" = %s',
    (name,),
  )
  rows = cur.fetchall()

  # Validate exactly one match.
  if len(rows) == 0:
    print(
      f"Error: No user found with name '{name}'",
      file=sys.stderr,
    )
    sys.exit(1)
  if len(rows) > 1:
    print(
      f"Error: Multiple users found with name"
      f" '{name}' ({len(rows)} matches)",
      file=sys.stderr,
    )
    sys.exit(1)

  # Map column names to values.
  user = dict(zip(COLUMNS, rows[0]))

  # Validate the user has the "Mentor" role.
  roles = user["roles"] or []
  if "Mentor" not in roles:
    print(
      f"Error: User '{name}' does not have the"
      f" Mentor role (roles: {roles})",
      file=sys.stderr,
    )
    sys.exit(1)

  # Compute ssoUserId the same way as
  # hashUserIdForClient(clientId, userId).
  sso_user_id = hash_user_id_for_client(
    sso_client_id, user["id"]
  )

  # Emit the SQL INSERT statement.
  # roles is always set to '{"Mentor"}'.
  print(
    'INSERT INTO "users" (\n'
    '  "id",\n'
    '  "phone",\n'
    '  "email",\n'
    '  "ssoUserId",\n'
    '  "name",\n'
    '  "pinyin",\n'
    '  "url",\n'
    '  "wechat",\n'
    '  "profile",\n'
    '  "preference",\n'
    '  "state",\n'
    '  "roles",\n'
    '  "createdAt",\n'
    '  "updatedAt"\n'
    ") VALUES (\n"
    "  gen_random_uuid(),\n"
    f"  {sql_literal(user['phone'])},\n"
    f"  {sql_literal(user['email'])},\n"
    f"  {sql_literal(sso_user_id)},\n"
    f"  {sql_literal(user['name'])},\n"
    f"  {sql_literal(user['pinyin'])},\n"
    f"  {sql_literal(user['url'])},\n"
    f"  {sql_literal(user['wechat'])},\n"
    f"  {sql_literal(user['profile'])},\n"
    f"  {sql_literal(user['preference'])},\n"
    f"  {sql_literal(user['state'])},\n"
    "  '{\"Mentor\"}',\n"
    "  NOW(),\n"
    "  NOW()\n"
    ");"
  )


if __name__ == "__main__":
  main()
