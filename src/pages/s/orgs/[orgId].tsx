import { useRouter } from "next/router";
import { trpcNext } from "trpc";
import { widePage } from "AppPage";
import { features } from "shared/Features";
import ErrorPage from "next/error";
import { OrgProfile } from "components/orgs/OrgProfile";
import Loader from "components/Loader";

export default widePage(() => {
  if (!features.publicOrgsMentors) return <ErrorPage statusCode={404} />;

  const router = useRouter();
  const orgId = router.query.orgId as string;
  const { data: org, isLoading } = trpcNext.orgs.getPublic.useQuery(orgId, {
    enabled: !!orgId && !!features.publicOrgsMentors,
  });

  const { data: projects, isLoading: projectsLoading } =
    trpcNext.projects.listPublic.useQuery(undefined, {
      enabled: !!orgId && !!features.projects,
    });

  if (isLoading || !org) return <Loader />;

  return (
    <OrgProfile
      org={org}
      orgId={orgId}
      projects={projects}
      projectsLoading={projectsLoading}
      canEdit={false}
      isPublic={true}
    />
  );
}, "机构主页");
