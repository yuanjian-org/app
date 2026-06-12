import { useRouter } from "next/router";
import { Box } from "@chakra-ui/react";
import { trpcNext } from "../../../trpc";
import PageLoader from "../../../components/PageLoader";
import Head from "next/head";
import { barePage } from "../../../AppPage";
import { useState } from "react";
import ConfirmationModal from "../../../components/ConfirmationModal";
import { componentSpacing, pageMarginX } from "../../../theme/metrics";
import { ProjectDetailCard } from "../../../components/projects/ProjectDetail";

export default barePage(() => {
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
      <Box
        maxW="1200px"
        mx="auto"
        w="100%"
        py={componentSpacing}
        px={pageMarginX}
      >
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
});
