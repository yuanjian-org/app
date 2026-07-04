import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Image,
  VStack,
  HStack,
  Button,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Textarea,
  IconButton,
  Tooltip,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import { trpcNext } from "trpc";
import { widePage } from "AppPage";
import Loader from "components/Loader";
import MarkdownStyler from "components/MarkdownStyler";
import MarkdownSupport from "components/MarkdownSupport";
import useMe from "useMe";
import { isPermitted } from "shared/Role";
import { useEffect, useState } from "react";
import { pageMarginX, componentSpacing, sectionSpacing } from "theme/metrics";
import { UserProfilePictureLink } from "components/UserCards";
import { DeleteIcon, EditIcon } from "@chakra-ui/icons";
import UserDrawer from "components/UserDrawer";
import { formatUserName } from "shared/strings/formatUserName";
import { toast } from "react-toastify";
import { OrgMentor } from "shared/Org";
import { features } from "shared/Features";
import { ProjectCard } from "components/projects/ProjectList";

export default widePage(() => {
  const router = useRouter();
  const orgId = router.query.orgId as string;
  const me = useMe();
  const {
    data: org,
    refetch,
    isLoading,
  } = trpcNext.orgs.get.useQuery(orgId, {
    enabled: !!orgId,
  });

  const { data: projects, isLoading: projectsLoading } =
    trpcNext.projects.list.useQuery(
      { orgId },
      { enabled: !!orgId && !!features.projects },
    );

  const [selectedMentor, setSelectedMentor] = useState<OrgMentor | null>(null);

  const updateDescMutation = trpcNext.orgs.updateDescription.useMutation();
  const removeMentorMutation = trpcNext.orgs.removeMentor.useMutation();

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (org) {
      setDescription(org.description || "");
    }
  }, [org]);

  if (isLoading || !org) return <Loader />;

  const isOwner = org.owners.some((o) => o.id === me.id);
  const isGlobalAdmin = isPermitted(me.roles, "OrgAdmin");
  const canEdit = isGlobalAdmin || isOwner;

  const handleUpdateDescription = async () => {
    await updateDescMutation.mutateAsync({ id: orgId, description });
    void refetch();
    onClose();
    toast.success("介绍已更新");
  };

  const handleRemoveMentor = async (mentorId: string) => {
    if (confirm("确定要将该导师从机构中移除吗？")) {
      await removeMentorMutation.mutateAsync({
        orgId: orgId,
        mentorId,
      });
      void refetch();
      toast.success("导师已移除");
    }
  };

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
                  暂无介绍
                </Text>
              )}
            </Box>
          </VStack>

          <HStack>
            {canEdit && (
              <Button
                leftIcon={<EditIcon />}
                variant="outline"
                onClick={onOpen}
              >
                编辑介绍
              </Button>
            )}
          </HStack>
        </HStack>

        <Box>
          <Heading size="md" mb={componentSpacing}>
            机构导师 ({org.mentors.length})
          </Heading>
          {org.mentors.length === 0 ? (
            <Text>该机构目前没有导师。</Text>
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
                      alt="照片"
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
                  {canEdit && (
                    <Tooltip label="移除导师">
                      <IconButton
                        aria-label="移除导师"
                        icon={<DeleteIcon />}
                        size="xs"
                        position="absolute"
                        top={2}
                        right={2}
                        colorScheme="red"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleRemoveMentor(mentor.id);
                        }}
                      />
                    </Tooltip>
                  )}
                </Box>
              ))}
            </SimpleGrid>
          )}
        </Box>

        {features.projects && (
          <Box>
            <Heading size="md" mb={componentSpacing}>
              机构项目 ({projects?.length ?? 0})
            </Heading>
            {projectsLoading ? (
              <Loader />
            ) : !projects?.length ? (
              <Text>该机构目前没有项目。</Text>
            ) : (
              <SimpleGrid
                columns={{ base: 1, md: 2, lg: 3 }}
                spacing={componentSpacing}
              >
                {projects?.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    basePath="/projects"
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

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>编辑机构介绍</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>介绍</FormLabel>
              <Textarea
                rows={10}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <MarkdownSupport mr="auto" />
            <Button variant="ghost" mr={3} onClick={onClose}>
              取消
            </Button>
            <Button
              colorScheme="brand"
              onClick={handleUpdateDescription}
              isLoading={updateDescMutation.isLoading}
            >
              保存
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}, "机构主页");
