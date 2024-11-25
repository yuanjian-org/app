import { trpcNext } from "../trpc";
import {
  parseQueryStringOrUnknown
} from 'shared/strings';
import { useRouter } from 'next/router';
import { UserPage } from "./users/[userId]";

export default function Page() {
  const userUrl = parseQueryStringOrUnknown(useRouter(), 'userUrl');
  const { data } = trpcNext.users.getUserProfile.useQuery({ userUrl });
  return <UserPage data={data} />;
}
Page.title = "用户资料";
