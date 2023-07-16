import { createContext, useContext } from "react";
import UserProfile from "./shared/UserProfile";

const UserContext = createContext<[UserProfile, (u: UserProfile) => void]>([
  // @ts-ignore
  null, 
  () => {},
]);
export default UserContext;

export const useUserContext = () => useContext(UserContext);

