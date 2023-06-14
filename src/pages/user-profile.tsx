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
import AppLayout from 'layouts'
import { NextPageWithLayout } from '../NextPageWithLayout'
import tClientBrowser from "../tClientBrowser";
import { IYuanjianUser } from "../shared/user";
import { EditIcon, EmailIcon } from '@chakra-ui/icons';
import { toast } from "react-toastify";
import useUserInfo from 'useUserInfo';

const UserProfile: NextPageWithLayout = () => {
  const user = useUserInfo();
  const [name, setName] = useState<string>('');
  const [show, setShow] = useState(false);

  useEffect(() => {
    setName(user.name)
  }, [user]);

  const handleSubmit = async () => {
    if (name) {
      const updatedUser: IYuanjianUser = {
        id: user.id,
        pinyin: name,
        name: name,
        email: user.email,
        roles: user.roles,
        clientId: user.clientId,
      }

      tClientBrowser.user.updateProfile.mutate(updatedUser).then(
        res => {
          if (res === "ok") {
            console.log("user update succeeded")
            setShow(!show)
          }
        }
      ).catch(e => toast.error(e.message, { autoClose: false }))
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
            backgroundColor={show ? 'white' : 'brandscheme'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            isReadOnly={!show}
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
        {!show && <Button
          onClick={() => setShow(!show)}
          fontSize='sm' variant='brand' fontWeight='500' mb='24px'>
          修改个人信息
        </Button>}

        {show && <Button
          backgroundColor='orange'
          onClick={handleSubmit}
          fontSize='sm' variant='brand' fontWeight='500' mb='24px'>
          保存
        </Button>}
      </Stack>
    </Box>
  )
}

UserProfile.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default UserProfile;
