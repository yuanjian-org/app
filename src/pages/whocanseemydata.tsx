import {
  Box,
  Heading,
  Link,
  VStack,
  Stack,
  Text,
  Flex,
  Table,
  Th,
  Tr,
  Td,
  Thead,
  Tbody,
} from '@chakra-ui/react';
import AppLayout from 'AppLayout';
import { NextPageWithLayout } from '../NextPageWithLayout';
import trpcNext from 'trpcNext';
import Loader from 'components/Loader';
import PageBreadcrumb from 'components/PageBreadcrumb';
import Role, { AllRoles, RoleProfiles } from '../shared/Role';

const Page: NextPageWithLayout = () => {
  const { data: privileged } = trpcNext.users.listPriviledged.useQuery();

  return (
    <Box paddingTop={'80px'}>
      <PageBreadcrumb current='谁能看到我的数据' parents={[{ name: '首页', link: '/' }]}/>
      <Flex marginLeft={{ md: "8%" }} marginRight={{ md: "15%" }} direction='column' gap={10}>
        <Text>
          <Link isExternal href='http://yuanjian.org'>远见教育基金会</Link>（远见）致力保护个人隐私，仅收集供服务所需的最少信息。
          同时，我们严格控制数据的访问权限，仅授权提供服务所必需的、已经签署保密协议的远见工作人员。以下列出本网站所搜集的个人数据，
          以及已授权数据访问的人员名单。这些信息会随时间变化而调整，恕不另行通知。欢迎您随时访问本网页，查阅最新信息。如有任何问题，请随时
          <Link isExternal href="mailto:hi@yuanjian.org">联系我们</Link>。
        </Text>
        <Heading size="md">人员角色和名单</Heading>
        {privileged ? <Privileged privileged={privileged} /> : <Loader />}
        <Heading size="md">数据类型和权限</Heading>
        <DataTable />
    </Flex>
  </Box>
  )
}

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

const dp = (r: Role) => <>{RoleProfiles[r].displayName}</>;

function DataTable() {
  return (
    <Table>
      <Thead>
        <Tr><Th>数据类型</Th><Th>访问权限</Th></Tr>
      </Thead>
      <Tbody>
        <Tr>
          <Td>姓名</Td>
          <Td>{dp('UserManager')}、{dp('GroupManager')}、{dp('SummaryEngineer')}、同一会议分组的其他成员</Td>
        </Tr>
        <Tr>
          <Td>电子邮箱</Td>
          <Td>{dp('UserManager')}、{dp('GroupManager')}</Td>
        </Tr>
        <Tr>
          <Td>会议转录文字</Td>
          <Td>{dp('SummaryEngineer')}、同一会议分组的其他成员（注：此类数据仅在网站内测期间搜集）</Td>
        </Tr>
        <Tr>
          <Td>会议摘要</Td>
          <Td>{dp('SummaryEngineer')}、同一会议分组的其他成员</Td>
        </Tr>
      </Tbody>
    </Table>
  );
}

function Privileged(props: any) {
  return (
    <Table>
      <Thead>
        <Tr><Th>角色</Th><Th>职责</Th><Th>人员名单</Th></Tr>
      </Thead>
      <Tbody>{
        AllRoles.map(r => <Tr key={r}>
          <Td>{dp(r)}</Td>
          <Td>{RoleProfiles[r].actions}</Td>
          <Td>{props.privileged
            .filter((u: any) => u.roles.includes(r))
            .map((u: any) => u.name)
            .join('、')}
          </Td>
        </Tr>)
      }</Tbody>
    </Table>
  );
}