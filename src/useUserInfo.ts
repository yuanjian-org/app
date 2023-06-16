import { createContext, useContext } from "react";
import { IYuanjianUser } from "./shared/user";

// TODO: Fix me
// @ts-ignore

// Used userProp to pass down an state update function instead of just using IYuanjianuser
// This allows to also pass down a state management @updateUser 
interface userProp {
  user: IYuanjianUser;
  updateUser: (IYuanjianUser: IYuanjianUser) => void;
}

export const UserPropContext = createContext<userProp | null>(null);

const useUserInfo = () => {
  return useContext(UserPropContext) as userProp;
};

export default useUserInfo;
