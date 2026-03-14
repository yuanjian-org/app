import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  LinkBox,
  LinkOverlay,
  VStack,
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
  HStack,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { trpcNext } from "trpc";
import { widePage } from "AppPage";
import Loader from "components/Loader";
import useMe from "useMe";
import { isPermitted } from "shared/Role";
import { useState } from "react";
import { pageMarginX, componentSpacing } from "theme/metrics";

export default widePage(() => {
  const me = useMe();
  const { data: orgs, refetch } = trpcNext.organizations.list.useQuery();
  const createMutation = trpcNext.organizations.create.useMutation();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = async () => {
    await createMutation.mutateAsync({ name, description });
    void refetch();
    onClose();
    setName("");
    setDescription("");
  };

  if (!orgs) return <Loader />;

  return (
    <Box mx={pageMarginX} mt={pageMarginX}>
      <HStack justifyContent="space-between" mb={componentSpacing}>
        <Heading size="lg">所有机构</Heading>
        {isPermitted(me.roles, "OrgAdmin") && (
          <Button colorScheme="brand" onClick={onOpen}>
            创建机构
          </Button>
        )}
      </HStack>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={10}>
        {orgs.map((org) => (
          <LinkBox
            key={org.id}
            p="5"
            borderWidth="1px"
            rounded="md"
            _hover={{ shadow: "md", borderColor: "brand.500" }}
          >
            <Heading size="md" my="2">
              <LinkOverlay as={NextLink} href={`/organizations/${org.id}`}>
                {org.name}
              </LinkOverlay>
            </Heading>
            <Text noOfLines={3}>{org.description || "暂无介绍"}</Text>
          </LinkBox>
        ))}
      </SimpleGrid>

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
              onClick={handleCreate}
              isLoading={createMutation.isLoading}
            >
              创建
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}, "机构列表");
