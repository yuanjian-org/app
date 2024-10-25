import {
  FormControl,
  FormLabel,
  VStack,
  Input,
  FormHelperText,
  FormErrorMessage,
  Button,
  RadioGroup,
  Radio,
  Stack,
} from '@chakra-ui/react';
import { useState } from 'react';
import trpc from "../trpc";
import { useUserContext } from 'UserContext';
import Loader from 'components/Loader';
import { componentSpacing } from 'theme/metrics';
import { sectionSpacing } from 'theme/metrics';
import { toast } from "react-toastify";

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
      toast.success("保存成功。");
    } finally {
      setIsLoading(false);
    }
  };
  
  return <VStack spacing={componentSpacing} maxWidth="sm" 
    margin={sectionSpacing}>
    <FormControl>
      <FormLabel>邮箱</FormLabel>
      <Input value={user.email} readOnly />
      <FormHelperText>如需更改邮箱，请联系系统管理员</FormHelperText>
    </FormControl>

    <FormControl>
      <FormLabel>微信</FormLabel>
      <Input background="white" 
        value={newWechat} onChange={e => setNewWechat(e.target.value)} />
    </FormControl>    
    
    <FormControl isInvalid={!newName}>
      <FormLabel>中文全名</FormLabel>
      <Input background="white"
        value={newName} onChange={e => setNewName(e.target.value)}/>
      {!newName && <FormErrorMessage>用户姓名不能为空</FormErrorMessage>}
    </FormControl>

    <FormControl display="flex" gap={componentSpacing}>
      <FormLabel>性别</FormLabel>
      <RadioGroup value={newSex} onChange={setNewSex}>
        <Stack direction="row">
          <Radio background="white" value="男">男</Radio>
          <Radio background="white" value="女">女</Radio>
        </Stack>
      </RadioGroup>
    </FormControl>

    <FormControl>
      <FormLabel>居住的中国城市或者国家+城市</FormLabel>
      <Input background="white" 
        value={newCity} onChange={e => setNewCity(e.target.value)} />
    </FormControl>           
    <Button onClick={handleSubmit} variant="brand">保存</Button>
    {isLoading && <Loader loadingText='保存中...'/>}
  </VStack>;
}
