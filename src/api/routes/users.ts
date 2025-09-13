import { procedure, router } from "../trpc";
import { z } from "zod";
import Role, {
  AllRoles,
  RoleProfiles,
  isPermitted,
  zRoles,
} from "../../shared/Role";
import db from "../database/db";
import { Op, Transaction } from "sequelize";
import { authUser } from "../auth";
import User, {
  isAcceptedMentee,
  zMinUser,
  zUser,
  zUserWithMergeInfo,
} from "../../shared/User";
import { zUserFilter } from "../../shared/UserFilter";
import {
  defaultMentorCapacity,
  zMentorPreference,
  zUserPreference,
} from "../../shared/UserPreference";
import {
  compareChinese,
  formatUserName,
  isValidChineseName,
  isValidEmail,
  toPinyin,
} from "../../shared/strings";
import {
  generalBadRequestError,
  noPermissionError,
  notFoundError,
} from "../errors";
import { zInterviewType } from "../../shared/InterviewType";
import {
  minUserAttributes,
  userAttributes,
  userInclude,
} from "../database/models/attributesAndIncludes";
import { getCalibrationAndCheckPermissionSafe } from "./calibrations";
import sequelize from "../database/sequelize";
import { zMenteeStatus } from "../../shared/MenteeStatus";
import { zMinUserAndProfile, zUserProfile } from "../../shared/UserProfile";
import { zDateColumn } from "../../shared/DateColumn";
import { getUser2MentorshipCount } from "./mentorships";
import { zUserState } from "../../shared/UserState";
import { invalidateUserCache } from "../../pages/api/auth/[...nextauth]";
import { zTraitsPreference } from "../../shared/Traits";

const create = procedure
  .use(authUser("UserManager"))
  .input(
    z.object({
      name: z.string(),
      phone: z.string().nullable(),
      email: z.string().nullable(),
      wechatUnionId: z.string().nullable(),
      roles: zRoles,
    }),
  )
  .mutation(async ({ input: { name, phone, email, wechatUnionId, roles } }) => {
    if (!phone && !email) {
      throw generalBadRequestError("手机号或邮箱是必填的。");
    }

    await sequelize.transaction(async (transaction) => {
      await db.User.create(
        {
          roles,
          phone,
          wechatUnionId,
          ...(await checkAndComputeUserFields({
            email,
            name,
            isVolunteer: isPermitted(roles, "Volunteer"),
            oldUrl: null,
            transaction,
          })),
        },
        { transaction },
      );
    });
  });

/**
 * Returned users are ordered by Pinyin.
 */
const list = procedure
  .use(
    authUser([
      "UserManager",
      "GroupManager",
      "MentorshipManager",
      "MentorshipOperator",
    ]),
  )
  .input(zUserFilter)
  .output(z.array(zUserWithMergeInfo))
  .query(async ({ ctx: { me }, input: filter }) => {
    if (
      (filter.includeMerged === true || filter.returnMergeInfo === true) &&
      !isPermitted(me.roles, "UserManager")
    ) {
      throw noPermissionError(
        "数据",
        "`includeMerged` or `returnMergeInfo` user filter",
      );
    }

    // Force type checking.
    const volunteer: Role = "Volunteer";

    return await db.User.findAll({
      order: [["pinyin", "ASC"]],

      attributes: [
        ...userAttributes,
        ...(filter.returnMergeInfo === true ? ["wechatUnionId"] : []),
      ],

      include: [
        ...userInclude,
        ...(filter.returnMergeInfo === true
          ? [
              {
                association: "mergedToUser",
                attributes: minUserAttributes,
              },
            ]
          : []),
      ],

      where: {
        ...(filter.includeMerged === true
          ? {}
          : {
              mergedTo: { [Op.eq]: null },
            }),

        ...(filter.includeNonVolunteers === true
          ? {}
          : {
              roles: { [Op.contains]: [volunteer] },
            }),

        ...(filter.containsRoles === undefined
          ? {}
          : {
              [Op.and]: filter.containsRoles.map((r) => ({
                roles: { [Op.contains]: [r] },
              })),
            }),

        ...(filter.menteeStatus === undefined
          ? {}
          : {
              menteeStatus: filter.menteeStatus,
            }),

        ...(filter.pointOfContactId === undefined
          ? {}
          : {
              pointOfContactId: filter.pointOfContactId,
            }),

        ...(filter.matchesNameOrEmail === undefined
          ? {}
          : {
              [Op.or]: [
                { pinyin: { [Op.iLike]: `%${filter.matchesNameOrEmail}%` } },
                { name: { [Op.iLike]: `%${filter.matchesNameOrEmail}%` } },
                { email: { [Op.iLike]: `%${filter.matchesNameOrEmail}%` } },
              ],
            }),
      },
    });
  });

const zListMentorsOutput = z.array(
  zMinUserAndProfile.merge(
    z.object({
      // relational == true if and only if the mentor's roles don't include
      // TransactionalMentor and the mentor's capacity is not exhausted.
      relational: z.boolean(),
      traitsPreference: zTraitsPreference.nullable(),
    }),
  ),
);
export type ListMentorsOutput = z.infer<typeof zListMentorsOutput>;

const listMentorsRoute = procedure
  .use(authUser())
  .output(zListMentorsOutput)
  .query(async ({ ctx: { me } }) => {
    if (
      !isAcceptedMentee(me.roles, me.menteeStatus, true) &&
      !isPermitted(me.roles, [
        "Mentor",
        "MentorshipManager",
        "MentorshipOperator",
      ])
    ) {
      throw noPermissionError("导师");
    }
    return await listMentors();
  });

export async function listMentors(): Promise<ListMentorsOutput> {
  // Force type check
  const mentorRole: Role = "Mentor";
  const users = await db.User.findAll({
    where: { roles: { [Op.contains]: [mentorRole] } },
    attributes: [...minUserAttributes, "roles", "preference", "profile"],
  });

  const user2mentorships = await getUser2MentorshipCount();

  return users.map((u) => {
    const transactional = u.roles.includes("TransactionalMentor");
    const cap = transactional
      ? 0
      : (u.preference?.mentor?.最多匹配学生 ?? defaultMentorCapacity) -
        (user2mentorships[u.id] ?? 0);

    return {
      user: u,
      profile: u.profile ?? {},
      relational: cap > 0,
      traitsPreference: u.preference?.mentor?.学生特质 ?? null,
    };
  });
}

const zListMentorStatsOutput = z.array(
  z.object({
    user: zUser,
    mentorships: z.number(),
    preference: zMentorPreference,
    profile: zUserProfile,
  }),
);
export type ListMentorStatsOutput = z.infer<typeof zListMentorStatsOutput>;

/**
 * Compared to listMentorsRoute, this route is restricted to MentorshipManager
 * access.
 */
const listMentorStatsRoute = procedure
  .use(authUser(["MentorshipManager", "MentorshipOperator"]))
  .output(zListMentorStatsOutput)
  .query(listMentorStats);

export async function listMentorStats(): Promise<ListMentorStatsOutput> {
  // Force type check
  const mentorRole: Role = "Mentor";
  const users = await db.User.findAll({
    where: { roles: { [Op.contains]: [mentorRole] } },
    attributes: [...userAttributes, "profile", "preference"],
    include: userInclude,
  });

  const user2mentorships = await getUser2MentorshipCount();
  const ret = users.map((u) => ({
    user: u,
    mentorships: user2mentorships[u.id] ?? 0,
    preference: u.preference?.mentor ?? {},
    profile: u.profile ?? {},
  }));

  ret.sort((a, b) => compareChinese(a.user.name, b.user.name));
  return ret;
}

const listVolunteers = procedure
  .use(authUser(["Volunteer"]))
  .output(
    z.array(
      zMinUserAndProfile.merge(
        z.object({
          likes: z.number(),
          kudos: z.number(),
          updatedAt: zDateColumn,
        }),
      ),
    ),
  )
  .query(async () => {
    // Force type check
    const volunteerRole: Role = "Volunteer";
    return (
      await db.User.findAll({
        where: { roles: { [Op.contains]: [volunteerRole] } },
        attributes: [
          ...minUserAttributes,
          "roles",
          "profile",
          "updatedAt",
          "likes",
          "kudos",
        ],
      })
    ).map((u) => ({
      user: u,
      profile: u.profile ?? {},
      updatedAt: u.updatedAt,
      likes: u.likes ?? 0,
      kudos: u.kudos ?? 0,
    }));
  });

/**
 * Given foo.bar@gmail.com, return f******@gmail.com
 */
export function redactEmail(email: string): string {
  return email.replace(/^(.)(.+)(@.*)$/, (match, first, rest, domain) => {
    return `${first}${"*".repeat(rest.length)}${domain}`;
  });
}

/**
 * Only selected fields in the User object are respected. See code for details.
 */
const update = procedure
  .use(authUser())
  .input(
    zUser.merge(
      z.object({
        wechatUnionId: z.string().nullish(),
      }),
    ),
  )
  .mutation(async ({ input, ctx: { me } }) => {
    await sequelize.transaction(async (transaction) => {
      const user = await db.User.findByPk(input.id, {
        attributes: ["id", "roles", "url", "name"],
        transaction,
      });
      if (!user) {
        throw notFoundError("用户", input.id);
      }

      const isUserManager = isPermitted(me.roles, "UserManager");
      if (!isUserManager) {
        // Non-UserManagers can only update their own profile.
        if (me.id !== input.id) {
          throw noPermissionError("用户", input.id);
        }

        const rolesToAdd = input.roles.filter((r) => !user.roles.includes(r));
        const rolesToRemove = user.roles.filter(
          (r) => !input.roles.includes(r),
        );
        if ([...rolesToAdd, ...rolesToRemove].length) {
          throw noPermissionError("用户", input.id);
        }
      }

      // Only check Chinese name when updating name. Allow invalid names created
      // during sign-in to be carried over. See createUser.
      if (user.name !== input.name && !isValidChineseName(input.name)) {
        throw generalBadRequestError("中文姓名无效。");
      }

      await user.update(
        {
          wechat: input.wechat,

          ...(await checkAndComputeUserFields({
            email: input.email,
            name: input.name,
            isVolunteer: isPermitted(input.roles, "Volunteer"),
            oldUrl: user.url,
            url: input.url,
            transaction,
          })),

          // fields that only UserManagers can change
          ...(isUserManager && {
            roles: input.roles,
            email: input.email,
            phone: input.phone,
            wechatUnionId: input.wechatUnionId,
          }),
        },
        { transaction },
      );

      invalidateUserCache(user.id);
    });
  });

const setUserPreference = procedure
  .use(authUser())
  .input(
    z.object({
      userId: z.string(),
      preference: zUserPreference,
    }),
  )
  .mutation(async ({ ctx: { me }, input: { userId, preference } }) => {
    if (me.id !== userId && !isPermitted(me.roles, "UserManager")) {
      throw noPermissionError("用户", userId);
    }

    const [cnt] = await db.User.update(
      { preference },
      {
        where: { id: userId },
      },
    );
    if (cnt == 0) throw notFoundError("用户", userId);
  });

const setMenteeStatus = procedure
  .use(authUser("MentorshipManager"))
  .input(
    z.object({
      userId: z.string(),
      menteeStatus: zMenteeStatus.nullable(),
    }),
  )
  .mutation(async ({ input: { userId, menteeStatus } }) => {
    const [cnt] = await db.User.update(
      { menteeStatus },
      {
        where: { id: userId },
      },
    );
    if (cnt == 0) throw notFoundError("用户", userId);
    invalidateUserCache(userId);
  });

const get = procedure
  .use(authUser())
  .input(z.string())
  .output(zMinUser)
  .query(async ({ ctx: { me }, input: userId }) => {
    return await sequelize.transaction(async (transaction) => {
      if (
        me.id !== userId &&
        !isPermitted(me.roles, "UserManager") &&
        !(await isPermittedtoAccessMentor(me, userId, transaction)) &&
        !(await isPermittedtoAccessMentee(
          me,
          userId,
          transaction,
          "readMetadata",
        ))
      ) {
        throw noPermissionError("用户", userId);
      }

      const u = await db.User.findByPk(userId, {
        attributes: minUserAttributes,
        transaction,
      });

      if (!u) throw notFoundError("用户", userId);
      return u;
    });
  });

/**
 * TODO: Remove this route. Use routes that returns more specific data instead.
 * Also, the session user already has full information.
 */
const getFull = procedure
  .use(authUser())
  .input(z.string())
  .output(zUser)
  .query(async ({ ctx: { me }, input: userId }) => {
    if (me.id !== userId && !isPermitted(me.roles, "UserManager")) {
      throw noPermissionError("用户", userId);
    }

    const u = await db.User.findByPk(userId, {
      attributes: userAttributes,
      include: userInclude,
    });

    if (!u) throw notFoundError("用户", userId);
    return u;
  });

const getUserPreference = procedure
  .use(authUser())
  .input(
    z.object({
      userId: z.string(),
    }),
  )
  .output(zUserPreference)
  .query(async ({ ctx: { me }, input: { userId } }) => {
    if (me.id !== userId && !isPermitted(me.roles, "UserManager")) {
      throw noPermissionError("用户", userId);
    }

    const user = await db.User.findByPk(userId, {
      attributes: ["preference"],
    });

    if (!user) throw notFoundError("用户", userId);
    return user.preference || {};
  });

const getMentorTraitsPref = procedure
  .use(authUser())
  .input(
    z.object({
      userId: z.string(),
    }),
  )
  .output(zTraitsPreference.nullable())
  .query(async ({ input: { userId } }) => {
    const user = await db.User.findByPk(userId, {
      attributes: ["preference"],
    });

    if (!user) throw notFoundError("用户", userId);
    return user.preference?.mentor?.学生特质 ?? null;
  });

/**
 * Query users using either userId or userUrl but not both
 */
const getUserProfile = procedure
  .use(authUser())
  .input(
    z.object({
      userId: z.string().optional(),
      userUrl: z.string().optional(),
    }),
  )
  .output(
    zMinUserAndProfile.merge(
      z.object({
        isMentor: z.boolean(),
        likes: z.number(),
        kudos: z.number(),
      }),
    ),
  )
  .query(async ({ ctx: { me }, input: { userId, userUrl } }) => {
    if (!!userId === !!userUrl) {
      throw generalBadRequestError(
        "Must provide either userId or userUrl and not both.",
      );
    }

    const attributes = [
      ...minUserAttributes,
      "menteeStatus",
      "roles",
      "profile",
      "likes",
      "kudos",
    ];
    const u = userId
      ? await db.User.findByPk(userId, { attributes })
      : await db.User.findOne({ where: { url: userUrl }, attributes });

    if (!u) throw notFoundError("用户", userId || userUrl || "");

    /**
     * N.B. Update /who-can-see-my-data when changing permission here.
     */

    if (
      me.id !== u.id &&
      // These roles can access profiles of all the users
      !isPermitted(me.roles, ["Mentor", "MentorshipManager", "UserManager"]) &&
      // Volunteers who are not in the roles above can only access other
      // volunteers profiles
      !(
        isPermitted(me.roles, "Volunteer") && isPermitted(u.roles, "Volunteer")
      ) &&
      // Accepted mentoees can only access mentor profiles
      !(
        isAcceptedMentee(me.roles, me.menteeStatus, true) &&
        isPermitted(u.roles, "Mentor")
      )
    ) {
      throw noPermissionError("用户", u.id);
    }

    return {
      user: u,
      profile: u.profile ?? {},
      isMentor: isPermitted(u.roles, "Mentor"),
      likes: u.likes ?? 0,
      kudos: u.kudos ?? 0,
    };
  });

const setUserProfile = procedure
  .use(authUser())
  .input(
    z.object({
      userId: z.string(),
      profile: zUserProfile,
    }),
  )
  .mutation(async ({ ctx: { me }, input: { userId, profile } }) => {
    if (me.id !== userId && !isPermitted(me.roles, "UserManager")) {
      throw noPermissionError("用户", userId);
    }

    const [cnt] = await db.User.update({ profile }, { where: { id: userId } });
    if (cnt == 0) throw notFoundError("用户", userId);
  });

const getUserState = procedure
  .use(authUser())
  .input(
    z
      .object({
        userId: z.string(),
      })
      .optional(),
  )
  .output(zUserState)
  .query(async ({ ctx: { me }, input }) => {
    const userId = input?.userId ?? me.id;
    if (
      userId !== me.id &&
      !isPermitted(me.roles, [
        "UserManager",
        "MentorshipManager",
        "MentorshipOperator",
      ])
    ) {
      throw noPermissionError("用户", userId);
    }

    const u = await db.User.findByPk(userId, {
      attributes: ["state"],
    });

    if (!u) throw notFoundError("用户", userId);
    return u.state ?? {};
  });

/**
 * Fields absent from the input are not updated.
 */
const setUserState = procedure
  .use(authUser())
  .input(zUserState.partial())
  .mutation(async ({ ctx: { me }, input: state }) => {
    await sequelize.transaction(async (transaction) => {
      const u = await db.User.findByPk(me.id, {
        attributes: ["id", "state"],
        transaction,
      });
      if (!u) throw notFoundError("用户", me.id);

      await u.update(
        {
          state: {
            ...u.state,
            ...state,
          },
        },
        { transaction },
      );
    });
  });

const setPointOfContactAndNote = procedure
  .use(authUser(["MentorshipManager", "MentorshipOperator"]))
  .input(
    z.object({
      userId: z.string(),
      pocId: z.string().optional(),
      pocNote: z.string().optional(),
    }),
  )
  .mutation(async ({ input: { userId, pocId, pocNote } }) => {
    if (pocId === undefined && pocNote === undefined) {
      throw generalBadRequestError("One of pocId and pocNote must be set");
    }

    const [cnt] = await db.User.update(
      {
        ...(pocId !== undefined ? { pointOfContactId: pocId } : {}),
        ...(pocNote !== undefined ? { pointOfContactNote: pocNote } : {}),
      },
      { where: { id: userId } },
    );
    if (cnt == 0) throw notFoundError("用户", userId);
    invalidateUserCache(userId);
  });

/**
 * Only MentorshipManager, MentorshipOperator, mentor of the applicant,
 * interviewers of the applicant, participants of the calibration (only if the
 * calibration is active), and the user themselves are allowed to call this
 * route.
 *
 * If the user is not an MentorshipManager, MentorshipOperator or the user being
 * requested, contact information is redacted.
 */
const getApplicant = procedure
  .use(authUser())
  .input(
    z.object({
      userId: z.string(),
      type: zInterviewType,
    }),
  )
  .output(
    z.object({
      user: zUser,
      sex: z.string().nullable(),
      application: z.record(z.string(), z.any()).nullable(),
    }),
  )
  .query(async ({ ctx: { me }, input: { userId, type } }) => {
    return await sequelize.transaction(async (transaction) => {
      const isMentee = type == "MenteeInterview";

      const user = await db.User.findByPk(userId, {
        attributes: [
          ...userAttributes,
          isMentee ? "menteeApplication" : "volunteerApplication",
          "profile",
        ],
        include: userInclude,
        transaction,
      });
      if (!user) throw notFoundError("用户", userId);

      const application = isMentee
        ? user.menteeApplication
        : user.volunteerApplication;
      const sex = user.profile?.性别 ?? null;

      const ret = {
        user,
        application,
        sex,
      };

      if (
        me.id === userId ||
        isPermitted(me.roles, ["MentorshipManager", "MentorshipOperator"])
      ) {
        return ret;
      }

      // Redact
      user.email = "redacted@redacted.com";
      user.wechat = "redacted";

      // Check if the user is a mentor of the mentee
      if (
        isMentee &&
        (await isPermittedtoAccessMentee(me, userId, transaction))
      ) {
        return ret;
      }

      // Check if the user is an interviewer
      const myInterviews = await db.Interview.findAll({
        where: {
          type,
          intervieweeId: userId,
        },
        attributes: [],
        include: [
          {
            model: db.InterviewFeedback,
            attributes: [],
            where: { interviewerId: me.id },
          },
        ],
        transaction,
      });
      if (myInterviews.length) return ret;

      // Check if the user is a calibration participant
      const allInterviews = await db.Interview.findAll({
        where: {
          type: type,
          intervieweeId: userId,
        },
        attributes: ["calibrationId"],
        transaction,
      });
      for (const i of allInterviews) {
        if (
          i.calibrationId &&
          (await getCalibrationAndCheckPermissionSafe(
            me,
            i.calibrationId,
            transaction,
          ))
        )
          return ret;
      }

      throw noPermissionError("申请表", user.id);
    });
  });

/**
 * TODO: Support etag. Refer to `interviewFeedbacks.update`.
 */
const setApplication = procedure
  .use(authUser("MentorshipManager"))
  .input(
    z.object({
      userId: z.string(),
      type: zInterviewType,
      application: z.record(z.string(), z.any()),
    }),
  )
  .mutation(async ({ input }) => {
    const [cnt] = await db.User.update(
      {
        [input.type == "MenteeInterview"
          ? "menteeApplication"
          : "volunteerApplication"]: input.application,
      },
      { where: { id: input.userId } },
    );
    if (!cnt) throw notFoundError("用户", input.userId);
  });

/**
 * List all users and their roles who have privileged user data access.
 * See RoleProfile.privilegeUserDataAccess for an explanation.
 */
const listPriviledgedUserDataAccess = procedure
  .use(authUser())
  .output(
    z.array(
      z.object({
        name: z.string().nullable(),
        roles: zRoles,
      }),
    ),
  )
  .query(async () => {
    return await db.User.findAll({
      // TODO: Optimize with postgres `?|` operator
      where: {
        [Op.or]: AllRoles.filter(
          (r) => RoleProfiles[r].privilegedUserDataAccess,
        ).map((r) => ({
          roles: { [Op.contains]: [r] },
        })),
      },
      attributes: ["name", "roles"],
    });
  });

const destroy = procedure
  .use(authUser("UserManager"))
  .input(
    z.object({
      id: z.string(),
    }),
  )
  .mutation(async ({ input }) => {
    await sequelize.transaction(async (transaction) => {
      const user = await db.User.findByPk(input.id, { transaction });
      if (!user) throw notFoundError("用户", input.id);
      await user.destroy({ transaction });
    });
    invalidateUserCache(input.id);
  });

export default router({
  create,
  get,
  getFull,
  list,
  listPriviledgedUserDataAccess,
  listVolunteers,
  listMentors: listMentorsRoute,
  listMentorStats: listMentorStatsRoute,
  getMentorTraitsPref,

  update,
  setMenteeStatus,
  destroy,

  getApplicant,
  setApplication,

  getUserProfile,
  setUserProfile,

  getUserState,
  setUserState,

  setUserPreference,
  getUserPreference,

  setPointOfContactAndNote,
});

function isValidUserUrl(url: string) {
  return /^[a-z0-9]+$/.test(url);
}

/**
 * @param email Set to undefined to omit it in the output.
 * @param name Set to undefined to omit it in the output.
 * @param url Set to null or undefined to auto generate the url or inherit the
 * old url if `oldUrl` is not null.
 */
export async function checkAndComputeUserFields({
  email,
  name,
  isVolunteer,
  url,
  oldUrl,
  transaction,
}: {
  email?: string | null;
  name?: string | null;
  isVolunteer: boolean;
  url?: string | null;
  oldUrl: string | null;
  transaction: Transaction;
}): Promise<{
  email?: string | null;
  name?: string | null;
  pinyin?: string | null;
  url?: string | null;
}> {
  /**
   * We don't check Chinese name validity here, because the user
   * may be automatically created via WeChat sign-in or application form
   * submission. We simply can't enforce Chinese names in these cases without
   * breaking the workflow.
   */

  if (email && !isValidEmail(email)) {
    throw generalBadRequestError("Email地址无效。");
  }

  return {
    ...(name !== undefined && {
      name,
      pinyin: name === null ? null : toPinyin(name),
    }),
    ...(email !== undefined && { email: email?.toLowerCase() ?? null }),
    ...(await checkAndComputeUrl(name, isVolunteer, oldUrl, url, transaction)),
  };

  async function checkAndComputeUrl(
    name: string | null | undefined,
    isVolunteer: boolean,
    oldUrl: string | null,
    url: string | null | undefined,
    transaction: Transaction,
  ): Promise<{
    url?: string | null;
  }> {
    if (url !== undefined && url !== null) {
      if (!isValidUserUrl(url)) {
        throw generalBadRequestError(
          "用户URL格式无效。只允许小写英文字母和数字。",
        );
      }

      if (url === oldUrl) {
        // Nothing is changing
        return {};
      } else if (!isVolunteer) {
        // Only volunteers are allowed to set urls
        throw generalBadRequestError(
          `非${RoleProfiles.Volunteer.displayName}` + "没有设置URL的权限。",
        );
      } else {
        if (await db.User.count({ where: { url: url }, transaction })) {
          throw generalBadRequestError("此用户URL已被注册。");
        }
        return { url: url };
      }
    } else if (oldUrl !== null) {
      // Retain the old url if it's already set
      return {};
    } else if (!isVolunteer) {
      // Only populate urls for volutneers
      return {};
    } else {
      // Auto generate an url
      const base = name
        ? toPinyin(formatUserName(name, "friendly"))
        : "anonymous";

      let suffix = 1;
      const getNextUrl = () => {
        const ret = base + (suffix == 1 ? "" : `${suffix}`);
        suffix++;
        return ret;
      };

      while (true) {
        const url = getNextUrl();
        if ((await db.User.count({ where: { url }, transaction })) === 0) {
          return { url };
        }
      }
    }
  }
}

export async function checkPermissionToAccessMentee(
  me: User,
  menteeId: string,
  transaction: Transaction,
  action: "any" | "readMetadata" = "any",
) {
  if (!(await isPermittedtoAccessMentee(me, menteeId, transaction, action))) {
    throw noPermissionError("学生", menteeId);
  }
}

/**
 * Metadata is data about the mentee and their mentoerships, but not the actual
 * conversation or notes contents between the mentee and their mentors.
 */
export async function isPermittedtoAccessMentee(
  me: User,
  menteeId: string,
  transaction: Transaction,
  action: "any" | "readMetadata" = "any",
) {
  return (
    isPermitted(me.roles, "MentorshipManager") ||
    (action === "readMetadata" &&
      isPermitted(me.roles, "MentorshipOperator")) ||
    (await db.Mentorship.count({
      where: { mentorId: me.id, menteeId },
      transaction,
    })) > 0
  );
}

export async function isPermittedtoAccessMentor(
  me: User,
  mentorId: string,
  transaction: Transaction,
) {
  return (
    (await db.Mentorship.count({
      where: { mentorId, menteeId: me.id },
      transaction,
    })) > 0
  );
}
