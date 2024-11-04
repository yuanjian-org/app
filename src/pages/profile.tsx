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
import { useState, useEffect } from 'react';
import trpc, { trpcNext } from "../trpc";
import { useUserContext } from 'UserContext';
import Loader from 'components/Loader';
import { componentSpacing } from 'theme/metrics';
import { sectionSpacing } from 'theme/metrics';
import { toast } from "react-toastify";
import { Divider } from '@chakra-ui/react';
import DatePicker from "react-datepicker";
import { UserPreference, zUserPreference } from 'shared/User';
import { z } from 'zod';
import datePicker from 'theme/datePicker';

const oneMonthDate = new Date(new Date().setMonth(new Date().getMonth() + 1));
const threeMonthsDate = new Date(new Date().setMonth(new Date().getMonth() + 3));
type InterviewPref = z.TypeOf<typeof zUserPreference.shape.interviews>;

export default function Page() {
  const [user, setUser] = useUserContext();
  const [isLoading, setIsLoading] = useState(false);
  const [newName, setNewName] = useState(user.name || '');
  const [newSex, setNewSex] = useState(user.sex|| '');
  const [newCity, setNewCity] = useState(user.city || '');
  const [newWechat, setNewWechat] = useState(user.wechat || '');

  const { data: pref } = trpcNext.users.getUserPreference.useQuery({ userId: user.id });
  const [unsaved, setUnsaved] = useState<UserPreference>();
  useEffect(() => setUnsaved(pref), [pref]);

  const updateInterviewPref = (data: InterviewPref) => {
    if (data !== undefined) {
      const newPref = structuredClone(pref) || {};
      newPref.interviews = data;
      setUnsaved(newPref);
    }
  };

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
      await trpc.users.setUserPreference.mutate({ 
        userId: user.id, userPreference: unsaved || {} });
      toast.success("保存成功。");
    } finally {
      setIsLoading(false);
    }
  };
  
  return <VStack spacing={componentSpacing} maxWidth="lg" 
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

    <InterviewPreference data={unsaved?.interviews} 
      updateData={updateInterviewPref} /> 

    <Button onClick={handleSubmit} variant="brand">保存</Button>
    {isLoading && <Loader loadingText='保存中...'/>}
  </VStack>;
}

function InterviewPreference({ data, updateData } : {
  data: InterviewPref;
  updateData: (data: InterviewPref) => void;
}) {
  const until = data?.limit?.until ? new Date(data.limit.until) : oneMonthDate;
  const noMoreThan = data?.limit?.noMoreThan || 0;

  const setLimit = (noMoreThan: number, until: Date) => {
    if (noMoreThan !== undefined && until !== undefined) {
      const newData = structuredClone(data || {});
      newData.limit = { noMoreThan, until: until.toISOString() };
      updateData(newData);
    }
  };

  const removeLimit = () => {
    if (data !== undefined) {
      const newData = structuredClone(data);
      delete newData.limit;
      updateData(newData);
    }
  };

  const toggleOptIn = (optIn: boolean) => {
    updateData({
      ...data,
      optIn: optIn ? true : undefined,
    });
  };

  return <>
    <FormControl>
      <FormLabel>面试官偏好</FormLabel>
      <Checkbox isChecked={data?.optIn} 
        onChange={e => toggleOptIn(e.target.checked)}>
        我不是导师，但可以帮助面试学生。
      </Checkbox>
    </FormControl>

    <FormControl>
      <Flex wrap="wrap" alignItems="center">
        <Checkbox isChecked={!!data?.limit}
          onChange={e => e.target.checked ? setLimit(noMoreThan, until) : 
            removeLimit()}>
          面试限制：
        </Checkbox>在
        <DatePicker 
          selected={until}
          onChange={date => {
            const newDate = date || oneMonthDate;
            setLimit(noMoreThan, newDate);
          }}
          minDate={new Date()} maxDate={threeMonthsDate} disabled={!data?.limit}
          customInput={<Input {...datePicker} textAlign="center" />}
        />
        之前，我还可以参与
        <NumberInput 
          value={noMoreThan} 
          onChange={v => setLimit(Number.parseInt(v), until)}
          min={0} max={10} isDisabled={!data?.limit} maxW="60px" marginX={1}
         >
          <NumberInputField bgColor="white" />
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
