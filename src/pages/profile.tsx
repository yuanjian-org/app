import {
  FormControl,
  FormLabel,
  IconButton,
  VStack,
  Input,
  Select,
  Flex,
  FormHelperText,
  FormErrorMessage,
  Button,
} from '@chakra-ui/react';
import { useState } from 'react';
import trpc from "../trpc";
import { useUserContext } from 'UserContext';
import Loader from 'components/Loader';
import { componentSpacing } from 'theme/metrics';
import { EditIcon } from '@chakra-ui/icons';

export default function Page() {
  const [user, setUser] = useUserContext();
  const [updatedUser, setUpdatedUser] = useState({ ...user });
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleChange = (field: keyof typeof updatedUser, value: string) => {
    setUpdatedUser(prev => ({ ...prev, [field]: value ?? '' }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await trpc.users.update.mutate(updatedUser);
      setUser(updatedUser);
      setIsEditing(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setUpdatedUser({ ...user }); 
    setIsEditing(false); 
    setIsLoading(false);
  };
  
  return (
    <VStack spacing={componentSpacing}>
      <Field label="邮箱" value={user.email} 
        helperText="如需更改邮箱，请联系系统管理员" />
        {isEditing ? <>
          <FormControl isInvalid={!updatedUser.name}>
            <FormLabel>中文全名</FormLabel>
            <Input value={updatedUser.name ?? ''} 
              onChange={e => handleChange('name', e.target.value)}/>
             {!updatedUser.name &&
              <FormErrorMessage>用户姓名不能为空</FormErrorMessage>}
          </FormControl>

          <FormControl>
            <FormLabel>性别</FormLabel>
            <Select defaultValue={updatedUser.sex ?? ''}
              onChange={e => handleChange('sex', e.target.value)}>
              <option value="" disabled>选择性别</option> 
              <option value="male">男</option>
              <option value="female">女</option>
              </Select>
            </FormControl>

          <FormControl>
            <FormLabel>居住的中国城市或者国家+城市</FormLabel>
            <Input value={updatedUser.city ?? ''} 
              onChange={e => handleChange('city', e.target.value)} />
          </FormControl>

          <FormControl>
            <FormLabel>微信</FormLabel>
            <Input value={updatedUser.wechat ?? ''} 
              onChange={e => handleChange('wechat', e.target.value)} />
          </FormControl>           
            
          <Flex gap={componentSpacing}>
            <Button onClick={handleCancel}>取消</Button>
            <Button onClick={handleSubmit} colorScheme="green">保存</Button>
          </Flex>
        </>
         : 
        <>
          <Field label="中文全名" value={user.name ?? ''}  />
          <Field label="性别" 
            value={user.sex ? (user.sex === 'male' ? '男' : '女') : ''} />
          <Field label="居住的中国城市或者国家+城市" value={user.city ?? ''}  />
          <Field label="微信" value={user.wechat ?? ''}  />
          <IconButton icon={<EditIcon />} 
            onClick={() => setIsEditing(true)} aria-label="Edit" />
        </>
        }
      {isLoading && <Loader loadingText='保存中...'/>}
    </VStack>
  );
}

const Field = ({ label, value, helperText }: {
  label: string,
  value: string,
  helperText?: string
}) => {
  return <FormControl>
    <FormLabel>{label}</FormLabel>{value} 
    {helperText && <FormHelperText fontSize="sm" color="grey">{helperText}
      </FormHelperText>}
  </FormControl>;
};
