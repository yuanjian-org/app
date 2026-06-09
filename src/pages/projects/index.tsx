import {
  Button,
  Flex,
  Heading,
  Text,
  SimpleGrid,
  CardHeader,
  CardBody,
} from "@chakra-ui/react";
import { trpcNext } from "../../trpc";
import { useMyRoles } from "../../useMe";
import { isPermitted } from "../../shared/Role";
import NextLink from "next/link";
import { MdAdd } from "react-icons/md";
import PageLoader from "../../components/PageLoader";
import { ResponsiveCard } from "../../components/ResponsiveCard";
import TopBar, { topBarPaddings } from "../../components/TopBar";
import { fullPage } from "../../AppPage";
import { componentSpacing, pageMarginX } from "../../theme/metrics";

export default fullPage(() => {
  const { data: projects } = trpcNext.projects.list.useQuery();
  const myRoles = useMyRoles();
  const canCreate = isPermitted(myRoles, ["Mentor", "ProjectAdmin"]);

  if (projects === undefined) return <PageLoader />;

  return (
    <>
      <TopBar {...topBarPaddings()}>
        <Flex justify="space-between" align="center">
          <Heading size="lg">X-Challenge 问题</Heading>
          {canCreate && (
            <Button
              as={NextLink}
              href="/projects/create"
              colorScheme="brand"
              leftIcon={<MdAdd />}
            >
              发布项目
            </Button>
          )}
        </Flex>
      </TopBar>

      {projects.length === 0 ? (
        <Text mx={pageMarginX} mt={pageMarginX}>
          暂无项目
        </Text>
      ) : (
        <SimpleGrid
          spacing={componentSpacing}
          templateColumns="repeat(auto-fill, minmax(270px, 1fr))"
          mx={pageMarginX}
          mt={pageMarginX}
        >
          {projects.map((project) => (
            <ResponsiveCard key={project.id}>
              <CardHeader>
                <Flex justify="space-between" align="center">
                  <Heading size="md">
                    <NextLink href={`/projects/${project.id}`}>
                      <Text
                        as="span"
                        color="brand.a"
                        _hover={{ textDecoration: "underline" }}
                      >
                        {project.title}
                      </Text>
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
              </CardHeader>
              <CardBody>
                {project.owner && (
                  <Text fontSize="sm" color="gray.600" mb={2}>
                    发起人：{project.owner.name}
                  </Text>
                )}
                <Text noOfLines={3} color="gray.700">
                  {project.profile?.简介 || "暂无简介"}
                </Text>
              </CardBody>
            </ResponsiveCard>
          ))}
        </SimpleGrid>
      )}
    </>
  );
}, "项目列表");
