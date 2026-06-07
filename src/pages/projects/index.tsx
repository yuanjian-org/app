import { Box, Button, Flex, Heading, Text, VStack } from "@chakra-ui/react";
import { trpcNext } from "../../trpc";
import { useMyRoles } from "../../useMe";
import { isPermitted } from "../../shared/Role";
import NextLink from "next/link";
import { MdAdd } from "react-icons/md";
import PageLoader from "../../components/PageLoader";
import PageBreadcrumb from "components/PageBreadcrumb";

export default function Page() {
  const { data: projects } = trpcNext.projects.list.useQuery();
  const myRoles = useMyRoles();
  const canCreate = isPermitted(myRoles, ["Mentor", "ProjectAdmin"]);

  if (projects === undefined) return <PageLoader />;

  return (
    <>
      <PageBreadcrumb current="X-Challenge 问题" />

      {canCreate && (
        <Flex>
          <Button
            as={NextLink}
            href="/projects/create"
            colorScheme="brand"
            leftIcon={<MdAdd />}
          >
            发布项目
          </Button>
        </Flex>
      )}

      {projects.length === 0 ? (
        <Text>暂无项目</Text>
      ) : (
        <VStack spacing={4} align="stretch">
          {projects.map((project) => (
            <Box
              key={project.id}
              p={5}
              shadow="md"
              borderWidth="1px"
              borderRadius="md"
              bg="white"
            >
              <Flex justify="space-between" align="center" mb={2}>
                <Heading size="md">
                  <NextLink href={`/projects/${project.id}`}>
                    <Box
                      as="span"
                      color="brand.a"
                      _hover={{ textDecoration: "underline" }}
                    >
                      {project.title}
                    </Box>
                  </NextLink>
                </Heading>
                <Text fontSize="sm" color="gray.500">
                  {project.status === "Open"
                    ? "招募中"
                    : project.status === "Closed"
                      ? "已结束"
                      : "草稿"}{" "}
                  | {project.visibility === "Public" ? "公开" : "保密"}
                </Text>
              </Flex>
              {project.owner && (
                <Text fontSize="sm" color="gray.600" mb={2}>
                  发起人：{project.owner.name}
                </Text>
              )}
              <Text noOfLines={3} color="gray.700">
                {project.profile?.简介 || "暂无简介"}
              </Text>
            </Box>
          ))}
        </VStack>
      )}
    </>
  );
}

Page.title = "项目列表";
