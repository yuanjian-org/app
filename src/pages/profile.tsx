import {
  Box,
  Button,
  Icon,
  Input,
  Stack,
  InputGroup,
  InputLeftAddon,
  InputRightAddon,
  Alert,
  AlertIcon,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import AppLayout from 'AppLayout'
import { NextPageWithLayout } from '../NextPageWithLayout'
import trpc from "../trpc";
import { EditIcon, EmailIcon } from '@chakra-ui/icons';
import { toast } from "react-toastify";
import useUserContext from 'useUserContext';

// Dedupe code with index.tsx:SetNameModal
const UserProfile: NextPageWithLayout = () => {
  const [user, setUser] = useUserContext();
  const [name, setName] = useState<string>('');
  const [loaded, setLoaded] = useState(true);

  useEffect(() => {
    setName(user.name || '')
  }, [user]);

  const handleSubmit = async () => {
    setLoaded(false);

    if (name) {
      const updatedUser = structuredClone(user);
      updatedUser.name = name;

      // TODO: Handle error display globally. Redact server-side errors.
      try {
        await trpc.users.update.mutate(updatedUser);
        toast.success("个人信息已保存")
        setUser(updatedUser);
        setLoaded(true);
      } catch(e) {
        toast.error((e as Error).message);
        setLoaded(true);
      }
    }
  };

  return (
    <Box paddingTop={'80px'}>
      <Stack spacing={4}>
        <InputGroup>
          <InputLeftAddon>
            Email
          </InputLeftAddon>
          <Input
            placeholder={user.email}
            isReadOnly
          />
          <InputRightAddon>
            <Icon as={EmailIcon} color="gray.500" />
          </InputRightAddon>
        </InputGroup>
        <InputGroup>
          <InputLeftAddon>
            中文全名
          </InputLeftAddon>
          <Input
            backgroundColor={loaded ? 'white' : 'brandscheme'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            isReadOnly={!loaded}
          />
          <InputRightAddon>
            <Icon as={EditIcon} color="gray.500" />
          </InputRightAddon>
        </InputGroup>
        {!name && (
          <Alert status="error" mt={4}>
            <AlertIcon />
            用户姓名不能为空
          </Alert>
        )}
        {loaded && <Button
          backgroundColor='orange'
          onClick={handleSubmit}
          fontSize='sm' variant='brand' fontWeight='500' mb='24px'>
          保存
        </Button>}
      
        {!loaded && <Button
          backgroundColor="gray.500"
          disabled
          fontSize='sm' variant='brand' fontWeight='500' mb='24px'>
          保存中
        </Button>}
      </Stack>
    </Box>
  )
}

UserProfile.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default UserProfile;
