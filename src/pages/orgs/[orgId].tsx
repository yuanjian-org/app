import { useRouter } from "next/router";
import { trpcNext } from "trpc";
import { widePage } from "AppPage";
import useMe from "useMe";
import { isPermitted } from "shared/Role";
import { features } from "shared/Features";
import { OrgProfile } from "components/orgs/OrgProfile";
import Loader from "components/Loader";

export default widePage(() => {
  const router = useRouter();
  const orgId = router.query.orgId as string;
  const me = useMe();
  const {
    data: org,
    refetch,
    isLoading,
  } = trpcNext.orgs.get.useQuery(orgId, {
    enabled: !!orgId,
  });

  const { data: projects, isLoading: projectsLoading } =
    trpcNext.projects.list.useQuery(
      { orgId },
      { enabled: !!orgId && !!features.projects },
    );

  if (isLoading || !org) return <Loader />;

  const isOwner = org.owners.some((o) => o.id === me.id);
  const isGlobalAdmin = isPermitted(me.roles, "OrgAdmin");
  const canEdit = isGlobalAdmin || isOwner;

  return (
    <OrgProfile
      org={org}
      orgId={orgId}
      projects={projects}
      projectsLoading={projectsLoading}
      canEdit={canEdit}
      refetch={() => void refetch()}
    />
  );
}, "机构主页");

import getI18nProps from "components/getI18nProps";
export const getServerSideProps = getI18nProps;
