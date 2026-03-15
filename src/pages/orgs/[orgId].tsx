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
import { toast } from "react-toastify";
import { OrgMentor } from "shared/Org";

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

  const [selectedMentor, setSelectedMentor] = useState<OrgMentor | null>(null);

  const updateDescMutation = trpcNext.orgs.updateDescription.useMutation();
  const joinMutation = trpcNext.orgs.join.useMutation();
  const leaveMutation = trpcNext.orgs.leave.useMutation();
  const removeMentorMutation = trpcNext.orgs.removeMentor.useMutation();
  const removeOrgMutation = trpcNext.orgs.remove.useMutation();

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
    await updateDescMutation.mutateAsync({ id: orgId, description });
    void refetch();
    onClose();
    toast.success("介绍已更新");
  };

  const handleJoin = async () => {
    await joinMutation.mutateAsync(orgId);
    void refetch();
    toast.success("已加入机构");
  };

  const handleLeave = async () => {
    await leaveMutation.mutateAsync(orgId);
    void refetch();
    toast.success("已离开机构");
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

  const handleRemoveOrg = async () => {
    if (confirm("确定要删除该机构吗？此操作不可撤销。")) {
      await removeOrgMutation.mutateAsync(orgId);
      void router.push("/orgs");
      toast.success("机构已删除");
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
              {org.mentors.map((mentor: OrgMentor) => (
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
