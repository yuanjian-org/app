import { trpcNext } from "../../trpc";
import Loader from "components/Loader";
import { parseQueryString } from "shared/strings";
import { useRouter } from "next/router";
import UserPanel from "components/UserPanel";

export default function Page() {
  const userId = parseQueryString(useRouter(), "userId");
  const { data } = trpcNext.users.getUserProfile.useQuery(
    { userId },
    {
      enabled: !!userId,
    },
  );
  return data ? (
    <UserPanel data={data} showBookingButton={data.isMentor} />
  ) : (
    <Loader />
  );
}
Page.title = "用户资料";
