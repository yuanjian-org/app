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
import Loader from "components/Loader";
import MarkdownStyler from "components/MarkdownStyler";
import MarkdownSupport from "components/MarkdownSupport";
import { useEffect, useState } from "react";
import { pageMarginX, componentSpacing, sectionSpacing } from "theme/metrics";
import { UserProfilePictureLink } from "components/UserCards";
import { DeleteIcon, EditIcon, AddIcon } from "@chakra-ui/icons";
import UserDrawer from "components/UserDrawer";
import UserSelector from "components/UserSelector";
import { formatUserName } from "shared/strings/formatUserName";
import { toast } from "react-toastify";
import { OrgMentor, OrgWithMembers } from "shared/Org";
import { features } from "shared/Features";
import { ProjectCard } from "components/projects/ProjectList";
import T from "components/T";
import { ProjectWithAssociation } from "shared/Project";
import { trpcNext } from "trpc";

export function OrgProfile({
  org,
  orgId,
  projects,
  projectsLoading,
  isPublic = false,
  canEdit = false,
  refetch,
}: {
  org: OrgWithMembers;
  orgId: string;
  projects?: ProjectWithAssociation[];
  projectsLoading: boolean;
  isPublic?: boolean;
  canEdit?: boolean;
  refetch?: () => void;
}) {
  const [selectedMentor, setSelectedMentor] = useState<OrgMentor | null>(null);

  const updateDescMutation = trpcNext.orgs.updateDescription.useMutation();
  const removeMentorMutation = trpcNext.orgs.removeMentor.useMutation();
  const addMentorMutation = trpcNext.orgs.addMentor.useMutation();

  const { isOpen, onOpen, onClose } = useDisclosure();

  const {
    isOpen: isAddMentorOpen,
    onOpen: onAddMentorOpen,
    onClose: onAddMentorClose,
  } = useDisclosure();
  const [selectedUsersToAdd, setSelectedUsersToAdd] = useState<string[]>([]);

  const [description, setDescription] = useState("");

  useEffect(() => {
    if (org) {
      setDescription(org.description || "");
    }
  }, [org]);

  const handleUpdateDescription = async () => {
    await updateDescMutation.mutateAsync({ id: orgId, description });
    if (refetch) refetch();
    onClose();
    toast.success("介绍已更新");
  };

  const handleAddMentor = async () => {
    if (selectedUsersToAdd.length === 0) {
      toast.error("请选择至少一个导师");
      return;
    }
    await addMentorMutation.mutateAsync({
      orgId: orgId,
      mentorId: selectedUsersToAdd[0],
    });
    if (refetch) refetch();
    onAddMentorClose();
    setSelectedUsersToAdd([]);
    toast.success("导师已添加");
  };

  const handleRemoveMentor = async (mentorId: string) => {
    if (confirm("确定要将该导师从机构中移除吗？")) {
      await removeMentorMutation.mutateAsync({
        orgId: orgId,
        mentorId,
      });
      if (refetch) refetch();
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
                  <T>暂无介绍</T>
                </Text>
              )}
            </Box>
          </VStack>

          {!isPublic && canEdit && (
            <HStack>
              <Button
                leftIcon={<EditIcon />}
                variant="outline"
                onClick={onOpen}
              >
                <T>编辑介绍</T>
              </Button>
              <Button
                leftIcon={<AddIcon />}
                variant="outline"
                onClick={onAddMentorOpen}
                ml={componentSpacing}
              >
                <T>添加导师</T>
              </Button>
            </HStack>
          )}
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
                  {!isPublic && canEdit && (
                    <Tooltip label={"移除导师"}>
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
              <T>机构项目 (</T>
              {projects?.length ?? 0})
            </Heading>
            {projectsLoading ? (
              <Loader />
            ) : !projects?.length ? (
              <Text>
                <T>该机构目前没有项目。</T>
              </Text>
            ) : (
              <SimpleGrid
                columns={{ base: 1, md: 2, lg: 3 }}
                spacing={componentSpacing}
              >
                {projects?.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    basePath={isPublic ? "/s/projects" : "/projects"}
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
          showBookingButton={!isPublic}
          showMatchingTraitsAndSelection={!isPublic}
          onClose={() => setSelectedMentor(null)}
        />
      )}

      {!isPublic && canEdit && (
        <>
          <Modal isOpen={isOpen} onClose={onClose}>
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>
                <T>编辑机构介绍</T>
              </ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <FormControl>
                  <FormLabel>
                    <T>介绍</T>
                  </FormLabel>
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
                  <T>取消</T>
                </Button>
                <Button
                  colorScheme="brand"
                  onClick={handleUpdateDescription}
                  isLoading={updateDescMutation.isLoading}
                >
                  <T>保存</T>
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>

          <Modal isOpen={isAddMentorOpen} onClose={onAddMentorClose}>
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>
                <T>添加导师</T>
              </ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <FormControl>
                  <FormLabel>
                    <T>选择导师</T>
                  </FormLabel>
                  <UserSelector
                    onSelect={(userIds) => setSelectedUsersToAdd(userIds)}
                    placeholder={"搜索导师..."}
                  />
                </FormControl>
              </ModalBody>
              <ModalFooter>
                <Button variant="ghost" mr={3} onClick={onAddMentorClose}>
                  <T>取消</T>
                </Button>
                <Button
                  colorScheme="brand"
                  onClick={handleAddMentor}
                  isLoading={addMentorMutation.isLoading}
                >
                  <T>添加</T>
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </>
      )}
    </Box>
  );
}
