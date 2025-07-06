import { Stack } from "@chakra-ui/react";
import { trpcNext } from "../../trpc";
import GroupBar from "components/GroupBar";
import { useRouter } from "next/router";
import { parseQueryString } from "shared/strings";
import Loader from "components/Loader";
import { paragraphSpacing, sectionSpacing } from "theme/metrics";
import Transcripts from "components/Transcripts";
import { isPermittedToAccessGroupHistory } from "shared/Group";
import useMe from "useMe";

export default function Page() {
  const router = useRouter();
  const me = useMe();
  const groupId = parseQueryString(router, "groupId");
  const { data: group } = trpcNext.groups.get.useQuery(groupId ?? "", {
    enabled: !!groupId,
  });

  return !group ? (
    <Loader />
  ) : (
    <Stack spacing={sectionSpacing}>
      <GroupBar
        group={group}
        showJoinButton
        showSelf
        abbreviateOnMobile={false}
        marginBottom={paragraphSpacing}
      />

      {isPermittedToAccessGroupHistory(me, group) && (
        <Transcripts group={group} />
      )}
    </Stack>
  );
}
