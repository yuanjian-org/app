import { createContext, useContext } from "react";
import IUser from "./shared/IUser";

// @ts-ignore
export const UserContext = createContext<[IUser, (u: IUser) => void]>(null);

const useUserContext = () => useContext(UserContext);

export default useUserContext;
