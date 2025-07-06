import {
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  ModalHeader,
  ModalContent,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  VStack,
  FormErrorMessage,
  Stack,
  Checkbox,
  Tag,
  Wrap,
  WrapItem,
  Flex,
  TableContainer,
  Link,
} from "@chakra-ui/react";
import { useState } from "react";
import { trpcNext } from "../trpc";
import User, { UserWithMergeInfo } from "shared/User";
import ModalWithBackdrop from "components/ModalWithBackdrop";
import { formatUserName, isValidChineseName, toPinyin } from "shared/strings";
import Role, { AllRoles, RoleProfiles, isPermitted } from "shared/Role";
import trpc from "trpc";
import { AddIcon, ChevronRightIcon } from "@chakra-ui/icons";
import Loader from "components/Loader";
import z from "zod";
import NextLink from "next/link";
import { TbSpy } from "react-icons/tb";
import { useSession } from "next-auth/react";
import { ImpersonationRequest } from "./api/auth/[...nextauth]";
import { useRouter } from "next/router";
import MergeTokenCell from "components/MergeTokenCell";
import useMe, { useMyRoles } from "useMe";
import { widePage } from "AppPage";

export default widePage(() => {
  const [includeMerged, setIncludeMerged] = useState(false);
  const [includeBanned, setIncludeBanned] = useState(false);

  const { data: users, refetch } = trpcNext.users.list.useQuery<User[]>({
    includeMerged,
    includeBanned,
    includeNonVolunteers: true,
    returnMergeInfo: true,
  });

  const [userBeingEdited, setUserBeingEdited] = useState<User | null>(null);
  const [creatingNewUser, setCreatingNewUser] = useState(false);

  const closeUserEditor = () => {
    setUserBeingEdited(null);
    setCreatingNewUser(false);
    void refetch();
  };

  return (
    <>
      {userBeingEdited && (
        <UserEditor user={userBeingEdited} onClose={closeUserEditor} />
      )}

      {creatingNewUser && <UserEditor onClose={closeUserEditor} />}

      <Flex direction="column" gap={6}>
        <Wrap spacing={4} align="center">
          <WrapItem>
            <Button
              variant="brand"
              leftIcon={<AddIcon />}
              onClick={() => setCreatingNewUser(true)}
            >
              新建用户
            </Button>
          </WrapItem>

          <WrapItem>
            <Checkbox
              isChecked={includeMerged}
              onChange={(e) => setIncludeMerged(e.target.checked)}
            >
              显示已迁移账号
            </Checkbox>
          </WrapItem>

          <WrapItem>
            <Checkbox
              isChecked={includeBanned}
              onChange={(e) => setIncludeBanned(e.target.checked)}
            >
              显示已停用账号
            </Checkbox>
          </WrapItem>
        </Wrap>

        {!users ? (
          <Loader />
        ) : (
          <TableContainer>
            <UserTable
              users={users}
              setUserBeingEdited={setUserBeingEdited}
              refetch={refetch}
            />
          </TableContainer>
        )}
      </Flex>
    </>
  );
}, "用户");

function UserTable({
  users,
  setUserBeingEdited,
  refetch,
}: {
  users: UserWithMergeInfo[];
  setUserBeingEdited: (u: User | null) => void;
  refetch: () => void;
}) {
  const me = useMe();
  const { update: updateSession } = useSession();
  const router = useRouter();
  const utils = trpcNext.useContext();

  const startImpersonation = async (userId: string) => {
    // Invalidate all queries before impersonation to ensure fresh data
    await utils.invalidate();

    // If staying on the current page, permission denied error will pop up
    // as soon as the session is updated to a user without access to this page.
    await router.push("/");

    // https://next-auth.js.org/getting-started/client#updating-the-session
    const req: ImpersonationRequest = { impersonate: userId };
    await updateSession(req);
  };

  return (
    <Table size="sm">
      <Thead>
        <Tr>
          <Th>电子邮箱</Th>
          <Th>姓名</Th>
          <Th>偏好</Th>
          <Th>拼音</Th>
          <Th>角色</Th>
          <Th>假扮</Th>
          <Th>微信激活码</Th>
          <Th>ID</Th>
        </Tr>
      </Thead>
      <Tbody>
        {users.map((u) => (
          <Tr key={u.id} cursor="pointer" _hover={{ bg: "white" }}>
            <Td onClick={() => setUserBeingEdited(u)}>{u.email}</Td>

            <Td>
              <Link as={NextLink} href={`/profiles/${u.id}`}>
                <b>
                  {formatUserName(u.name, "formal")}
                  {me.id === u.id ? "（我）" : ""}
                </b>{" "}
                <ChevronRightIcon />
              </Link>
            </Td>

            <Td>
              <Link as={NextLink} href={`/preferences/${u.id}`}>
                偏好
              </Link>
            </Td>

            <Td onClick={() => setUserBeingEdited(u)}>
              {toPinyin(u.name ?? "")}
            </Td>

            {/* Roles */}
            <Td onClick={() => setUserBeingEdited(u)}>
              <Wrap>
                {u.roles.map((r: Role) => {
                  const rp = RoleProfiles[r];
                  return (
                    <WrapItem key={r}>
                      <Tag
                        color="white"
                        bgColor={
                          r == "Banned"
                            ? "gray"
                            : rp.privilegedUserDataAccess
                              ? "orange"
                              : "brand.c"
                        }
                      >
                        {rp.displayName}
                      </Tag>
                    </WrapItem>
                  );
                })}

                {u.mergedToUser && (
                  <WrapItem>
                    <Tag colorScheme="red">
                      已迁移至：{formatUserName(u.mergedToUser.name)}
                    </Tag>
                  </WrapItem>
                )}
              </Wrap>
            </Td>

            {/* Impersonate */}
            <Td>
              {me.id !== u.id && (
                <Link onClick={() => startImpersonation(u.id)}>
                  <TbSpy />
                </Link>
              )}
            </Td>

            {/* Send merge token */}
            <MergeTokenCell user={u} refetch={refetch} />

            {/* ID */}
            <Td>{u.id}</Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}

function UserEditor({
  user,
  onClose,
}: {
  user?: User; // When absent, create a new user.
  onClose: () => void;
}) {
  const u = user ?? {
    email: "",
    name: "",
    roles: [],
  };

  const myRoles = useMyRoles();
  const [email, setEmail] = useState(u.email);
  const [name, setName] = useState(u.name || "");
  const [roles, setRoles] = useState(u.roles);
  const [isSaving, setIsSaving] = useState(false);
  const validName = isValidChineseName(name);
  const validEmail = z.string().email().safeParse(email).success;

  const setRole = (e: any) => {
    if (e.target.checked) setRoles([...roles, e.target.value]);
    else setRoles(roles.filter((r) => r !== e.target.value));
  };

  const save = async () => {
    setIsSaving(true);
    try {
      if (user) {
        await trpc.users.update.mutate({
          ...user,
          email,
          name,
          roles,
        });
      } else {
        await trpc.users.create.mutate({ name, email, roles });
      }
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const deleteUser = async () => {
    if (user && window.confirm("确定要删除这个用户吗？")) {
      await trpc.users.destroy.mutate({ id: user.id });
      onClose();
    }
  };

  return (
    <ModalWithBackdrop isOpen onClose={onClose}>
      <ModalContent>
        <ModalHeader>{u.name}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={6}>
            <FormControl isRequired isInvalid={!validEmail}>
              <FormLabel>Email</FormLabel>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <FormErrorMessage>需要填写有效Email地址。</FormErrorMessage>
            </FormControl>
            <FormControl isRequired isInvalid={!validName}>
              <FormLabel>姓名</FormLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
              <FormErrorMessage>需要填写中文姓名。</FormErrorMessage>
            </FormControl>

            {isPermitted(myRoles, "UserManager") && (
              <FormControl>
                <FormLabel>角色</FormLabel>
                <Stack>
                  {AllRoles.map((r) => {
                    const rp = RoleProfiles[r];
                    return (
                      <Checkbox
                        key={r}
                        value={r}
                        isChecked={isPermitted(roles, r)}
                        onChange={setRole}
                      >
                        {rp.automatic ? "*" : ""} {rp.displayName}
                      </Checkbox>
                    );
                  })}
                </Stack>
              </FormControl>
            )}

            <FormControl>
              <small>* 是系统自动添加的角色。一般情况下请勿手工移除。</small>
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Flex justifyContent="space-between" width="100%">
            <Button variant="outline" colorScheme="red" onClick={deleteUser}>
              删除
            </Button>
            <Button
              variant="brand"
              isLoading={isSaving}
              onClick={save}
              isDisabled={!validEmail || !validName}
            >
              保存
            </Button>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>
  );
}
