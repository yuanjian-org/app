import { useRouter } from "next/router";
import ProjectEditor from "../../../components/projects/ProjectEditor";
import PageBreadcrumb from "../../../components/PageBreadcrumb";
import { widePage } from "../../../AppPage";

export default widePage(() => {
  const router = useRouter();
  const id = router.query.id as string;
  if (!id) return null;

  return (
    <>
      <PageBreadcrumb current="编辑项目" />
      <ProjectEditor projectId={id} />
    </>
  );
}, "编辑项目");
