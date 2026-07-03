import { trpcNext } from "../../trpc";
import { parseQueryString } from "shared/strings/parseQueryString";
import { useRouter } from "next/router";
import UserPanel, { UserDisplayData } from "components/UserPanel";
import { Card, CardBody } from "@chakra-ui/react";
import PageLoader from "components/PageLoader";

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
    <PageLoader />
  );
}
