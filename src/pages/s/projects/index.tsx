import { Box } from "@chakra-ui/react";
import { trpcNext } from "../../../trpc";
import { ProjectListContainer } from "../../../components/projects/ProjectList";

import { widePage } from "../../../AppPage";
import Loader from "components/Loader";

export default widePage(() => {
  const { data: projects } = trpcNext.projects.listPublic.useQuery();

  if (projects === undefined) return <Loader />;

  return (
    <Box w="100%">
      <ProjectListContainer projects={projects} basePath="/s/projects" />
    </Box>
  );
}, "项目列表");
