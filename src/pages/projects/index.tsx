// @i18n-ignore-file
import { Button } from "@chakra-ui/react";
import { trpcNext } from "../../trpc";
import { useMyRoles } from "../../useMe";
import { isPermitted } from "../../shared/Role";
import NextLink from "next/link";
import { MdAdd } from "react-icons/md";
import { fullPage } from "../../AppPage";
import { pageMarginX } from "../../theme/metrics";
import { ProjectListContainer } from "../../components/projects/ProjectList";
import Loader from "components/Loader";

export default fullPage(() => {
  const { data: projects } = trpcNext.projects.list.useQuery();
  const myRoles = useMyRoles();
  const canCreate = isPermitted(myRoles, ["Mentor", "ProjectAdmin"]);

  if (projects === undefined) return <Loader />;

  return (
    <ProjectListContainer
      projects={projects}
      basePath="/projects"
      useTopBar={true}
      mx={pageMarginX}
      headerAction={
        canCreate && (
          <Button
            as={NextLink}
            href="/projects/create"
            colorScheme="brand"
            leftIcon={<MdAdd />}
          >
            发布项目
          </Button>
        )
      }
    />
  );
}, "项目列表");
