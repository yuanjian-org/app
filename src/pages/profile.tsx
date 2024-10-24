import {
  FormControl,
  FormLabel,
  VStack,
  Input,
  Select,
  Flex,
  FormHelperText,
  FormErrorMessage,
  Button,
  Container,
} from '@chakra-ui/react';
import { useState } from 'react';
import trpc from "../trpc";
import { useUserContext } from 'UserContext';
import Loader from 'components/Loader';
import { componentSpacing } from 'theme/metrics';
import { sectionSpacing } from 'theme/metrics';

export default function Page() {
  const [user, setUser] = useUserContext();
  const [isLoading, setIsLoading] = useState(false);
  const [newName, setNewName] = useState(user.name || '');
  const [newSex, setNewSex] = useState(user.sex|| '');
  const [newCity, setNewCity] = useState(user.city || '');
  const [newWechat, setNewWechat] = useState(user.wechat || '');

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const updatedUser = structuredClone(user);
      updatedUser.name = newName;
      updatedUser.sex = newSex;
      updatedUser.city = newCity;
      updatedUser.wechat = newWechat;
      await trpc.users.update.mutate(updatedUser);
      setUser(updatedUser);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setNewName(user.name || '');
    setNewSex(user.sex || '');
    setNewCity(user.city || '');
    setNewWechat(user.wechat || '');
  };
  
  return <Container maxWidth="sm" marginTop={sectionSpacing}>
    <VStack spacing={componentSpacing}>
      <FormControl>
        <FormLabel>邮箱</FormLabel>
        {user.email} 
        <FormHelperText>如需更改邮箱，请联系系统管理员</FormHelperText>
      </FormControl>
    
      <FormControl isInvalid={!newName}>
        <FormLabel>中文全名</FormLabel>
        <Input value={newName} onChange={e => setNewName(e.target.value)}/>
        {!newName && <FormErrorMessage>用户姓名不能为空</FormErrorMessage>}
      </FormControl>

      <FormControl>
        <FormLabel>性别</FormLabel>
        <Select value={newSex} onChange={e => setNewSex(e.target.value)}>
          <option value="" disabled>选择性别</option>
          <option value="male">男</option>
          <option value="female">女</option>
        </Select>
      </FormControl>

      <FormControl>
        <FormLabel>居住的中国城市或者国家+城市</FormLabel>
        <Input value={newCity} onChange={e => setNewCity(e.target.value)} />
      </FormControl>

      <FormControl>
        <FormLabel>微信</FormLabel>
        <Input value={newWechat} onChange={e => setNewWechat(e.target.value)} />
      </FormControl>               
    
      <Flex gap={componentSpacing}>
        <Button onClick={handleCancel}>取消</Button>
        <Button onClick={handleSubmit} colorScheme="green">保存</Button>
      </Flex>
      {isLoading && <Loader loadingText='保存中...'/>}
    </VStack>
  </Container>;
}