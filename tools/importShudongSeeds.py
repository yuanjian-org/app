#!/usr/bin/env python3

"""
Usage:
  ./tools/importShudongSeeds.py <database_url> \\
    <user_id_1> <user_id_2> <user_id_3> <user_id_4>

Imports the Shudong (树洞) threads inlined in THREADS at
the bottom of this file into the ShudongPosts table of
the given database. The script is self-contained and
reads no external files. Every imported post is marked
as anonymous and AI generated.

Number of user IDs:
  N = 4 user IDs are required. N must equal the maximum
  number of unique authors in any single thread of
  THREADS. The script computes N from THREADS and errors
  out with the expected value if a different number of
  user IDs is given, so keep this doc in sync if THREADS
  changes.

Author mapping:
  User IDs are cycled across threads. In the t-th thread
  (0-based), the j-th unique author (0-based, in order of
  first appearance) is mapped to user_ids[(t + j) % N].
  Hence the same author name (e.g. "Alice") is usually
  mapped to different users in different threads, while
  different authors in the same thread always map to
  different users.

Data format:
  THREADS is a list of threads. Each thread is a list of
  (author, reply_to, markdown) tuples in chronological
  order. The first tuple is the root question and has
  reply_to = None. For a reply, reply_to is the name of
  the replied-to author, and the reply's parent is the
  latest preceding post in the same thread written by
  that author.

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
  - THREADS is malformed (e.g. a thread without a root
    question, a reply to an unknown author, empty posts)
  - The number of user IDs is wrong, or user IDs are
    invalid, duplicated, or missing from the database
  - Any general error (e.g. cannot connect to DB)
"""

import sys
import math
import random
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Dict, List, NoReturn, Optional, Tuple
from zoneinfo import ZoneInfo
import psycopg2  # type: ignore


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
  # 1-based position in THREADS, used in error messages.
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


# (author, reply_to, markdown) of a post in THREADS.
# reply_to is None for the root question.
RawPost = Tuple[str, Optional[str], str]


def build_threads(
  raw_threads: List[List[RawPost]],
) -> List[Thread]:
  """Convert the inlined THREADS data into Thread objects.
  Post content is stripped of surrounding whitespace."""
  return [
    Thread(
      number=i + 1,
      posts=[
        Post(
          author=author,
          reply_to=reply_to,
          markdown=markdown.strip(),
        )
        for author, reply_to, markdown in raw_posts
      ],
    )
    for i, raw_posts in enumerate(raw_threads)
  ]


def validate_threads(threads: List[Thread]) -> None:
  """Validate thread structure, exiting on errors."""
  if not threads:
    fail("No threads found in THREADS.")
  for thread in threads:
    where = f"thread #{thread.number}"
    if not thread.posts:
      fail(f"No posts in {where}.")
    if thread.posts[0].reply_to is not None:
      fail(
        f"First post in {where} is not a root"
        " question (reply_to must be None)."
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
        parent.response_count += 1
        # Posts in THREADS are in chronological
        # order, so each reply follows the previous post
        # (not just its parent). This also keeps the
        # pseudo-anonymous labels (匿名 甲, 匿名 乙, ...)
        # consistent with the order in THREADS.
        assert prev is not None and prev.created_at
        post.created_at = random_reply_time(
          prev.created_at, now
        )
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
    # Insert in THREADS order so that parents always
    # exist before their children (FK constraint).
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

  threads = build_threads(THREADS)
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


# Inlined Shudong threads. Each thread is a list of
# (author, reply_to, markdown) tuples in chronological
# order. See "Data format" in the module docstring. The
# "Thread #N" comments are for readability only (titles
# are not imported) and match the thread numbers used in
# error messages.
THREADS: List[List[RawPost]] = [
  # Thread #1: 给导师发个消息，怎么比做实验还费劲
  [
    ("Alice", None,
     "想问导师一个数据问题，消息改了又删。我已经试过两种方法，但还不能确定问"
     "题出在哪里。担心现在去问显得没准备，又怕继续拖下去耽误进度。大家一般准"
     "备到什么程度才会找导师？"),
    ("甲导师", "Alice",
     "你已经试过两种方法，可以把各自的结果和目前的猜测一起发过去。先交代任务"
     "和目标，再说尝试过什么、现在卡在哪里，比如：“这两种方法都没解决问题，我"
     "怀疑是 A 或 B，想请您帮忙判断先验证哪个。”这次能确定下一步，就不必等所"
     "有问题都弄明白再开口。"),
  ],
  # Thread #2: 新任务插进来了，原来的论文还做不做
  [
    ("Alice", None,
     "本来在准备论文开题，导师又临时安排了一份调研，两件都要尽快。我不知道先"
     "放哪件，也不知道怎么开口讨论。只说“做不完”，怕听起来像在推活；直接问哪"
     "个更急，又担心最后还是两件一起做。有没有更具体的说法？"),
    ("甲导师", "Alice",
     "把冲突说具体一点：调研做到要求的程度需要多久，论文现在做到哪儿，新任务"
     "会挤掉哪部分时间。然后请导师一起定顺序，不要只留一句“最近太忙了”。可以"
     "连同选项一起问：“如果先做调研，开题准备需要往后挪；如果先保开题，调研能"
     "不能分阶段交？”时间、质量、先后顺序都可以谈。"),
    ("Alice", "甲导师",
     "排时间表还有个头疼的地方：有些只是改格式，跟毕业进度关系不大，但催得特"
     "别急。难道谁催得响，谁就得排前面吗？"),
    ("甲导师", "Alice",
     "催得急和重要程度要分开看。影响论文关键进度的任务、临时的格式整理，投入"
     "未必应该一样。可以把这种差别讲清楚，商量哪些简化处理，哪些延期，别默认"
     "每一件都要按最高标准立刻完成。"),
  ],
  # Thread #3: 导师只布置任务，具体怎么做全靠猜
  [
    ("Alice", None,
     "刚进实验室，看英文文献、跑数据、写论文都不熟。导师布置完任务就很难找到"
     "人，我只能自己摸索。现在好几步都不会，连找导师时应该先问什么都不知道。"
     "怎么才能把这种“一整个不会”的状态说清楚？"),
    ("Bob", "Alice",
     "可以先找师兄师姐问问，不一定每个问题都等导师来答。现在连卡在哪一步都说"
     "不清，让熟悉的人帮忙看一下，再去找导师也好开口些。"),
    ("甲导师", "Alice",
     "先拆任务。比如“写论文”里面，哪些部分已经有材料，哪些要补数据，哪些连方"
     "法都没弄懂？再标出各自需要的时间和你最需要指导的地方。这样去找导师，问"
     "题会比“我整个都不会”具体一些。拆开后，挑最影响后续的一步去问，确认现阶"
     "段做到什么程度。其他部分可以分阶段补，不必把所有不会的东西同时解决。"),
  ],
  # Thread #4: 新人第一周，到底应该先弄懂什么
  [
    ("Alice", None,
     "刚入职，工具、权限、代码规范都不熟。想赶紧做出东西，却经常卡在“这个该找"
     "谁”“那个在哪里”。这些信息好像也没有一份完整的说明。新手期应该先补技术，"
     "还是先把流程弄清楚？"),
    ("Bob", "Alice",
     "可以边问边攒一份自己的新人指南：权限去哪开、问题找谁、工具怎么用，再找"
     "熟悉的同事核对一下。先记眼前用得上的，不用第一天就写成公司百科。"),
    ("甲导师", "Alice",
     "先把会卡住当前任务的流程弄清楚，技术也围绕任务补。除了工具和权限，还可"
     "以问团队的代码规范、提交习惯和沟通方式。"),
    ("Carol", "Bob",
     "还可以记一下前后要跟哪些部门打交道。不然只知道“下一步点这里”，换个任务"
     "可能又迷路了。"),
  ],
  # Thread #5: 提问前要查到什么程度，才不算伸手
  [
    ("Alice", None,
     "想问 mentor 问题，又怕被说没自己查。但总不能查到已经解决了才去问吧？准"
     "备到什么程度比较合适？尤其碰到文档不全、作者又已经离职的情况，我不知道"
     "该继续查，还是直接找人问。"),
    ("甲导师", "Alice",
     "先查能找到的文档和资料，把试过的方法、没找到的信息说清楚。比如“我看了这"
     "部分文档，但没有找到这个功能对应的业务场景，想确认一下”。对方能知道你缺"
     "的是哪一块。文档作者已经离职的话，可以问团队里还有谁了解这部分。问题不"
     "一定都要让眼前这个人直接解答，找到下一位能提供信息的人，也能把任务往前"
     "推。"),
    ("Alice", "甲导师",
     "说准备过程的时候，我又怕一不小心写成小作文。是不是只留跟卡点有关的尝试"
     "就行，不用把查资料的全过程交代一遍？"),
    ("甲导师", "Alice",
     "提问时保留和卡点有关的尝试就可以。需要让对方看见的是：你做到哪一步、缺"
     "什么信息、需要他补充什么判断。这样既说明你还在负责解决问题，也不必为了"
     "证明做过功课，把所有过程都堆上去。"),
  ],
  # Thread #6: 问得太具体，会不会显得没水平
  [
    ("Alice", None,
     "和导师聊天时，总想问点有深度的问题，但我真正想问的就是：这段代码为什么"
     "这样写，需求到底要支持哪些场景。有时文档里也没说清楚。问这种很具体的问"
     "题，会不会显得没水平？"),
    ("甲导师", "Alice",
     "这些正好是和任务有关的问题。场景没确认，后面的实现可能就偏了；理解代码"
     "为什么这样写，也能帮助你处理后续类似任务。文档不全，就把缺的部分具体说"
     "出来，请对方确认。带人的同事回答时，也可能重新考虑原来的做法是否合理，"
     "没必要把问题换得更大来显得有水平。"),
  ],
  # Thread #7: 工作以后，没有排名反而不知道自己做得怎样
  [
    ("Alice", None,
     "在学校还能看成绩和排名，工作以后就很难判断自己做得怎样。有的同事升得快"
     "，有的项目很有影响。大家都说别只比较，但绩效和晋升又确实会影响工作。我"
     "应该拿什么衡量自己的进展？"),
    ("Bob", "Alice",
     "我会先把团队怎么考核弄明白。主管、岗位一换，标准可能也换了。说完全不看"
     "绩效和晋升，我做不到，毕竟真会影响工作。"),
    ("Carol", "Alice",
     "但只比今年谁升得快，也太像毕业后继续排年级名次了。有人在攒专业能力，有"
     "人在意产品有没有人用，还有人觉得帮团队解决了问题就挺有成就感。想要的都"
     "不一样，很难排出一个名次吧。"),
  ],
  # Thread #8: 大三了，还是回答不了以后想干什么
  [
    ("Alice", None,
     "大三了，身边有人准备考研，有人已经在找工作。我连自己喜欢什么都说不清，"
     "一想到要决定未来几十年，就不敢选。规划一定要想那么远吗？"),
    ("Bob", "Alice",
     "连方向都没有的话，就先去了解有哪些工作、找机会试试呗。“弄清楚自己能选什"
     "么”也算在往前走，不然光坐着想几十年，想想都累。"),
    ("甲导师", "Alice",
     "可以先缩到接下来三年：愿意了解什么方向，能参加什么实践，毕业前想尝试哪"
     "类岗位。先定一个能开始验证的方向，再根据经历改。"),
    ("Alice", "甲导师",
     "三年确实比一辈子好想一点。但如果准备了半天，实习完发现不喜欢呢？我就是"
     "怕绕一圈又回到起点。"),
    ("甲导师", "Alice",
     "实习后发现不喜欢，能帮你判断具体不喜欢哪部分。有位做过财务实习的前辈，"
     "工作能做好，却不喜欢每天做这些事，后来就换了专业方向。这次尝试至少帮她"
     "排除了一个选项。"),
  ],
  # Thread #9: MBTI 和我想做的工作对不上，要听谁的
  [
    ("Alice", None,
     "做职业选择时，性格测试到底能参考到什么程度？如果测出来的方向和我感兴趣"
     "的工作不一样，是不是说明不适合？大家说还要看实际体验，但体验的时候具体"
     "该看什么，累不累算一个标准吗？"),
    ("甲导师", "Alice",
     "可以把测试当参考，再结合实际工作体验来判断。它能提供一些线索，但一份报"
     "告不够替你决定方向。兴趣、能力、看重什么，都要一起看。实际体验时，可以"
     "看这份工作主要让你把精力花在哪里：大量与人沟通，还是独立研究；推动团队"
     "，还是完成明确任务。再看你对这些具体活动的感受，而不只看岗位名称。"),
  ],
  # Thread #10: 怎么知道自己是真喜欢，还是只喜欢想象中的工作
  [
    ("Alice", None,
     "看别人做某份工作会很向往，但自己完全没做过。怎么判断喜欢的是工作本身，"
     "还是它看起来的样子？如果有机会试一试，除了看能不能做好，还应该注意什么"
     "？"),
    ("Bob", "Alice",
     "在学校也能先试一小块吧。比如觉得自己喜欢查资料，就接一次小组或社团的资"
     "料搜集。做的时候喜不喜欢，交出去别人看不看得懂、用不用得上，都能问到，"
     "不用全靠脑补。"),
    ("甲导师", "Alice",
     "可以先做其中一小部分，同时观察结果、别人的反馈和自己的投入感。有位后来"
     "转行做培训的前辈，起初只是羡慕别人能上台讲课。等她开始兼职，要准备内容"
     "、做课件、反复打磨，才确认自己愿意花时间继续做。她也做过财务实习，工作"
     "能做好，却不喜欢那份工作。做得来和想继续做，需要分别观察。"),
  ],
  # Thread #11: 没有亮眼经历，优势从哪里找
  [
    ("Alice", None,
     "一问优势就只能想到“认真负责、学习能力强”。学校里做过一些事，但都挺普通"
     "，比如订活动场地、组织聚餐，这些值得写进经历吗？不知道该先找一个优势标"
     "签，还是先把事情都列出来。"),
    ("Bob", "Alice",
     "小组讨论时把大家七嘴八舌的意见理清楚，或者把一份 PPT 讲明白，这些也能算"
     "具体事例吧。不用一上来就找什么惊天动地的大项目。"),
    ("Carol", "Alice",
     "订场地还真不只是打个电话。查信息、比方案、凑齐大家的时间……实际做过哪些"
     "就记哪些，拆开看也干了不少活。总比对着“我的优势”四个字发呆强。"),
    ("甲导师", "Alice",
     "先列事情，再归纳能力。课程、小组作业、爱好里长期投入或解决过问题的部分"
     "，都可以放进清单。这个清单可以宽一些，最后写进哪份简历，再看经历和岗位"
     "的关系。"),
  ],
  # Thread #12: 经历列了一页，还是不知道适合投什么岗位
  [
    ("Alice", None,
     "把课程、活动、爱好盘了一遍，列出不少事情，可打开招聘软件还是不知道适合"
     "投什么。就算和岗位要求对上几条，也会看到不少自己没有的能力。这份经历清"
     "单接下来应该怎么用？"),
    ("甲导师", "Alice",
     "选一个想了解的岗位，把招聘要求拆开，左边写它需要什么，右边写你哪段经历"
     "能对应。也可以从自己具体会做的事去搜相关职业，看看从业者每天做什么、需"
     "要哪些技能。对得上的部分，用实际经历说明；缺的部分，看看能不能通过小项"
     "目或学习补上。这样你会更清楚自己为什么投这个岗位，以及还需要准备什么。"),
    ("Alice", "甲导师",
     "这张对照表面试时怎么讲比较自然啊？总不能“您要这条，我有这条”挨个念吧，"
     "怕最后还是变成朗读简历。"),
    ("甲导师", "Alice",
     "面试时可以先说和岗位的契合点，再用经历展开：当时做什么、采取了什么行动"
     "、带来了什么结果。重点是让面试官理解这些经验能怎样用于岗位，而不只是重"
     "复“我有某项能力”。"),
  ],
  # Thread #13: AI 把简历改得很漂亮，但越来越不像我写的
  [
    ("Alice", None,
     "让 AI 改简历，它给了一大版修改稿，看着专业，但我说不清为什么这样改。尤"
     "其总建议量化贡献，我又没想到有什么数字能写。直接用不踏实，自己改也不知"
     "道从哪儿下手，怎么才能保留对内容的判断？"),
    ("Bob", "Alice",
     "可以把自己做过的事告诉 AI，让它帮忙想想哪些数据值得回头查，但数字和描述"
     "都得自己核对。别改完简历，连自己都想问“这位厉害的人是谁”。"),
    ("甲导师", "Alice",
     "也可以换个用法：先让 AI 按章节提建议、解释理由，自己动手改。把目标岗位"
     "、实习还是全职、申请什么单位说清楚，再判断建议是否适合你。"),
    ("Alice", "甲导师",
     "我就是卡在它说什么都挺有道理。一边夸我，一边让我删，听得我都不知道这段"
     "到底该不该留了。怎么判断它给的理由靠不靠谱？"),
    ("Bob", "Alice",
     "让它把话说具体点：“不删会怎样？”“能不能换个写法？”多比较几个理由，别光"
     "听它夸。公司和岗位的事实还是查原始信息，这部分不能让它说了算。"),
  ],
  # Thread #14: 想换换脑子，分享几部适合大学阶段看的电影
  [
    ("Alice", None,
     "想分享三部电影：《三傻大闹宝莱坞》《白日梦想家》《时空恋旅人》。一个聊"
     "学习和选择，一个从想象走到行动，一个把注意力拉回普通的一天。比起再收藏"
     "一篇规划攻略，想先找一部完整看完。"),
    ("Bob", "Alice",
     "《三傻》光看名字，我还以为是纯喜剧。楼主说的学习和选择，具体是哪方面呀"
     "？"),
    ("Carol", "Alice",
     "加一部《爆裂鼓手》，不过想放松的话慎选，高压训练和导师关系都在里面了。"
     "挺想聊聊：做自己喜欢的事，愿意让它占掉生活的多少部分？"),
    ("Alice", "Bob",
     "比如按父母的期待读专业、被家庭压力压得很紧，或者一心盯着高分，这几种处"
     "境就挺熟悉的。喜剧归喜剧，里面聊的教育和选择也不是离我们很远。"),
    ("Bob", "Carol",
     "《爆裂鼓手》这个问题有点难答。我也会想，喜欢一件事，愿意为它付出到哪一"
     "步？好像不是一句“坚持热爱”就能讲完的。"),
  ],
  # Thread #15: 每天都在赶截止日期，自己的计划总是排到最后
  [
    ("Alice", None,
     "每天都有必须赶紧做的事。自己的计划总说等忙完再开始，但好像根本没有忙完"
     "的时候。那些不着急的目标该怎么放进生活？我连长期想做什么都没确定，也怕"
     "自己安排了半天，最后还是没有方向。"),
    ("Bob", "Alice",
     "先给今天的一件重要事留点时间也行。学技能、准备报告，总不能都等截止日期"
     "来敲门。全部排明白再开始，感觉又得等到下个星期。"),
    ("Alice", "Bob",
     "学技能、准备报告这种明确的事，我还知道怎么安排。最卡的是方向都没定，怕"
     "真空出一段时间，人坐好了，还是不知道该干嘛。"),
    ("甲导师", "Alice",
     "可以先选一个想加强的方向，安排短一些、能调整的行动。比如想提高沟通能力"
     "，就把这个月和不同背景的人交流作为尝试。经历多一点，再看下一阶段怎么调"
     "整。长期目标还没确定，也可以先做这一步。"),
  ],
]


if __name__ == "__main__":
  main()
