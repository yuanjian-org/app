import { Role } from "./roles";

// TODO: Rename to `User`
export interface IUser {
  id: string;

  // Obtained from the database, not authing.cn.
  name: string;
  
  pinyin: string;

  // Obtained from the database, not authing.cn.
  // Whene creating a user, we sync it from authing.cn into the db.
  email: string;

  roles: Role[];

  // Obtained from authing.cn
  clientId: string; 
}
