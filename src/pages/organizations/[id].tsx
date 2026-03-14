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
  useToast,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import { trpcNext } from "trpc";
import { widePage } from "AppPage";
import Loader from "components/Loader";
import useMe from "useMe";
import { isPermitted } from "shared/Role";
import { useEffect, useState } from "react";
import { pageMarginX, componentSpacing, sectionSpacing } from "theme/metrics";
import { UserProfilePictureLink } from "components/UserCards";
import { DeleteIcon, EditIcon, HamburgerIcon } from "@chakra-ui/icons";
import UserDrawer from "components/UserDrawer";
import { formatUserName } from "shared/strings";

export default widePage(() => {
  const router = useRouter();
  const id = router.query.id as string;
  const me = useMe();
  const toast = useToast();
  const {
    data: org,
    refetch,
    isLoading,
  } = trpcNext.organizations.get.useQuery(id, {
    enabled: !!id,
  });

  const [selectedMentor, setSelectedMentor] = useState<any>(null);

  const updateDescMutation =
    trpcNext.organizations.updateDescription.useMutation();
  const joinMutation = trpcNext.organizations.join.useMutation();
  const leaveMutation = trpcNext.organizations.leave.useMutation();
  const removeMentorMutation =
    trpcNext.organizations.removeMentor.useMutation();
  const removeOrgMutation = trpcNext.organizations.remove.useMutation();

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
  const isMentor = isPermitted(me.roles, "Mentor");
  const isMember = org.mentors.some((m) => m.id === me.id);

  const handleUpdateDescription = async () => {
    await updateDescMutation.mutateAsync({ id, description });
    void refetch();
    onClose();
    toast({ title: "介绍已更新", status: "success" });
  };

  const handleJoin = async () => {
    await joinMutation.mutateAsync(id);
    void refetch();
    toast({ title: "已加入机构", status: "success" });
  };

  const handleLeave = async () => {
    await leaveMutation.mutateAsync(id);
    void refetch();
    toast({ title: "已离开机构", status: "success" });
  };

  const handleRemoveMentor = async (mentorId: string) => {
    if (confirm("确定要将该导师从机构中移除吗？")) {
      await removeMentorMutation.mutateAsync({
        organizationId: id,
        mentorId,
      });
      void refetch();
      toast({ title: "导师已移除", status: "success" });
    }
  };

  const handleRemoveOrg = async () => {
    if (confirm("确定要删除该机构吗？此操作不可撤销。")) {
      await removeOrgMutation.mutateAsync(id);
      void router.push("/organizations");
      toast({ title: "机构已删除", status: "success" });
    }
  };

  return (
    <Box mx={pageMarginX} mt={pageMarginX}>
      <VStack align="stretch" spacing={sectionSpacing}>
        <HStack justifyContent="space-between" align="start">
          <VStack align="start" spacing={componentSpacing}>
            <Heading size="xl">{org.name}</Heading>
            <Box>
              <Text whiteSpace="pre-wrap" fontSize="lg">
                {org.description || "暂无介绍"}
              </Text>
            </Box>
          </VStack>

          <HStack>
            {isMentor && (
              <Button
                colorScheme={isMember ? "gray" : "brand"}
                onClick={isMember ? handleLeave : handleJoin}
                isLoading={joinMutation.isLoading || leaveMutation.isLoading}
              >
                {isMember ? "离开机构" : "加入机构"}
              </Button>
            )}

            {(canEdit || isGlobalAdmin) && (
              <Menu>
                <MenuButton
                  as={IconButton}
                  aria-label="Options"
                  icon={<HamburgerIcon />}
                  variant="outline"
                />
                <MenuList>
                  {canEdit && (
                    <MenuItem icon={<EditIcon />} onClick={onOpen}>
                      编辑介绍
                    </MenuItem>
                  )}
                  {isGlobalAdmin && (
                    <MenuItem
                      icon={<DeleteIcon />}
                      onClick={handleRemoveOrg}
                      color="red.500"
                    >
                      删除机构
                    </MenuItem>
                  )}
                </MenuList>
              </Menu>
            )}
          </HStack>
        </HStack>

        <Box>
          <Heading size="md" mb={componentSpacing}>
            机构导师 ({org.mentors.length})
          </Heading>
          {org.mentors.length === 0 ? (
            <Alert status="info">
              <AlertIcon />
              目前该机构还没有导师。
            </Alert>
          ) : (
            <SimpleGrid
              columns={{ base: 1, md: 2, lg: 3 }}
              spacing={componentSpacing}
            >
              {org.mentors.map((mentor: any) => (
                <Box
                  key={mentor.id}
                  p={componentSpacing}
                  borderWidth="1px"
                  rounded="md"
                  position="relative"
                  _hover={{ shadow: "sm" }}
                  cursor="pointer"
                  onClick={() => setSelectedMentor(mentor)}
                >
                  <HStack>
                    <Image
                      src={UserProfilePictureLink(mentor.profile)}
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
                    <IconButton
                      aria-label="Remove mentor"
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
                  )}
                </Box>
              ))}
            </SimpleGrid>
          )}
        </Box>
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
