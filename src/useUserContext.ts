import { createContext, useContext } from "react";
import UserProfile from "./shared/UserProfile";

// @ts-ignore
export const UserContext = createContext<[UserProfile, (u: UserProfile) => void]>(null);

const useUserContext = () => useContext(UserContext);

export default useUserContext;
