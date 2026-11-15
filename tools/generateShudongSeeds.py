#!/usr/bin/env python3

"""
Usage:
  ./tools/generateShudongSeeds.py <database_url> \\
    <user_id_1> <user_id_2> <user_id_3> <user_id_4>

Imports the Shudong (树洞) threads from
src/api/routes/shudongSeedThreads.json into the
ShudongPosts table of the given database. Every imported
post is marked as anonymous and AI generated.

Number of user IDs:
  N = 4 user IDs are required. N must equal the maximum
  number of unique authors in any single thread of the
  seed file. The script computes N from the loaded
  threads and errors out with the expected value if a
  different number of user IDs is given, so keep this
  doc in sync if the seed file changes.

Author mapping:
  User IDs are cycled across threads. In the t-th thread
  (0-based), the j-th unique author (0-based, in order of
  first appearance) is mapped to user_ids[(t + j) % N].
  Hence the same author name (e.g. "Alice") is usually
  mapped to different users in different threads, while
  different authors in the same thread always map to
  different users.

Data format:
  shudongSeedThreads.json is a JSON array of thread
  objects, each with a `posts` array of `{author,
  replyTo, markdown}` objects in chronological order.
  The first post is the root question and has
  `replyTo = null`. For a reply, `replyTo` is the name
  of the replied-to author, and the reply's parent is
  the latest preceding post in the same thread written
  by that author.

Timestamps:
  Posts are given realistic creation times as if they
  had accumulated organically over the last two months:
  questions get more frequent over time, posting follows
  daily activity patterns in China Standard Time, and
  replies follow the previous post in the thread after a
  log-normally distributed delay.

No author is subscribed to any thread, and no
notifications are scheduled.

Errors out if:
  - shudongSeedThreads.json is missing, unreadable, or
    malformed (e.g. invalid JSON, a thread without a
    root question, a reply to an unknown author, empty
    posts)
  - The number of user IDs is wrong, or user IDs are
    invalid, duplicated, or missing from the database
  - Any general error (e.g. cannot connect to DB)
"""

import json
import math
import random
import sys
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, NoReturn, Optional
from zoneinfo import ZoneInfo
import psycopg2  # type: ignore


SEEDS_PATH = (
  Path(__file__).resolve().parent.parent
  / "src"
  / "api"
  / "routes"
  / "shudongSeedThreads.json"
)

# Time zone used to model when users are active.
ACTIVITY_TZ = ZoneInfo("Asia/Shanghai")

# Relative posting activity for each local hour 0-23.
# Low overnight, peaks late morning, afternoon and late
# evening, which is typical for students and young
# professionals.
HOUR_WEIGHTS = [
  4, 2, 1, 0.5, 0.3, 0.3, 0.8, 2,
  4, 6, 8, 9, 7, 6, 7, 8,
  8, 7, 7, 8, 10, 11, 10, 7,
]

# All posts are created within this window before now.
WINDOW = timedelta(days=60)

# Root questions are created at least this long before
# now so that their replies have time to accumulate.
MIN_ROOT_AGE = timedelta(days=2)

# Reply delays (in minutes) after the previous post in
# the thread are drawn from a log-normal distribution
# with this median and sigma, then filtered by
# HOUR_WEIGHTS: most replies arrive within hours, and a
# few take a day or more.
REPLY_DELAY_MEDIAN_MIN = 150
REPLY_DELAY_SIGMA = 1.1

# Minimum time (in minutes) it takes to write a reply.
REPLY_DELAY_MIN_MIN = 4


@dataclass
class Post:
  author: str
  # None for root questions.
  reply_to: Optional[str]
  markdown: str
  # Fields below are filled in by assign_fields().
  id: str = ""
  parent_id: Optional[str] = None
  author_id: str = ""
  created_at: Optional[datetime] = None
  response_count: int = 0


@dataclass
class Thread:
  # 1-based position in seed list, used in errors.
  number: int
  posts: List[Post] = field(default_factory=list)

  def unique_authors(self) -> List[str]:
    """Author names in order of first appearance."""
    authors: List[str] = []
    for post in self.posts:
      if post.author not in authors:
        authors.append(post.author)
    return authors


def fail(message: str) -> NoReturn:
  print(f"Error: {message}", file=sys.stderr)
  sys.exit(1)


def parse_raw_post(
  raw_post: Any, where: str, post_num: int
) -> Post:
  """Validate and convert one JSON post object."""
  if not isinstance(raw_post, dict):
    fail(f"Post #{post_num} in {where} must be a dict.")
  author = raw_post.get("author")
  reply_to = raw_post.get("replyTo")
  markdown = raw_post.get("markdown")
  if not isinstance(author, str) or not author.strip():
    fail(
      f"Invalid author on post #{post_num} in {where}."
    )
  if reply_to is not None and not isinstance(
    reply_to, str
  ):
    fail(
      f"Invalid replyTo on post #{post_num} in {where}."
    )
  if not isinstance(markdown, str):
    fail(
      f"Invalid markdown on post #{post_num} in {where}."
    )
  return Post(
    author=author,
    reply_to=reply_to,
    markdown=markdown.strip(),
  )


def load_threads(path: Path) -> List[Thread]:
  """Load and convert threads from shudongSeedThreads.json."""
  try:
    content = path.read_text(encoding="utf-8")
    raw_threads = json.loads(content)
  except OSError as e:
    fail(f"Failed to read {path}: {e}")
  except json.JSONDecodeError as e:
    fail(f"Invalid JSON in {path}: {e}")

  if not isinstance(raw_threads, list):
    fail(f"Expected a JSON array in {path}.")

  threads: List[Thread] = []
  for i, raw_thread in enumerate(raw_threads):
    where = f"thread #{i + 1}"
    if not isinstance(raw_thread, dict):
      fail(f"Expected an object for {where}.")
    raw_posts = raw_thread.get("posts")
    if not isinstance(raw_posts, list):
      fail(f"Missing 'posts' array in {where}.")
    posts = [
      parse_raw_post(raw_post, where, j + 1)
      for j, raw_post in enumerate(raw_posts)
    ]
    threads.append(Thread(number=i + 1, posts=posts))
  return threads


def validate_threads(threads: List[Thread]) -> None:
  """Validate thread structure, exiting on errors."""
  if not threads:
    fail("No threads found in seed file.")
  for thread in threads:
    where = f"thread #{thread.number}"
    if not thread.posts:
      fail(f"No posts in {where}.")
    if thread.posts[0].reply_to is not None:
      fail(
        f"First post in {where} is not a root"
        " question (replyTo must be null)."
      )
    for i, post in enumerate(thread.posts):
      if i > 0 and post.reply_to is None:
        fail(f"Multiple root questions in {where}.")
      if not post.markdown:
        fail(
          f"Empty post by '{post.author}' in {where}."
        )
      if post.reply_to is not None and not any(
        p.author == post.reply_to
        for p in thread.posts[:i]
      ):
        fail(
          f"'{post.author}' replies to unknown"
          f" author '{post.reply_to}' in {where}."
        )


def accept_hour(t: datetime) -> bool:
  """Randomly accept a timestamp with a probability
  proportional to the activity level of its local hour.
  Used for rejection sampling of realistic times."""
  hour = t.astimezone(ACTIVITY_TZ).hour
  return random.random() < (
    HOUR_WEIGHTS[hour] / max(HOUR_WEIGHTS)
  )


def random_root_time(now: datetime) -> datetime:
  """Random creation time of a root question.

  Times are skewed toward the recent end of the window
  (Beta(1.4, 1) distribution) to mimic a community that
  grows organically, and follow daily activity patterns.
  """
  start = now - WINDOW
  span = (WINDOW - MIN_ROOT_AGE).total_seconds()
  while True:
    t = start + timedelta(
      seconds=span * random.betavariate(1.4, 1)
    )
    if accept_hour(t):
      return t


def random_reply_time(
  prev: datetime, now: datetime
) -> datetime:
  """Random creation time of a reply that follows the
  previous post in the thread (created at `prev`)."""
  for _ in range(100):
    delay = max(
      REPLY_DELAY_MIN_MIN,
      random.lognormvariate(
        math.log(REPLY_DELAY_MEDIAN_MIN),
        REPLY_DELAY_SIGMA,
      ),
    )
    t = prev + timedelta(minutes=delay)
    if t < now and accept_hour(t):
      return t
  # Fallback if no acceptable time is found, e.g. for
  # threads close to now: pick a time between the
  # previous post and now.
  return prev + (now - prev) * random.uniform(0.2, 0.8)


def assign_fields(
  threads: List[Thread], user_ids: List[str]
) -> None:
  """Assign IDs, parent IDs, author IDs, response counts
  and creation times to all posts."""
  now = datetime.now(timezone.utc)
  n = len(user_ids)
  for t, thread in enumerate(threads):
    # Cycle user IDs across threads. See "Author
    # mapping" in the module docstring.
    author_ids: Dict[str, str] = {
      name: user_ids[(t + j) % n]
      for j, name in enumerate(thread.unique_authors())
    }
    by_id: Dict[str, Post] = {}
    # Latest post by each author so far in the thread,
    # used to resolve reply parents.
    latest: Dict[str, Post] = {}
    prev: Optional[Post] = None
    for post in thread.posts:
      post.id = str(uuid.uuid4())
      post.author_id = author_ids[post.author]
      if post.reply_to is None:
        post.created_at = random_root_time(now)
      else:
        parent = latest[post.reply_to]
        post.parent_id = parent.id
        # Increment response_count across all ancestors
        # in the parent chain to match createPostImpl()
        # in src/api/routes/shudong.ts.
        curr: Optional[Post] = parent
        while curr is not None:
          curr.response_count += 1
          curr = (
            by_id.get(curr.parent_id)
            if curr.parent_id
            else None
          )
        # Posts are in chronological order, so each reply
        # follows the previous post (not just its parent).
        # This also keeps the pseudo-anonymous labels
        # (匿名 甲, 匿名 乙, ...) consistent with thread
        # order.
        assert prev is not None and prev.created_at
        post.created_at = random_reply_time(
          prev.created_at, now
        )
      by_id[post.id] = post
      latest[post.author] = post
      prev = post


def validate_user_ids(
  cur: "psycopg2.extensions.cursor",
  user_ids: List[str],
) -> None:
  """Ensure all user IDs exist in the users table."""
  cur.execute(
    'SELECT "id"::text FROM "users"'
    ' WHERE "id" = ANY(%s::uuid[])',
    (user_ids,),
  )
  found = {row[0] for row in cur.fetchall()}
  missing = [u for u in user_ids if u not in found]
  if missing:
    fail(f"User IDs not found: {', '.join(missing)}")


def insert_threads(
  cur: "psycopg2.extensions.cursor",
  threads: List[Thread],
) -> None:
  """Insert posts. Does not commit.

  Unlike createPostImpl() in src/api/routes/shudong.ts,
  authors are intentionally NOT subscribed to threads.
  """
  for thread in threads:
    # Insert in seed order so that parents always exist
    # before their children (FK constraint).
    for post in thread.posts:
      cur.execute(
        'INSERT INTO "ShudongPosts" ('
        ' "id", "parentId", "authorId",'
        ' "isAnonymous", "isAiGenerated", "markdown",'
        ' "upvoteCount", "responseCount",'
        ' "createdAt", "updatedAt"'
        ") VALUES ("
        " %s, %s, %s, TRUE, TRUE, %s, 0, %s, %s, %s"
        ")",
        (
          post.id,
          post.parent_id,
          post.author_id,
          post.markdown,
          post.response_count,
          post.created_at,
          post.created_at,
        ),
      )


def main() -> None:
  if len(sys.argv) < 3:
    print(
      f"Usage: {sys.argv[0]} <database_url>"
      " <user_id_1> ... <user_id_N>",
      file=sys.stderr,
    )
    sys.exit(1)

  database_url = sys.argv[1]
  user_ids = sys.argv[2:]

  threads = load_threads(SEEDS_PATH)
  validate_threads(threads)

  # The number of user IDs must equal the maximum
  # number of unique authors in any thread.
  required = max(
    len(t.unique_authors()) for t in threads
  )
  if len(user_ids) != required:
    fail(
      f"Expected exactly {required} user IDs (the max"
      " number of unique authors in a thread), got"
      f" {len(user_ids)}."
    )

  # Normalize and validate user ID format.
  try:
    user_ids = [str(uuid.UUID(u)) for u in user_ids]
  except ValueError as e:
    fail(f"Invalid user ID: {e}")
  if len(set(user_ids)) != len(user_ids):
    fail("Duplicate user IDs.")

  assign_fields(threads, user_ids)

  conn = psycopg2.connect(database_url)
  try:
    # `with conn` commits on success and rolls back on
    # exception, so the import is all-or-nothing.
    with conn:
      with conn.cursor() as cur:
        validate_user_ids(cur, user_ids)
        insert_threads(cur, threads)
  finally:
    conn.close()

  total = sum(len(t.posts) for t in threads)
  print(
    f"Imported {len(threads)} threads"
    f" ({total} posts).",
    file=sys.stderr,
  )


if __name__ == "__main__":
  main()
