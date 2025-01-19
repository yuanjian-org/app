import { trpcNext } from "../trpc";
import {
  parseQueryString
} from 'shared/strings';
import { useRouter } from 'next/router';
import UserPanel from "components/UserPanel";
import Loader from "components/Loader";

export default function Page() {
  const userUrl = parseQueryString(useRouter(), 'userUrl');
  const { data } = trpcNext.users.getUserProfile.useQuery({ userUrl }, {
    enabled: !!userUrl,
  });
  return data ? <UserPanel
    data={data}
    showBookingButton={data.isMentor}
  /> : <Loader />;
}
Page.title = "用户资料";
