import { createContext, useContext } from "react";
import UserProfile from "./shared/UserProfile";

// @ts-ignore
const UserContext = createContext<[UserProfile, (u: UserProfile) => void]>(null);
export default UserContext;

export const useUserContext = () => useContext(UserContext);

