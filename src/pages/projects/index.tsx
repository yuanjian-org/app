import { VStack, Text, Heading, Box, SimpleGrid } from "@chakra-ui/react";
import PageBreadcrumb from "components/PageBreadcrumb";
import { trpcNext } from "../../trpc";
import { useRouter } from "next/router";

export default function Projects() {
  const router = useRouter();
  const { data: projects, isLoading } =
    trpcNext.projects.listProjects.useQuery();

  return (
    <>
      <PageBreadcrumb current="挑战性问题发布平台" />
      <VStack align="stretch" spacing={4} mt={4}>
        <Heading size="lg">X-Challenge 重大挑战问题</Heading>
        {isLoading && <Text>加载中...</Text>}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {projects?.map((project) => (
            <Box
              key={project.id}
              p={5}
              shadow="md"
              borderWidth="1px"
              borderRadius="md"
              _hover={{ shadow: "lg", cursor: "pointer" }}
              onClick={() => router.push(`/projects/${project.id}`)}
            >
              <Heading fontSize="xl">{project.title}</Heading>
              <Text mt={2} noOfLines={3}>
                {project.profile["Challenge Description"]}
              </Text>
              <Text mt={2} color="gray.500" fontSize="sm">
                发布者: {project.creator?.name}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      </VStack>
    </>
  );
}

Projects.title = "挑战性问题发布平台";
