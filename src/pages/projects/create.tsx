import ProjectEditor from "../../components/projects/ProjectEditor";
import PageBreadcrumb from "../../components/PageBreadcrumb";
import { widePage } from "../../AppPage";

export default widePage(() => {
  return (
    <>
      <PageBreadcrumb current="发布新项目" />
      <ProjectEditor />
    </>
  );
}, "发布新项目");
