import { trpcNext } from "../../trpc";
import { parseQueryString } from "shared/strings/parseQueryString";
import { useRouter } from "next/router";
import UserPanel from "components/UserPanel";
import { UserDisplayData } from "components/UserDisplayData";
import { Card, CardBody } from "@chakra-ui/react";
import Loader from "components/Loader";

export default function Page() {
  const userId = parseQueryString(useRouter(), "userId");
  const { data } = trpcNext.users.getUserProfile.useQuery(
    { userId },
    {
      enabled: !!userId,
    },
  );
  return <UserPage profile={data} />;
}
Page.title = "用户资料";

export function UserPage({
  profile,
}: {
  profile: (UserDisplayData & { isMentor: boolean }) | undefined;
}) {
  return profile ? (
    <Card>
      <CardBody>
        <UserPanel data={profile} showBookingButton={profile.isMentor} />
      </CardBody>
    </Card>
  ) : (
    <Loader />
  );
}
