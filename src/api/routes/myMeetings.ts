import { procedure, router } from "../tServer";
import { z } from "zod";
import auth from "../auth";
import GroupUser from "../database/models/GroupUser";
import { Op } from "sequelize";
import Group from "../database/models/Group";
import User from "../database/models/User";
import PublicUser from "../../shared/publicModels/PublicUser";
import { presentPublicGroup } from "../../shared/publicModels/PublicGroup";
import invariant from "tiny-invariant";
import { createMeeting } from "../tencentMeeting";

function isSubset<T>(superset: Set<T>, subset: Set<T>): boolean {
  for (const item of subset) {
    if (!superset.has(item)) {
      return false;
    }
  }
  return true;
}
/*
{
  "meeting_number": 1,
  "meeting_info_list": [
    {
      "subject": "test meeting ts4",
      "meeting_id": "8920608318088532478",
      "meeting_code": "123371270",
      "type": 1,
      "join_url": "https://meeting.tencent.com/dm/49fYCUGV0YHe",
      "hosts": [
        {
          "userid": "1764d9d81a924fdf9269b7a54e519f30"
        }
      ],
      "start_time": "1683093659",
      "end_time": "1683136859",
      "settings": {
        "mute_enable_join": true,
        "allow_unmute_self": true,
        "mute_all": true,
        "mute_enable_type_join": 1
      },
      "meeting_type": 0,
      "enable_live": false,
      "media_set_type": 0,
      "location": "",
      "host_key": "123456"
    }
  ]
}*/

const hostSchema = z.object({
  userid: z.string(),
});

const settingsSchema = z.object({
  mute_enable_join: z.boolean(),
  allow_unmute_self: z.boolean(),
  mute_all: z.boolean(),
  mute_enable_type_join: z.number(),
});

const meetingInfoSchema = z.object({
  subject: z.string(),
  meeting_id: z.string(),
  meeting_code: z.string(),
  type: z.number(),
  join_url: z.string().url(),
  hosts: z.array(hostSchema),
  start_time: z.string(),
  end_time: z.string(),
  settings: settingsSchema,
  meeting_type: z.number(),
  enable_live: z.boolean(),
  media_set_type: z.number(),
  location: z.string(),
  host_key: z.string().optional(),
});

const createMeetingReturnSchema = z.object({
  meeting_number: z.number(),
  meeting_info_list: z.array(meetingInfoSchema),
});

const myMeetings = router({
  generateMeetingLink: procedure.use(
    auth('my-meetings:create')
  ).input(z.object({
    groupId: z.string(),
  })).mutation(async ({ input, ctx }) => {
    const group = await Group.findByPk(input.groupId, {
      include: {
        model: User,
      }
    });
    invariant(group);

    if (group.meetingLink) {
      return group.meetingLink;
    }

    const now = Math.floor(Date.now() / 1000);
    const resText = await createMeeting(
      "Meeting of " + group.users.map(u => u.name).join(', '),
      now,
      now + 3600,
      "scheduled"
    );

    console.log(resText);

    const obj = createMeetingReturnSchema.parse(JSON.parse(resText));
    invariant(obj.meeting_info_list.length === 1);

    const meetingLink = obj.meeting_info_list[0].join_url;

    await Group.update({
      meetingLink,
    }, {
      where: {
        id: group.id,
      }
    });

    return meetingLink;
  }),

  list: procedure.use(
    auth('my-meetings:read')
  ).input(z.object({
  })).query(async ({ input, ctx }) => {

    const email = ctx.email;

    const user = await User.findOne({
      where: {
        email,
      }
    });

    invariant(user);

    const groupUserList = await GroupUser.findAll({
      where: {
        userId: user.id
      },
    });

    const userIdSet = new Set([user.id]);

    const groupList = (await Group.findAll({
      include: {
        model: User,
      },
      where: {
        id: {
          [Op.in]: groupUserList.map(gu => gu.groupId),
        }
      }
    })).filter(g => {
      console.log('comparing', new Set(g.users.map(u => u.id)),
        userIdSet);
      return isSubset(
        new Set(g.users.map(u => u.id)),
        userIdSet
      );
    });

    // console.log('result', groupList);

    const userMap = {} as Record<string, PublicUser>;
    for (const g of groupList) {
      g.users.forEach(u => {
        if (!userMap[u.id]) {
          userMap[u.id] = u;
        }
      });
    }

    return {
      groupList: groupList.map(presentPublicGroup),
      userMap,
    };
  }),
});

export default myMeetings;
