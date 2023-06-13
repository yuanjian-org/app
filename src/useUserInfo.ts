import { createContext, useContext } from "react";
import { IYuanjianUser } from "./shared/user";

// TODO: Fix me
// @ts-ignore
export const UserInfoContext = createContext<IYuanjianUser>(null);

const useUserInfo = () => {
  return useContext(UserInfoContext);
};

export default useUserInfo;
