import { createContext, useContext } from "react";
import User from "./shared/User";

// TODO: Directly wrap session user
const UserContext = createContext<[User, (u: User) => void]>([
  // @ts-expect-error
  null,
  () => {},
]);
export default UserContext;

export const useUserContext = () => useContext(UserContext);
