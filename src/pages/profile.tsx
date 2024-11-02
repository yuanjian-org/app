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
  Checkbox,
  Flex,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from '@chakra-ui/react';
import { useState } from 'react';
import trpc from "../trpc";
import { useUserContext } from 'UserContext';
import Loader from 'components/Loader';
import { componentSpacing } from 'theme/metrics';
import { sectionSpacing } from 'theme/metrics';
import { toast } from "react-toastify";
import { Divider } from '@chakra-ui/react';
import DatePicker from "react-datepicker";

const oneMonthDate = new Date(new Date().setMonth(new Date().getMonth() + 1));
const threeMonthsDate = new Date(new Date().setMonth(new Date().getMonth() + 3));
type Limit = {
  noMoreThan: number;
  until: string;
};

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

    <Divider margin={componentSpacing} />

    <InterviewPreference />

    <Button onClick={handleSubmit} variant="brand">保存</Button>
    {isLoading && <Loader loadingText='保存中...'/>}
  </VStack>;
}

function InterviewPreference({

} : {
  
}) {
  const [date, setDate] = useState(oneMonthDate);
  const [limit, setLimit] = useState<Limit | undefined>(undefined);

  return <>
    <FormControl>
      <FormLabel>面试官偏好</FormLabel>
      <Checkbox sx={{ '.chakra-checkbox__control': { bg: 'white' } }}>
        我不是导师，但可以帮助面试学生。
      </Checkbox>
    </FormControl>

    <FormControl>
      <Flex wrap="wrap" alignItems="center">
        <Checkbox 
          isChecked={limit !== undefined}
          onChange={() => setLimit(limit !== undefined ? 
            undefined : 
            { noMoreThan: 0,
              until: date.toDateString()
            }
          )}
          sx={{ '.chakra-checkbox__control': { bg: 'white' } }}>
          面试限制：
        </Checkbox>
        在
        <DatePicker 
          selected={date}
          onChange={date => setDate(date || oneMonthDate)}
          minDate={new Date()}
          maxDate={threeMonthsDate}
          disabled={limit === undefined}
          customInput={
            <Input 
              size="xs"
              maxW="90px" 
              marginLeft="2px"
              marginRight="2px"
              bgColor="white" 
              borderRadius="5px"
              textAlign="center" />}   
        />
        之前，我还可以参与
        <NumberInput 
          defaultValue={0} 
          min={0} 
          max={10} 
          isDisabled={limit === undefined}
          marginLeft="2px"
          marginRight="2px"
          size="xs"
          borderRadius="5px"
          maxW="55px" 
          bgColor="white">
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper /><NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>场面试。
      </Flex>
      <FormHelperText>
        请选择三个月以内的日期，届时面试次数限制将自动解除。
        如需在此期间避免所有面试，请将次数限制设置为 0。
      </FormHelperText>
    </FormControl>
  </>;
}
