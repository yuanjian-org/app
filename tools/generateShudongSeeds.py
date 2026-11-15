#!/usr/bin/env python3

"""
Usage:
  ./tools/generateShudongSeeds.py <database_url> \\
    <seeds_json> \\
    <user_id_1> <user_id_2> <user_id_3> <user_id_4>

Imports the Shudong (树洞) threads and emoji reactions from
the given JSON file into the ShudongPosts and
ShudongReactions tables of the given database. Every imported
post is marked as anonymous and AI generated.

Number of user IDs:
  N = 4 user IDs are required. N must equal the maximum
  number of unique participants (post authors and emoji
  reactors) in any single thread of the seed file. The script
  computes N from the loaded threads and errors out with the
  expected value if a different number of user IDs is given,
  so keep this doc in sync if the seed file changes.

User mapping:
  User IDs are cycled across threads. In the t-th thread
  (0-based), the j-th unique participant (0-based, post
  authors first then any additional reactors in order of
  first appearance) is mapped to user_ids[(t + j) % N]. Hence
  the same participant name (e.g. "Alice") is usually mapped
  to different users in different threads, while different
  participants in the same thread always map to different
  users.

Data format:
  The seed JSON file is an array of thread objects, each
  with a `posts` array of `{author, replyTo, markdown,
  reactions?}` objects in chronological order. The first
  post is the root question and has `replyTo = null`. For a
  reply, `replyTo` is the name of the replied-to author, and
  the reply's parent is the latest preceding post in the same
  thread written by that author. Optional `reactions` is an
  array of `{emoji, users}` objects using allowed
  ShudongEmoji values from src/shared/Shudong.ts.

Timestamps:
  Posts are given realistic creation times as if they had
  accumulated organically over the last two months: questions
  get more frequent over time, posting follows daily
  activity patterns in China Standard Time, and replies and
  reactions follow after log-normally distributed delays.

No author is subscribed to any thread, and no notifications
are scheduled.

Errors out if:
  - The JSON file is missing, unreadable, or malformed (e.g.
    invalid JSON, a thread without a root question, a reply
    to an unknown author, empty posts, invalid/duplicate
    reactions)
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
from typing import Any, Dict, List, NoReturn, Optional, Set, Tuple
from zoneinfo import ZoneInfo
import psycopg2  # type: ignore


# Keep in sync with shudongEmojis in src/shared/Shudong.ts.
SHUDONG_EMOJIS = {
  "🤗", "💖", "💪", "👏", "🙏", "🤝", "😊", "🥰",
  "😄", "😂", "🙌", "👍", "🥺", "😭", "😅", "🤔",
  "😮", "😎", "🎉", "✨", "🌟", "🌹", "🍀", "💡",
}

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
class ReactionSpec:
  emoji: str
  users: List[str] = field(default_factory=list)


@dataclass
class ReactionRow:
  post_id: str
  user_id: str
  emoji: str
  created_at: datetime


@dataclass
class Post:
  author: str
  # None for root questions.
  reply_to: Optional[str]
  markdown: str
  reactions: List[ReactionSpec] = field(default_factory=list)
  # Fields below are filled in by assign_fields().
  id: str = ""
  parent_id: Optional[str] = None
  author_id: str = ""
  created_at: Optional[datetime] = None
  response_count: int = 0
  reaction_rows: List[ReactionRow] = field(
    default_factory=list
  )


@dataclass
class Thread:
  # 1-based position in seed list, used in errors.
  number: int
  posts: List[Post] = field(default_factory=list)

  def unique_users(self) -> List[str]:
    """Participant names: authors first, then reactors."""
    users: List[str] = []
    for post in self.posts:
      if post.author not in users:
        users.append(post.author)
    for post in self.posts:
      for spec in post.reactions:
        for user in spec.users:
          if user not in users:
            users.append(user)
    return users


def fail(message: str) -> NoReturn:
  print(f"Error: {message}", file=sys.stderr)
  sys.exit(1)


def parse_raw_reactions(
  raw_reactions: Any, where: str, post_num: int
) -> List[ReactionSpec]:
  """Validate and convert JSON reactions on one post."""
  if raw_reactions is None:
    return []
  if not isinstance(raw_reactions, list):
    fail(
      f"Invalid reactions on post #{post_num} in {where}."
    )
  specs: List[ReactionSpec] = []
  for r_idx, raw_reaction in enumerate(raw_reactions):
    if not isinstance(raw_reaction, dict):
      fail(
        f"Reaction #{r_idx + 1} on post #{post_num}"
        f" in {where} must be an object."
      )
    emoji = raw_reaction.get("emoji")
    users = raw_reaction.get("users")
    if not isinstance(emoji, str):
      fail(
        f"Invalid emoji in reaction #{r_idx + 1}"
        f" on post #{post_num} in {where}."
      )
    if not isinstance(users, list) or not all(
      isinstance(u, str) for u in users
    ):
      fail(
        f"Invalid users in reaction #{r_idx + 1}"
        f" on post #{post_num} in {where}."
      )
    specs.append(ReactionSpec(emoji=emoji, users=list(users)))
  return specs


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
  reactions = parse_raw_reactions(
    raw_post.get("reactions"), where, post_num
  )
  return Post(
    author=author,
    reply_to=reply_to,
    markdown=markdown.strip(),
    reactions=reactions,
  )


def load_threads(path: Path) -> List[Thread]:
  """Load and convert threads from the JSON seed file."""
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


def validate_reactions(
  reactions: List[ReactionSpec], where: str, post_num: int
) -> None:
  """Validate emoji reactions on a single post."""
  seen_emojis: Set[str] = set()
  for spec in reactions:
    if spec.emoji not in SHUDONG_EMOJIS:
      fail(
        f"Invalid emoji '{spec.emoji}' on"
        f" post #{post_num} in {where}."
      )
    if spec.emoji in seen_emojis:
      fail(
        f"Duplicate emoji '{spec.emoji}' on"
        f" post #{post_num} in {where}."
      )
    seen_emojis.add(spec.emoji)
    if not spec.users:
      fail(
        f"Empty users list for emoji '{spec.emoji}'"
        f" on post #{post_num} in {where}."
      )
    seen_users: Set[str] = set()
    for user in spec.users:
      if not user.strip():
        fail(
          f"Empty user in reaction '{spec.emoji}'"
          f" on post #{post_num} in {where}."
        )
      if user in seen_users:
        fail(
          f"Duplicate user '{user}' for emoji"
          f" '{spec.emoji}' on post #{post_num}"
          f" in {where}."
        )
      seen_users.add(user)


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
      validate_reactions(post.reactions, where, i + 1)


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


def _random_time_after(
  after: datetime,
  now: datetime,
  fallback_min: float,
  fallback_max: float,
) -> datetime:
  """Sample a realistic timestamp strictly after `after`."""
  for _ in range(100):
    delay = max(
      REPLY_DELAY_MIN_MIN,
      random.lognormvariate(
        math.log(REPLY_DELAY_MEDIAN_MIN),
        REPLY_DELAY_SIGMA,
      ),
    )
    t = after + timedelta(minutes=delay)
    if t < now and accept_hour(t):
      return t
  # Fallback if no acceptable time is found, e.g. for
  # threads close to now: pick a time between `after`
  # and `now`.
  return after + (now - after) * random.uniform(
    fallback_min, fallback_max
  )


def random_reply_time(
  prev: datetime, now: datetime
) -> datetime:
  """Random creation time of a reply that follows the
  previous post in the thread (created at `prev`)."""
  return _random_time_after(prev, now, 0.2, 0.8)


def random_reaction_times(
  post_created_at: datetime, now: datetime, count: int
) -> List[datetime]:
  """Generate sorted reaction timestamps after a post."""
  times = [
    _random_time_after(post_created_at, now, 0.05, 0.95)
    for _ in range(count)
  ]
  times.sort()
  return times


def assign_fields(
  threads: List[Thread], user_ids: List[str]
) -> None:
  """Assign IDs, parent IDs, author IDs, response counts,
  creation times, and reaction rows to all posts."""
  now = datetime.now(timezone.utc)
  n = len(user_ids)
  for t, thread in enumerate(threads):
    # Cycle user IDs across threads. See "User mapping"
    # in the module docstring.
    user_map: Dict[str, str] = {
      name: user_ids[(t + j) % n]
      for j, name in enumerate(thread.unique_users())
    }
    by_id: Dict[str, Post] = {}
    # Latest post by each author so far in the thread,
    # used to resolve reply parents.
    latest: Dict[str, Post] = {}
    prev: Optional[Post] = None
    for post in thread.posts:
      post.id = str(uuid.uuid4())
      post.author_id = user_map[post.author]
      if post.reply_to is None:
        created_at = random_root_time(now)
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
        created_at = random_reply_time(
          prev.created_at, now
        )
      post.created_at = created_at
      pairs: List[Tuple[str, str]] = [
        (spec.emoji, u)
        for spec in post.reactions
        for u in spec.users
      ]
      if pairs:
        times = random_reaction_times(
          created_at, now, len(pairs)
        )
        post.reaction_rows = [
          ReactionRow(
            post_id=post.id,
            user_id=user_map[reactor],
            emoji=emoji,
            created_at=reacted_at,
          )
          for (emoji, reactor), reacted_at in zip(
            pairs, times
          )
        ]
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
  """Insert posts and reactions. Does not commit.

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
        ' "responseCount",'
        ' "createdAt", "updatedAt"'
        ") VALUES ("
        " %s, %s, %s, TRUE, TRUE, %s, %s, %s, %s"
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
      for row in post.reaction_rows:
        cur.execute(
          'INSERT INTO "ShudongReactions" ('
          ' "postId", "userId", "emoji",'
          ' "createdAt", "updatedAt"'
          ") VALUES (%s, %s, %s, %s, %s)",
          (
            row.post_id,
            row.user_id,
            row.emoji,
            row.created_at,
            row.created_at,
          ),
        )


def main() -> None:
  if len(sys.argv) < 4:
    print(
      f"Usage: {sys.argv[0]} <database_url>"
      " <seeds_json> <user_id_1> ... <user_id_N>",
      file=sys.stderr,
    )
    sys.exit(1)

  database_url = sys.argv[1]
  seeds_path = Path(sys.argv[2])
  user_ids = sys.argv[3:]

  threads = load_threads(seeds_path)
  validate_threads(threads)

  # The number of user IDs must equal the maximum
  # number of unique participants in any thread.
  required = max(
    len(t.unique_users()) for t in threads
  )
  if len(user_ids) != required:
    fail(
      f"Expected exactly {required} user IDs (the max"
      " number of unique participants in a thread), got"
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

  total_posts = sum(len(t.posts) for t in threads)
  total_reactions = sum(
    len(p.reaction_rows) for t in threads for p in t.posts
  )
  print(
    f"Imported {len(threads)} threads"
    f" ({total_posts} posts,"
    f" {total_reactions} reactions).",
    file=sys.stderr,
  )


if __name__ == "__main__":
  main()
