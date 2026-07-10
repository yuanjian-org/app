// @i18n-ignore-file
import { useRouter } from "next/router";
import trpc, { trpcNext } from "../../trpc";
import useMe from "../../useMe";
import { isPermitted } from "../../shared/Role";
import PageLoader from "../../components/PageLoader";
import Head from "next/head";
import { getStandaloneFormUrl } from "pages/form";
import { useState } from "react";
import { ProjectDetailCard } from "../../components/projects/ProjectDetail";

export default function Page() {
  const router = useRouter();
  const id = router.query.id as string;
  const me = useMe();
  const [loading, setLoading] = useState(false);

  const { data: project } = trpcNext.projects.get.useQuery(
    { id },
    { enabled: !!id },
  );

  const handleApply = async () => {
    setLoading(true);
    try {
      const newWindow = window.open("", "_blank");
      try {
        const xField = await trpc.users.getJinshujuXField.query({
          projectId: id,
        });
        if (newWindow) {
          newWindow.opener = null;
          newWindow.location.href = getStandaloneFormUrl("j6iUMC", xField);
        }
      } catch (err) {
        if (newWindow) {
          newWindow.close();
        }
        throw err;
      }
    } finally {
      setLoading(false);
    }
  };

  if (!project) return <PageLoader />;

  const canEdit =
    me && (me.id === project.ownerId || isPermitted(me.roles, "ProjectAdmin"));

  return (
    <>
      <Head>
        <title>{project.title} ｜ 远图</title>
      </Head>
      <ProjectDetailCard
        project={project}
        canEdit={!!canEdit}
        isLoadingApply={loading}
        onApply={handleApply}
      />
    </>
  );
}
