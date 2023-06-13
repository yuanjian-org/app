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

const UserProfile: NextPageWithLayout = () => {
  const [userProfile, setUserProfile] = useState<IYuanjianUser | null>(null);
  const [name, setName] = useState<string | undefined>(' ');
  const [show, setShow] = useState(false);

  const handleUserProfile = async () => {
    tClientBrowser.user.profile.query({})
      .then((user) => {
        setUserProfile(user)
        setName(user.name)
      })
  };

  useEffect(() => {
    handleUserProfile()
  }, [show]);

  if (!userProfile) {
    return <Box>loading</Box>
  };

  const handleSubmit = async () => {
    if (name) {
      const updatedUser: IYuanjianUser = {
        id: userProfile.id,
        pinyin: name,
        name: name,
        email: userProfile.email,
        roles: userProfile.roles,
        clientId: userProfile.clientId,
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
            placeholder={userProfile.email}
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
