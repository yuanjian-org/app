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
  IconButton,
  Tooltip,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from "@chakra-ui/react";
import { MdEdit, MdMoreVert } from "react-icons/md";
import { whiteLabel } from "shared/WhiteLabel";
import { useState } from "react";
import { trpcNext } from "../trpc";
import User, { UserWithMergeInfo } from "shared/User";
import ModalWithBackdrop from "components/ModalWithBackdrop";
import {
  formatUserName,
  isValidChineseName,
  isValidPhone,
} from "shared/strings";
import Role, { allRoles, isPermitted, roleProfile } from "shared/Role";
import trpc from "trpc";
import { AddIcon } from "@chakra-ui/icons";
import Loader from "components/Loader";
import z from "zod";
import NextLink from "next/link";
import { TbSpy } from "react-icons/tb";
import { useSession } from "next-auth/react";
import { ImpersonationRequest } from "./api/auth/[...nextauth]";
import { useRouter } from "next/router";
import useMe, { useMyRoles } from "useMe";
import { widePage } from "AppPage";

import { FullTextSearchBox } from "components/FullTextSearchBox";
import { useInfiniteScroll } from "components/useInfiniteScroll";
import { staticUrlPrefix } from "static";
import {
  useFeatures,
  useIsStaticConfigsReady,
} from "components/useStaticConfigs";

export default widePage(() => {
  const [includeMerged, setIncludeMerged] = useState(false);

  const [filter, setFilter] = useState<{
    matchesNameOrEmail?: string;
    ids?: string[];
  }>({});

  const {
    data: usersData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = trpcNext.users.list.useInfiniteQuery(
    {
      includeMerged,
      includeNonVolunteersMentors: true,
      returnMergeInfo: true,
      limit: 50,
      ...filter,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );

  const users = usersData?.pages.flatMap((page) => page.items);

  useInfiniteScroll({ hasNextPage, isFetchingNextPage, fetchNextPage });

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

          <WrapItem minW="300px">
            <FullTextSearchBox
              value={filter.matchesNameOrEmail ?? ""}
              setValue={(v) => setFilter(v ? { matchesNameOrEmail: v } : {})}
            />
          </WrapItem>
        </Wrap>

        {!users ? (
          <Loader />
        ) : (
          <TableContainer>
            <UserTable users={users} setUserBeingEdited={setUserBeingEdited} />
          </TableContainer>
        )}

        {isFetchingNextPage && <Loader />}
      </Flex>
    </>
  );
}, "用户");

function UserTable({
  users,
  setUserBeingEdited,
}: {
  users: UserWithMergeInfo[];
  setUserBeingEdited: (u: User | null) => void;
}) {
  const isDemo = whiteLabel === "demo";
  const me = useMe();
  const { update: updateSession } = useSession();
  const router = useRouter();
  const utils = trpcNext.useContext();

  if (!useIsStaticConfigsReady()) {
    return <Loader />;
  }

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
          <Th>姓名</Th>
          <Th>角色</Th>
          <Th>修改</Th>
          <Th>更多</Th>
          {!isDemo && <Th>假扮</Th>}
          <Th>手机号（唯一标识）</Th>
          <Th>电子邮箱</Th>
          <Th>微信UID</Th>
          <Th>ID</Th>
        </Tr>
      </Thead>
      <Tbody>
        {users.map((u) => (
          <Tr key={u.id} cursor="pointer" _hover={{ bg: "white" }}>
            {/* Name */}
            <Td>
              <Link as={NextLink} href={`/users/${u.id}`}>
                <b>
                  {formatUserName(u.name, "formal")}
                  {me.id === u.id ? "（我）" : ""}
                </b>
              </Link>
            </Td>

            {/* Roles */}
            <Td onClick={() => setUserBeingEdited(u)}>
              <Wrap>
                {u.roles.map((r: Role) => {
                  const rp = roleProfile(r);
                  return (
                    <WrapItem key={r}>
                      <Tag
                        color="white"
                        bgColor={
                          rp.privilegedUserDataAccess ? "orange" : "brand.c"
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

            {/* Edit */}
            <Td>
              <Tooltip label="编辑用户">
                <IconButton
                  aria-label="编辑用户"
                  icon={<MdEdit />}
                  size="sm"
                  variant="ghost"
                  onClick={() => setUserBeingEdited(u)}
                />
              </Tooltip>
            </Td>

            {/* More */}
            <Td>
              <Menu isLazy>
                <Tooltip label="更多">
                  <MenuButton
                    as={IconButton}
                    aria-label="更多"
                    icon={<MdMoreVert />}
                    size="sm"
                    variant="ghost"
                    onClick={(e) => e.stopPropagation()}
                  />
                </Tooltip>
                <MenuList zIndex={2}>
                  <MenuItem as={NextLink} href={`/profiles/${u.id}`}>
                    编辑个人资料
                  </MenuItem>
                  <MenuItem as={NextLink} href={`/preferences/${u.id}`}>
                    编辑偏好设置
                  </MenuItem>
                </MenuList>
              </Menu>
            </Td>

            {/* Impersonate */}
            {!isDemo && (
              <Td>
                {me.id !== u.id && (
                  <Tooltip label="假扮用户">
                    <IconButton
                      aria-label="假扮用户"
                      icon={<TbSpy />}
                      size="sm"
                      variant="ghost"
                      onClick={() => startImpersonation(u.id)}
                    />
                  </Tooltip>
                )}
              </Td>
            )}

            <Td onClick={() => setUserBeingEdited(u)}>{u.phone}</Td>
            <Td onClick={() => setUserBeingEdited(u)}>{u.email}</Td>
            <Td onClick={() => setUserBeingEdited(u)}>
              {u.wechatUnionId && "已设置"}
            </Td>
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
  user?: UserWithMergeInfo; // When absent, create a new user.
  onClose: () => void;
}) {
  const u = user ?? {
    phone: "",
    email: "",
    wechatUnionId: "",
    name: "",
    roles: [],
  };

  const myRoles = useMyRoles();
  const features = useFeatures();
  const [phone, setPhone] = useState(u.phone || "");
  const [email, setEmail] = useState(u.email || "");
  const [unionId, setUnionId] = useState(u.wechatUnionId || "");
  const [name, setName] = useState(u.name || "");
  const [roles, setRoles] = useState(u.roles);
  const [isSaving, setIsSaving] = useState(false);

  const validPhone = phone === "" || isValidPhone(phone);
  const validEmail =
    email === "" || z.string().email().safeParse(email).success;
  const validName = isValidChineseName(name);

  const setRole = (e: any) => {
    if (e.target.checked) setRoles([...roles, e.target.value]);
    else setRoles(roles.filter((r) => r !== e.target.value));
  };

  const save = async () => {
    const fields = {
      name,
      roles,
      // Set to null if empty
      email: email || null,
      phone: phone || null,
      wechatUnionId: unionId || null,
    };

    setIsSaving(true);
    try {
      if (user) {
        await trpc.users.update.mutate({ ...user, ...fields });
      } else {
        await trpc.users.create.mutate(fields);
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
            <FormControl isRequired isInvalid={!validName}>
              <FormLabel>姓名</FormLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
              <FormErrorMessage>需要填写中文姓名。</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!validPhone}>
              <FormLabel>
                <Link
                  href={`https://yuantuapp.com${staticUrlPrefix}/why-phone`}
                  isExternal
                >
                  手机号（唯一标识用户）
                </Link>
              </FormLabel>
              <Input
                type="tel"
                value={phone}
                placeholder="填写 +86138... +1650... 等国际号码格式"
                onChange={(e) => setPhone(e.target.value)}
              />
              <FormErrorMessage>需要填写有效手机号。</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!validEmail}>
              <FormLabel>Email</FormLabel>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <FormErrorMessage>需要填写有效Email地址。</FormErrorMessage>
            </FormControl>

            <FormControl>
              <FormLabel>微信UID</FormLabel>
              <Input
                value={unionId}
                onChange={(e) => setUnionId(e.target.value)}
              />
            </FormControl>

            {isPermitted(myRoles, "UserAdmin") && (
              <FormControl>
                <FormLabel>角色</FormLabel>
                <Stack>
                  {allRoles.map((r) => {
                    // This role is not currently used.
                    if (r === "MentorshipAssessor") return null;

                    // This role is curerntly only to display legacy senior
                    // mentors on the /mentors/manage page.
                    if (r === "SeniorMentor") return null;

                    if (!features.relational && r === "TransactionalMentor") {
                      return null;
                    }

                    if (!features.volunteers && r === "Volunteer") {
                      return null;
                    }

                    if (!features.interviews && r === "Interviewer") {
                      return null;
                    }

                    if (!features.projects && r === "ProjectAdmin") {
                      return null;
                    }

                    const rp = roleProfile(r);
                    return (
                      <Checkbox
                        key={r}
                        value={r}
                        isChecked={isPermitted(roles, r)}
                        onChange={setRole}
                      >
                        {rp.automatic ? "*" : ""} {rp.displayName}
                        {rp.privilegedUserDataAccess && (
                          <Tag size="sm" color="white" bgColor="orange" ml={2}>
                            特权
                          </Tag>
                        )}
                      </Checkbox>
                    );
                  })}
                </Stack>
              </FormControl>
            )}

            <FormControl>
              <small>* 是系统自动添加的角色。一般情况下请勿手工移除。</small>
            </FormControl>

            <FormControl>
              <small>
                <Tag size="sm" color="white" bgColor="orange" mr={1}>
                  特权
                </Tag>
                <Link as={NextLink} href="/who-can-see-my-data" isExternal>
                  访问此页面
                </Link>
                了解这些角色的数据访问权限。
              </small>
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
