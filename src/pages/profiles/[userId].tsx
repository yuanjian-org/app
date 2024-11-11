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
  Heading,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import trpc, { trpcNext } from "../../trpc";
import { useUserContext } from 'UserContext';
import { componentSpacing } from 'theme/metrics';
import { sectionSpacing } from 'theme/metrics';
import { toast } from "react-toastify";
import { Divider } from '@chakra-ui/react';
import DatePicker from "react-datepicker";
import User, { InterviewerPreference, UserPreference } from 'shared/User';
import datePicker from 'theme/datePicker';
import { isPermitted } from 'shared/Role';
import { parseQueryStringOrUnknown } from 'shared/strings';
import { useRouter } from 'next/router';
import invariant from 'tiny-invariant';
import Loader from 'components/Loader';

export default function Page() {
  const queryUserId = parseQueryStringOrUnknown(useRouter(), 'userId');
  const [me] = useUserContext();
  const userId = queryUserId === "me" ? me.id : queryUserId;

  const { data: user } = trpcNext.users.getFull.useQuery(userId);
  const [unsavedUser, setUnsavedUser] = useState<User>();
  useEffect(() => setUnsavedUser(user), [user]);

  const { data: pref } = trpcNext.users.getUserPreference.useQuery(
    { userId });
  const [unsavedPref, setUnsavedPref] = useState<UserPreference>();
  useEffect(() => setUnsavedPref(pref), [pref]);

  const updateInterviewPref = (data: InterviewerPreference) => {
    const newPref = structuredClone(pref) || {};
    newPref.interviewer = data;
    setUnsavedPref(newPref);
  };

  const [isSaving, setIsSaving] = useState(false);
  const handleSubmit = async () => {
    invariant(unsavedUser);
    setIsSaving(true);
    try {
      await trpc.users.update.mutate(unsavedUser);
      await trpc.users.setUserPreference.mutate({ 
        userId,
        preference: unsavedPref || {}
      });
      toast.success("保存成功。");
    } finally {
      setIsSaving(false);
    }
  };

  return !unsavedUser || !unsavedPref ? <Loader /> : <VStack
    spacing={componentSpacing} maxWidth="lg" 
    margin={sectionSpacing} align="start"
  >
    <Heading size="md">基本信息</Heading>
    <FormControl>
      <FormLabel>邮箱</FormLabel>
      <Input value={unsavedUser.email} readOnly />
      <FormHelperText>如需更改邮箱，请联系管理员。</FormHelperText>
    </FormControl>

    <FormControl>
      <FormLabel>微信</FormLabel>
      <Input background="white" 
        value={unsavedUser.wechat ?? ""}
        onChange={e => setUnsavedUser({
          ...unsavedUser,
          wechat: e.target.value
        })}
      />
    </FormControl>    
    
    <FormControl isInvalid={!unsavedUser.name}>
      <FormLabel>中文全名</FormLabel>
      <Input background="white"
        value={unsavedUser.name ?? ""}
        onChange={e => setUnsavedUser({
          ...unsavedUser,
          name: e.target.value
        })}
      />
      {!unsavedUser.name && <FormErrorMessage>用户姓名不能为空</FormErrorMessage>}
    </FormControl>

    <FormControl display="flex" gap={componentSpacing}>
      <FormLabel>性别</FormLabel>
      <RadioGroup
        value={unsavedUser.sex ?? ""}
        onChange={v => setUnsavedUser({
          ...unsavedUser,
          sex: v
        })}
      >
        <Stack direction="row">
          <Radio background="white" value="男">男</Radio>
          <Radio background="white" value="女">女</Radio>
        </Stack>
      </RadioGroup>
    </FormControl>

    <FormControl>
      <FormLabel>居住城市或者地区</FormLabel>
      <Input background="white" 
        value={unsavedUser.city ?? ""}
        onChange={e => setUnsavedUser({
          ...unsavedUser,
          city: e.target.value
        })}
      />
    </FormControl>

    <Button isLoading={isSaving} onClick={handleSubmit} variant="brand">
      保存
    </Button>

    {/* Do not show interview options to non-mentor mentees */}
    {(isPermitted(unsavedUser.roles, "Mentor") ||
      !isPermitted(unsavedUser.roles, "Mentee")) && <>

      <Divider margin={componentSpacing} />
      
      <Heading size="md">面试官偏好</Heading>

      <InterviewPreferencePanel data={unsavedPref.interviewer} 
        updateData={updateInterviewPref} /> 

      <Button isLoading={isSaving} onClick={handleSubmit} variant="brand">
        保存
      </Button>
    </>}
  </VStack>;
}

function InterviewPreferencePanel({ data, updateData } : {
  data?: InterviewerPreference,
  updateData: (data: InterviewerPreference) => void,
}) {
  const oneMonthDate = new Date(new Date().setMonth(new Date().getMonth() + 1));
  const threeMonthsDate = new Date(new Date().setMonth(new Date().getMonth() + 3));
  const until = data?.limit?.until ? new Date(data.limit.until) : oneMonthDate;
  const noMoreThan = data?.limit?.noMoreThan || 0;

  const setLimit = (noMoreThan: number, until: Date) => {
    updateData({
      ...data,
      limit: {
        noMoreThan,
        until: until.toISOString(),
      }
    });
  };

  const removeLimit = () => {
    updateData({
      ...data,
      limit: undefined,
    });
  };

  const toggleOptIn = (optIn: boolean) => {
    updateData({
      ...data,
      optIn: optIn ? true : undefined,
    });
  };

  return <>
    <FormControl>
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
