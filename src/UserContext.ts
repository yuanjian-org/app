import { createContext, useContext } from "react";
import User from "./shared/User";

const UserContext = createContext<[User, (u: User) => void]>([
  // @ts-ignore
  null, 
  () => {},
]);
export default UserContext;

export const useUserContext = () => useContext(UserContext);

