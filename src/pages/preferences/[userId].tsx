import {
  FormControl,
  VStack,
  Input,
  FormHelperText,
  Button,
  Text,
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
import DatePicker from "react-datepicker";
import { defaultMentorCapacity, InterviewerPreference, MentorPreference,
  UserPreference
} from 'shared/User';
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

  const { data: oldPref } = trpcNext.users.getUserPreference.useQuery(
    { userId });
  const [pref, setPref] = useState<UserPreference>();
  useEffect(() => setPref(oldPref), [oldPref]);

  // TODO: Refactor updateInterviewerPref and updateMentorPref to follow the
  // same pattern.
  const updateInterviewerPref = (data: InterviewerPreference) => {
    invariant(pref);
    const updated = structuredClone(pref);
    updated.interviewer = data;
    setPref(updated);
  };

  const updateMentorPref = (k: keyof MentorPreference, v: any) => {
    invariant(pref);
    const updated = structuredClone(pref);
    if (!updated.mentor) updated.mentor = {};
    updated.mentor[k] = v;
    setPref(updated);
  };

  const [isSaving, setIsSaving] = useState(false);
  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await trpc.users.setUserPreference.mutate({ 
        userId,
        preference: pref || {}
      });
      toast.success("保存成功。");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user || !pref) return <Loader />;

  const isMentor = isPermitted(user.roles, "Mentor");
  const isMentee = isPermitted(user.roles, "Mentee");

  return <VStack
    spacing={componentSpacing}
    margin={sectionSpacing}
    maxWidth="lg"
    align="start"
  >
    {/* Do not show interview options to non-mentor mentees */}
    {isMentor || !isMentee ?
      <>
        <InterviewerPreferences data={pref.interviewer}
          updateData={updateInterviewerPref} isMentor={isMentor} />

        {isMentor &&
          <MentorPreferences data={pref.mentor} updateData={updateMentorPref} />
        }

        <Button isLoading={isSaving} onClick={handleSubmit} variant="brand">
          保存
        </Button>
      </>
      :
      <>
        <Heading size="md">偏好设置</Heading>
        <Text>您的角色尚无可设置的偏好。</Text>
      </>
    }
  </VStack>;
}

function InterviewerPreferences({ data, updateData, isMentor } : {
  data?: InterviewerPreference,
  updateData: (data: InterviewerPreference) => void,
  isMentor: boolean
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
    <Heading size="md">面试官偏好</Heading>

    {!isMentor &&
      <FormControl>
        <Checkbox isChecked={data?.optIn} 
          onChange={e => toggleOptIn(e.target.checked)}>
          我可以帮助面试学员。
        </Checkbox>
      </FormControl>
    }

    <FormControl mb={sectionSpacing}>
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
        将次数限制设置为 0 避免所有面试。在所选日期之后，面试限制将自动解除。  
      </FormHelperText>
    </FormControl>
  </>;
}


function MentorPreferences({ data, updateData } : {
  data?: MentorPreference,
  updateData: (k: keyof MentorPreference, v: any) => void,
}) {

  return <>
    <Heading size="md">导师偏好</Heading>

    <FormControl>
      <Flex align="center">
        我可以同时带
        <NumberInput background="white" size="sm" maxW={20} mx={1} min={0}
          value={data?.最多匹配学生 ?? defaultMentorCapacity} 
          onChange={v => updateData('最多匹配学生', Number.parseInt(v))}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper /><NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
        名学生。
      </Flex>
      <FormHelperText>
        强烈建议两名学生或以上，因为学生的横向对比对导师工作非常有帮助。
        若希望避免匹配学生，请选择0。
      </FormHelperText>
    </FormControl>

    <FormControl mb={sectionSpacing}>
      <Checkbox
        isChecked={data?.不参加就业辅导 ?? false}
        onChange={e => updateData('不参加就业辅导', e.target.checked)}
      >
        我暂不参与简历诊断、模拟面试等就业类服务，仅参加长期一对一服务。
      </Checkbox>
    </FormControl>
  </>;
}
