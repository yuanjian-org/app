/**
 * TODO move rename folder `database` to `db`, rename this file to `db/index.ts`. Register all the models in this file.
 */
import User from "./models/User";
import Group from "./models/Group";
import GroupUser from "./models/GroupUser";
import Transcript from "./models/Transcript";
import Summary from "./models/Summary";
import OngoingMeetingCount from "./models/OngoingMeetingCount";
import Partnership from './models/Partnership';

const db = {
  Partnership,
  User,
  Group, 
  GroupUser, 
  Transcript, 
  Summary, 
  OngoingMeetingCount,
};

export default db;
