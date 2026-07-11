import {
  Heading,
  Link,
  Text,
  Flex,
  Table,
  Th,
  Tr,
  Td,
  Thead,
  Tbody,
  TableContainer,
  UnorderedList,
  ListItem,
} from "@chakra-ui/react";
import { trpcNext } from "../trpc";
import Loader from "components/Loader";
import PageBreadcrumb from "components/PageBreadcrumb";
import Role, { allRoles, displayName, roleProfile } from "../shared/Role";
import { publicUrlPrefix } from "publicUrl";
import NextLink from "next/link";
import { getUserUrl } from "shared/User";
import useMe from "useMe";
import T from "components/T";
import getI18nProps from "components/getI18nProps";

export default function Page() {
  const { data: privileged } =
    trpcNext.users.listPriviledgedUserDataAccess.useQuery();

  return (
    <>
      <PageBreadcrumb current="谁能看到我的数据" />
      <Flex direction="column" gap={10}>
        <Text>
          <Link isExternal href={`https://yuantuapp.com${publicUrlPrefix}`}>
            <T>远图社会导师服务平台</T>
          </Link>
          （简称远图）致力保护个人隐私，仅收集供服务所需的最少信息。同时，我们严格控制数据的访问
          {}
          权限，仅授权提供服务所必需的、已经签署保密协议的远图工作人员。以下列出本网站所搜集的
          {}
          个人数据，以及已授权数据访问的人员名单。这些信息会随时间变化而调整，恕不另行通知。
          {}欢迎您随时访问本网页，查阅最新信息。如有任何问题，请随时
          <Link
            isExternal
            href="https://work.weixin.qq.com/kfid/kfcd32727f0d352531e"
          >
            <T>联系我们</T>
          </Link>
          。
        </Text>
        <Heading size="md">
          <T>特权角色和人员名单</T>
        </Heading>
        {privileged ? <Privileged privileged={privileged} /> : <Loader />}
        <Heading size="md">
          <T>数据访问权限</T>
        </Heading>
        <DataTable />
      </Flex>
    </>
  );
}

const dp = (r: Role) => <>{displayName(r)}</>;

function DataTable() {
  const me = useMe();

  return (
    <TableContainer>
      <Table>
        <Thead>
          <Tr>
            <Th>
              <T>数据</T>
            </Th>
            <Th>
              <T>可以访问该数据的角色</T>
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td>
              <T>姓名</T>
            </Td>
            <Td>
              {dp("UserAdmin")}、{dp("GroupAdmin")}、{dp("MentorshipAdmin")}、
              {dp("MentorshipOperator")}
              <T>、同一会议分组的其他成员</T>
            </Td>
          </Tr>
          <Tr>
            <Td>
              <T>电子邮箱</T>
            </Td>
            <Td>
              {dp("UserAdmin")}、{dp("GroupAdmin")}、{dp("MentorshipAdmin")}、
              {dp("MentorshipOperator")}
            </Td>
          </Tr>
          <Tr>
            <Td>
              <T>微信号、手机号</T>
            </Td>
            <Td>
              {dp("MentorshipAdmin")}、{dp("MentorshipOperator")}
            </Td>
          </Tr>
          <Tr>
            <Td>
              <T>其他</T>
              <Link as={NextLink} href={getUserUrl(me)}>
                <T>个人资料页</T>
              </Link>
              <T>展示的信息</T>
            </Td>
            <Td>
              {/* The content must be consistent with logic in the
                users.getUserProfile route */}
              <UnorderedList>
                <ListItem>
                  {dp("UserAdmin")}、{dp("MentorshipAdmin")}、{dp("Mentor")}
                </ListItem>
                <ListItem>
                  <T>如果你是</T>
                  {dp("Volunteer")}
                  <T>，则其他</T>
                  {dp("Volunteer")}
                  <T>可访问</T>
                </ListItem>
                <ListItem>
                  <T>如果你是</T>
                  {dp("Mentor")}
                  <T>，则已被录取的</T>
                  {dp("Mentee")}
                  <T>可访问</T>
                </ListItem>
              </UnorderedList>
            </Td>
          </Tr>
          <Tr>
            <Td>
              <T>一对一导师与学生通话的纪要文字</T>
            </Td>
            <Td>
              {dp("GroupAdmin")}、{dp("MentorshipAdmin")}
              {/* Removed dp("MentorshipAssessor") as the role is not currently used */}
            </Td>
          </Tr>
          <Tr>
            <Td>
              <T>其他会议的纪要文字</T>
            </Td>
            <Td>
              {dp("GroupAdmin")}
              <T>、同一会议分组的其他成员</T>
            </Td>
          </Tr>
        </Tbody>
      </Table>
    </TableContainer>
  );
}

function Privileged({
  privileged,
}: {
  privileged: {
    name: string | null;
    roles: Role[];
  }[];
}) {
  return (
    <TableContainer>
      <Table>
        <Thead>
          <Tr>
            <Th>
              <T>角色</T>
            </Th>
            <Th>
              <T>职责</T>
            </Th>
            <Th>
              <T>人员名单</T>
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {allRoles
            .filter((r) => roleProfile(r).privilegedUserDataAccess)
            // This role is currently not used.
            .filter((r) => r !== "MentorshipAssessor")
            .map((r) => (
              <Tr key={r}>
                <Td>{dp(r)}</Td>
                <Td>{roleProfile(r).actions}</Td>
                <Td>
                  {privileged
                    .filter((u: any) => u.roles.includes(r))
                    .map((u: any) => u.name)
                    .join("、")}
                </Td>
              </Tr>
            ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
}

Page.title = "谁能看到我的数据";
export const getStaticProps = getI18nProps;
