import ProjectEditor from "../../components/projects/ProjectEditor";
import PageBreadcrumb from "../../components/PageBreadcrumb";

export default function Page() {
  return (
    <>
      <PageBreadcrumb current="发布新项目" />
      <ProjectEditor />
    </>
  );
}

Page.title = "发布新项目";
