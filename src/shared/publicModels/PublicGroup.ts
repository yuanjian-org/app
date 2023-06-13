interface PublicGroup {
  id: string;
  meetingLink: string;
  userIdList: string[];
}

export default PublicGroup;

import type Group from '../../api/database/models/Group';
export const presentPublicGroup = (g: Group) => {
  return {
    id: g.id,
    userIdList: g.users.map(gu => gu.id),
    meetingLink: g.meetingLink
  } as PublicGroup;
};