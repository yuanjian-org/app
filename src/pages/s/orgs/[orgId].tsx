import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  SimpleGrid,
  Image,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import { trpcNext } from "trpc";
import { widePage } from "AppPage";
import Loader from "components/Loader";
import MarkdownStyler from "components/MarkdownStyler";
import { useState } from "react";
import { pageMarginX, componentSpacing, sectionSpacing } from "theme/metrics";
import { UserProfilePictureLink } from "components/UserCards";
import UserDrawer from "components/UserDrawer";
import { formatUserName } from "shared/strings/formatUserName";
import { OrgMentor } from "shared/Org";
import { features } from "shared/Features";
import DefaultErrorPage from "next/error";
import { ProjectCard } from "components/projects/ProjectList";
import T from "components/T";

export default widePage(() => {
  if (!features.publicOrgsMentors) return <DefaultErrorPage statusCode={404} />;
  const router = useRouter();
  const orgId = router.query.orgId as string;
  const { data: org, isLoading } = trpcNext.orgs.getPublic.useQuery(orgId, {
    enabled: !!orgId,
  });

  const { data: projects, isLoading: projectsLoading } =
    trpcNext.projects.listPublic.useQuery();

  const [selectedMentor, setSelectedMentor] = useState<OrgMentor | null>(null);

  if (isLoading || !org) return <Loader />;

  const filteredProjects = projects?.filter((p) => p.orgId === orgId) || [];

  return (
    <Box mx={pageMarginX} mt={pageMarginX}>
      <VStack align="stretch" spacing={sectionSpacing}>
        <HStack justifyContent="space-between" align="start">
          <VStack align="start" spacing={componentSpacing}>
            <Heading size="xl">{org.name}</Heading>
            <Box>
              {org.description ? (
                <MarkdownStyler content={org.description} />
              ) : (
                <Text whiteSpace="pre-wrap" fontSize="lg">
                  <T>暂无介绍</T>
                </Text>
              )}
            </Box>
          </VStack>
        </HStack>

        <Box>
          <Heading size="md" mb={componentSpacing}>
            <T>机构导师 (</T>
            {org.mentors.length})
          </Heading>
          {org.mentors.length === 0 ? (
            <Text>
              <T>该机构目前没有导师。</T>
            </Text>
          ) : (
            <SimpleGrid
              columns={{ base: 1, md: 2, lg: 3 }}
              spacing={componentSpacing}
            >
              {org.mentors.map((mentor: OrgMentor) => (
                <Box
                  key={mentor.id}
                  p={componentSpacing}
                  borderWidth="1px"
                  rounded="md"
                  position="relative"
                  background="white"
                  _hover={{ shadow: "sm" }}
                  cursor="pointer"
                  onClick={() => setSelectedMentor(mentor)}
                >
                  <HStack>
                    <Image
                      src={UserProfilePictureLink(mentor.profile || null)}
                      boxSize="50px"
                      rounded="full"
                      objectFit="cover"
                      alt={"照片"}
                    />
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="bold">
                        {formatUserName(mentor.name, "formal")}
                      </Text>
                      <Text fontSize="sm" color="gray.600" noOfLines={1}>
                        {mentor.profile?.身份头衔 || "导师"}
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
              ))}
            </SimpleGrid>
          )}
        </Box>

        {features.projects && (
          <Box>
            <Heading size="md" mb={componentSpacing}>
              <T>机构项目 (</T>
              {filteredProjects.length})
            </Heading>
            {projectsLoading ? (
              <Loader />
            ) : !filteredProjects.length ? (
              <Text>
                <T>该机构目前没有项目。</T>
              </Text>
            ) : (
              <SimpleGrid
                columns={{ base: 1, md: 2, lg: 3 }}
                spacing={componentSpacing}
              >
                {filteredProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    basePath="/s/projects"
                  />
                ))}
              </SimpleGrid>
            )}
          </Box>
        )}
      </VStack>

      {selectedMentor && (
        <UserDrawer
          data={{
            user: selectedMentor,
            profile: selectedMentor.profile || {},
            isMentor: true,
          }}
          showBookingButton={true}
          onClose={() => setSelectedMentor(null)}
        />
      )}
    </Box>
  );
}, "机构主页");
