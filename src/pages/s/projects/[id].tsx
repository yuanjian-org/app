import { useRouter } from "next/router";
import { Box } from "@chakra-ui/react";
import { trpcNext } from "../../../trpc";
import PageLoader from "../../../components/PageLoader";
import Head from "next/head";
import { useState } from "react";
import ConfirmationModal from "../../../components/ConfirmationModal";
import { componentSpacing } from "../../../theme/metrics";
import { ProjectDetailCard } from "../../../components/projects/ProjectDetail";

export default function Page() {
  const router = useRouter();
  const id = router.query.id as string;
  const [showLoginModal, setShowLoginModal] = useState(false);

  const { data: project } = trpcNext.projects.getPublic.useQuery(
    { id },
    { enabled: !!id },
  );

  if (!project) return <PageLoader />;

  return (
    <>
      <Head>
        <title>{project.title} ｜ 远图</title>
      </Head>
      <Box w="100%" py={componentSpacing}>
        <ProjectDetailCard
          project={project}
          canEdit={false}
          isLoadingApply={false}
          onApply={() => {
            setShowLoginModal(true);
          }}
        />
      </Box>
      {showLoginModal && (
        <ConfirmationModal
          message="请先登录 / 注册"
          onClose={() => setShowLoginModal(false)}
          onConfirm={() =>
            router.push(`/auth/login?callbackUrl=/projects/${id}`)
          }
          confirmButtonText="继续"
          hasCancelButton
        />
      )}
    </>
  );
}

// We set title dynamically using <Head> inside the component so that it has access to project data
