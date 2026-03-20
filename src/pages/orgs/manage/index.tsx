import {
  Box,
  Heading,
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
  Input,
  Textarea,
  VStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Tag,
  TagLabel,
  TagCloseButton,
  Wrap,
} from "@chakra-ui/react";
import { trpcNext } from "trpc";
import { widePage } from "AppPage";
import Loader from "components/Loader";
import { useState } from "react";
import { pageMarginX, componentSpacing } from "theme/metrics";
import { DeleteIcon, AddIcon } from "@chakra-ui/icons";
import { toast } from "react-toastify";
import UserSelector from "components/UserSelector";
import { formatUserName } from "shared/strings";

function OrgRow({ org, refetchOrgs }: { org: any; refetchOrgs: () => void }) {
  const { data: orgWithMembers, refetch: refetchMembers } =
    trpcNext.orgs.get.useQuery(org.id);
  const removeOrgMutation = trpcNext.orgs.remove.useMutation();
  const addOwnerMutation = trpcNext.orgs.addOwner.useMutation();
  const removeOwnerMutation = trpcNext.orgs.removeOwner.useMutation();
  const [showUserSelector, setShowUserSelector] = useState(false);

  const handleRemoveOrg = async () => {
    if (confirm("确定要删除该机构吗？此操作不可撤销。")) {
      await removeOrgMutation.mutateAsync(org.id);
      void refetchOrgs();
      toast.success("机构已删除");
    }
  };

  const handleAddOwner = async (userIds: string[]) => {
    if (userIds.length > 0) {
      await addOwnerMutation.mutateAsync({
        orgId: org.id,
        ownerId: userIds[0],
      });
      void refetchMembers();
      toast.success("已添加机构负责人");
      setShowUserSelector(false);
    }
  };

  const handleRemoveOwner = async (ownerId: string) => {
    await removeOwnerMutation.mutateAsync({
      orgId: org.id,
      ownerId: ownerId,
    });
    void refetchMembers();
    toast.success("已移除机构负责人");
  };

  return (
    <Tr>
      <Td>{org.name}</Td>
      <Td>
        <Wrap>
          {orgWithMembers?.owners.map((owner) => (
            <Tag
              key={owner.id}
              size="md"
              borderRadius="full"
              variant="solid"
              colorScheme="blue"
            >
              <TagLabel>{formatUserName(owner.name)}</TagLabel>
              <TagCloseButton
                onClick={() => void handleRemoveOwner(owner.id)}
              />
            </Tag>
          ))}
          {!showUserSelector ? (
            <IconButton
              aria-label="Add owner"
              icon={<AddIcon />}
              size="xs"
              onClick={() => setShowUserSelector(true)}
            />
          ) : (
            <Box w="200px">
              <UserSelector
                onSelect={(ids) => void handleAddOwner(ids)}
                placeholder="搜索用户..."
                isMulti={false}
              />
            </Box>
          )}
        </Wrap>
      </Td>
      <Td>
        <IconButton
          aria-label="Remove org"
          icon={<DeleteIcon />}
          colorScheme="red"
          variant="ghost"
          onClick={() => void handleRemoveOrg()}
          isLoading={removeOrgMutation.isLoading}
        />
      </Td>
    </Tr>
  );
}

export default widePage(() => {
  const { data: orgs, refetch } = trpcNext.orgs.list.useQuery();
  const createMutation = trpcNext.orgs.create.useMutation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = async () => {
    await createMutation.mutateAsync({ name, description });
    void refetch();
    onClose();
    setName("");
    setDescription("");
    toast.success("机构创建成功");
  };

  if (!orgs) return <Loader />;

  return (
    <Box mx={pageMarginX} mt={pageMarginX}>
      <HStack justifyContent="space-between" mb={componentSpacing}>
        <Heading size="lg">机构管理</Heading>
        <Button colorScheme="brand" onClick={onOpen}>
          创建机构
        </Button>
      </HStack>

      <Box overflowX="auto">
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>名称</Th>
              <Th>负责人</Th>
              <Th>操作</Th>
            </Tr>
          </Thead>
          <Tbody>
            {orgs.map((org) => (
              <OrgRow
                key={org.id}
                org={org}
                refetchOrgs={() => void refetch()}
              />
            ))}
          </Tbody>
        </Table>
      </Box>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>创建新机构</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>名称</FormLabel>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>介绍</FormLabel>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              取消
            </Button>
            <Button
              colorScheme="brand"
              onClick={() => void handleCreate()}
              isLoading={createMutation.isLoading}
            >
              创建
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}, "机构管理");
