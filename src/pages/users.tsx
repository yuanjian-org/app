import {
  Box,
  Button,
  SimpleGrid,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Heading,
  Badge,
} from '@chakra-ui/react'
import React from 'react'
import AppLayout from 'AppLayout'
import { NextPageWithLayout } from '../NextPageWithLayout'
import tClientNext from "../tClientNext";

const Page: NextPageWithLayout = () => {
  const { data, refetch } = tClientNext.users.listUsers.useQuery();

  return (
    <Box paddingTop={'80px'}>
      <Heading as="h1" mb="3">用户管理</Heading>
      {!data && <Button isLoading={true} loadingText={'读取用户信息中...'} disabled={true} />}
      <SimpleGrid
        mb='20px'
        columns={1}
        spacing={{ base: '20px', xl: '20px' }}
      >
        {data &&
          <Table variant='striped'>
            <Thead>
              <Tr>
                <Th>电子邮箱</Th>
                <Th>姓名</Th>
                <Th>角色</Th>
                <Th>ID</Th>
              </Tr>
            </Thead>
            <Tbody>
              {data.users.map((item) => (
                <Tr key={item.id}>
                  <Td>{item.email}</Td>
                  <Td>{item.name}</Td>
                  <Td>{item.roles}</Td>
                  <Td>{item.id}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        }
      </SimpleGrid>
    </Box>
  )
}

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;
