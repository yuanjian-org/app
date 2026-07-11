// @i18n-ignore-file
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

import getI18nProps from "components/getI18nProps";
export const getServerSideProps = getI18nProps;
