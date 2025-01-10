import { trpcNext } from "../../trpc";
import Loader from 'components/Loader';
import { parseQueryString } from 'shared/strings';
import { useRouter } from 'next/router';
import UserPanel from "components/UserPanel";

export default function Page() {
  const userId = parseQueryString(useRouter(), 'userId');
  const { data } = userId ?
    trpcNext.users.getUserProfile.useQuery({ userId }) : { data: undefined };
  return data ? <UserPanel
    data={data}
    showBookingButton={data.isMentor}
    showMatchingTraits={false}
  /> : <Loader />;
}
Page.title = "用户资料";
