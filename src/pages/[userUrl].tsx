import { trpcNext } from "../trpc";
import {
  parseQueryString
} from 'shared/strings';
import { useRouter } from 'next/router';
import { UserPage } from "./users/[userId]";
import Loader from "components/Loader";

export default function Page() {
  const userUrl = parseQueryString(useRouter(), 'userUrl');
  const { data } = userUrl ?
    trpcNext.users.getUserProfile.useQuery({ userUrl }) : { data: undefined };
  return data ? <UserPage data={data} /> : <Loader />;
}
Page.title = "用户资料";
