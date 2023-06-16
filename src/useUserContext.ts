import { createContext, useContext } from "react";
import { IUser } from "./shared/user";

// @ts-ignore
export const UserContext = createContext<[IUser, (u: IUser) => void]>(null);

const useUserContext = () => useContext(UserContext);

export default useUserContext;
