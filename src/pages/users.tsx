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
  ModalHeader,
  ModalContent,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Text,
  VStack,
  FormErrorMessage,
  Stack,
  Checkbox,
  Badge,
  Icon,
} from '@chakra-ui/react'
import React, { useState } from 'react'
import AppLayout from 'AppLayout'
import { NextPageWithLayout } from '../NextPageWithLayout'
import trpcNext from "../trpcNext";
import UserProfile from 'shared/UserProfile';
import ModalWithBackdrop from 'components/ModalWithBackdrop';
import { isValidChineseName, toPinyin } from 'shared/string';
import Role, { AllRoles, RoleProfiles, isPermitted } from 'shared/Role';
import trpc from 'trpc';
import useUserContext from 'useUserContext';
import { MdEditNote } from 'react-icons/md';

const Page: NextPageWithLayout = () => {
  const { data, refetch } : { data: UserProfile[] | undefined, refetch: () => void } = trpcNext.users.list.useQuery();
  const [userBeingEdited, setUserBeingEdited] = useState<UserProfile | null>(null);
  const [user] = useUserContext();
  
  const closeUserEditor = () => {
    setUserBeingEdited(null);
    refetch();
  };

  return (
    <Box paddingTop={'80px'}>
      {userBeingEdited && <UserEditor user={userBeingEdited} onClose={closeUserEditor}/>}
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
                <Th>拼音</Th>
                <Th>角色</Th>
                <Th />
              </Tr>
            </Thead>
            <Tbody>
              {data.map((u: any) => (
                <Tr key={u.id} onClick={() => setUserBeingEdited(u)} cursor='pointer'>
                  <Td>{u.email}</Td>
                  <Td>{u.name} {user.id === u.id ? <Badge variant='brand' marginLeft={2}>本人</Badge> : <></>}</Td>
                  <Td>{toPinyin(u.name)}</Td>
                  <Td>{u.roles.map((r: Role) => RoleProfiles[r].displayName).join('、')}</Td>
                  <Td><Icon as={MdEditNote} /></Td>
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

function UserEditor(props: { 
  user: UserProfile,
  onClose: () => void,
}) {
  const u = props.user;
  const [email, setEmail] = useState(u.email);
  const [name, setName] = useState(u.name || '');
  const [roles, setRoles] = useState(u.roles);
  const [saving, setSaving] = useState(false);
  const validName = isValidChineseName(name);

  const setRole = (e: any) => {
    if (e.target.checked) setRoles([...roles, e.target.value]);
    else setRoles(roles.filter(r => r !== e.target.value));
  }

  const save = async () => {
    setSaving(true);
    try {
      const su = structuredClone(props.user);
      su.email = email;
      su.name = name;
      su.roles = roles;
      await trpc.users.update.mutate(su);
      props.onClose();
    } finally {
      setSaving(false);
    }
  }

  return <ModalWithBackdrop isOpen onClose={props.onClose}>
    <ModalContent>
      <ModalHeader>{u.name}</ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <VStack spacing={6}>
          <FormControl>
            <FormLabel>ID</FormLabel>
            <Text fontFamily='monospace'>{u.id}</Text>
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Email</FormLabel>
            <Input type='email' value={email} onChange={e => setEmail(e.target.value)} />
          </FormControl>
          <FormControl isRequired isInvalid={!validName}>
            <FormLabel>姓名</FormLabel>
            <Input value={name} onChange={e => setName(e.target.value)} />
            <FormErrorMessage>中文姓名无效。</FormErrorMessage>
          </FormControl>
          <FormControl>
            <FormLabel>角色</FormLabel>
            <Stack>
              {AllRoles.map(role => (
                <Checkbox key={role} value={role} isChecked={isPermitted(roles, role)} onChange={setRole}>
                  {RoleProfiles[role].displayName}（{role}）
                </Checkbox>
              ))}
            </Stack>
          </FormControl>
        </VStack>
      </ModalBody>
      <ModalFooter>
        <Button variant='brand' isLoading={saving} onClick={save}>保存</Button>
      </ModalFooter>
    </ModalContent>
  </ModalWithBackdrop>;
}
