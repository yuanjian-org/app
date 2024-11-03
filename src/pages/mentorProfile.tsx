import {
  FormControl,
  FormLabel,
  VStack,
  Input,
  Button,
  Textarea,
  Text,
  Link,
  FormHelperText,
  Divider,
  Heading,
  Flex,
  NumberInput,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberInputField,
  NumberDecrementStepper,
  Checkbox,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import trpc, { trpcNext } from "../trpc";
import { useUserContext } from 'UserContext';
import Loader from 'components/Loader';
import { componentSpacing } from 'theme/metrics';
import { sectionSpacing } from 'theme/metrics';
import { toast } from "react-toastify";
import { MentorProfile } from 'shared/MentorProfile';
import invariant from "tiny-invariant";

export default function Page() {
  const [user] = useUserContext();
  const [isSaving, setIsSaving] = useState(false);
  const { data, isLoading } = trpcNext.users.getMentorProfile.useQuery({
    userId: user.id
  }, {
    // Avoid accidental override when switching between windows
    refetchOnWindowFocus: false
  });
  const [unsaved, setUnsaved] = useState<MentorProfile>();
  useEffect(() => setUnsaved(data), [data]);

  const updateUnsaved = (k: keyof MentorProfile, v: any) => {
    invariant(unsaved);
    const updated = structuredClone(unsaved);
    // @ts-ignore
    if (v !== undefined) updated[k] = v;
    else delete updated[k];
    setUnsaved(updated);
  };

  const save = async () => {
    invariant(unsaved);
    setIsSaving(true);
    try {
      await trpc.users.setMentorProfile.mutate({
        userId: user.id,
        mentorProfile: unsaved,
      });
      toast.success("保存成功。");
    } finally {
      setIsSaving(false);
    }
  };

  return isLoading || !unsaved ? <Loader /> : <VStack
    maxWidth="xl"
    align="start"
    spacing={componentSpacing} 
    margin={sectionSpacing}
  >
    <Heading size="md">导师偏好</Heading>

    <FormControl>
      <Flex align="center">
        我可以同时带
        <NumberInput background="white" size="sm" maxW={20} mx={1} min={0}
          value={unsaved.最多匹配学生 ?? 4} 
          onChange={v => updateUnsaved('最多匹配学生', Number.parseInt(v))}
        >
          <NumberInputField />
          <NumberInputStepper>
            <NumberIncrementStepper /><NumberDecrementStepper />
          </NumberInputStepper>
        </NumberInput>
        名学生。
      </Flex>
      <FormHelperText>
        强烈建议选择两名或以上。不同学生间的对比对导师理解学生非常有帮助。
        若希望避免匹配学生，请选择0。
      </FormHelperText>
    </FormControl>

    <FormControl>
      {/* TODO: remove this and use global styling */}
      <Checkbox sx={{ '.chakra-checkbox__control': { bg: 'white' } }}
        isChecked={unsaved.不参加就业辅导 ?? false}
        onChange={e => updateUnsaved('不参加就业辅导', e.target.checked)}
      >
        我暂不参与简历诊断、模拟面试等就业辅导类服务。
      </Checkbox>
    </FormControl>

    <Button onClick={save} variant="brand" isLoading={isSaving}>
      保存
    </Button>
    
    <Divider my={sectionSpacing} />

    <Heading size="md">展示信息</Heading>

    <Text mb={sectionSpacing}>
      以下信息是学生了解导师的重要渠道，也是他们
      <Link href="/s/matchmaking" target="_blank">填写初次匹配意向</Link>
      时的唯一参考。请详尽填写，并展现出最真实的你。
    </Text>

    <FormControl>
      <FormLabel>生活照链接</FormLabel>
      <UploadInstructions />
      <Input bg="white" value={unsaved.照片链接 || ""} 
        onChange={ev => updateUnsaved('照片链接', ev.target.value)}
      />
    </FormControl>
    <FormControl>
      <FormLabel>现居住地</FormLabel>
      <Input bg="white" value={unsaved.现居住地 || ""} 
        onChange={ev => updateUnsaved('现居住地', ev.target.value)}
      />
    </FormControl>
    <FormControl>
      <FormLabel>成年之前曾经居住过的地域</FormLabel>
      <Textarea bg="white" height={140} value={unsaved.曾居住地 || ""} 
        onChange={ev => updateUnsaved('曾居住地', ev.target.value)}
      />
    </FormControl>
    <FormControl>
      <FormLabel>受教育经历（大学及以上，也鼓励填写大学以前的经历；或在下方提供简历链接）</FormLabel>
      <Textarea bg="white" height={140} value={unsaved.教育经历 || ""} 
        onChange={ev => updateUnsaved('教育经历', ev.target.value)}
      />
    </FormControl>
    <FormControl>
      <FormLabel>职业经历（或在下方提供简历链接）</FormLabel>
      <Textarea bg="white" height={140} value={unsaved.职业经历 || ""} 
        onChange={ev => updateUnsaved('职业经历', ev.target.value)}
      />
    </FormControl>
    <FormControl>
      <FormLabel>简历链接</FormLabel>
      <UploadInstructions />
      <Input bg="white" value={unsaved.简历链接 || ""} 
        onChange={ev => updateUnsaved('简历链接', ev.target.value)}
      />
    </FormControl>
    <FormControl>
      <FormLabel>个性特点</FormLabel>
      <Textarea bg="white" height={140} value={unsaved.个性特点 || ""} 
        onChange={ev => updateUnsaved('个性特点', ev.target.value)}
      />
    </FormControl>
    <FormControl>
      <FormLabel>业余爱好和特长</FormLabel>
      <Textarea bg="white" height={140} value={unsaved.爱好与特长 || ""} 
        onChange={ev => updateUnsaved('爱好与特长', ev.target.value)}
      />
    </FormControl>
    <FormControl>
      <FormLabel>喜爱的图书、影视作品、网站、自媒体账号等</FormLabel>
      <Textarea bg="white" height={140} value={unsaved.喜爱读物 || ""} 
        onChange={ev => updateUnsaved('喜爱读物', ev.target.value)}
      />
    </FormControl>
    <FormControl>
      <FormLabel>目前生活的日常（比如生活趣事、平常的业余活动、婚姻及子女情况等）</FormLabel>
      <Textarea bg="white" height={140} value={unsaved.生活日常 || ""} 
        onChange={ev => updateUnsaved('生活日常', ev.target.value)}
      />
    </FormControl>
    <FormControl>
      <FormLabel>成长过程中的亮点、难忘的经历、或曾经给你重要影响的事或人</FormLabel>
      <Textarea bg="white" height={140} value={unsaved.成长亮点 || ""} 
        onChange={ev => updateUnsaved('成长亮点', ev.target.value)}
      />
    </FormControl>
    <FormControl>
      <FormLabel>擅长辅导领域</FormLabel>
      <Textarea bg="white" height={140} value={unsaved.擅长辅导领域 || ""} 
        onChange={ev => updateUnsaved('擅长辅导领域', ev.target.value)}
      />
    </FormControl>

    <Button onClick={save} variant="brand" isLoading={isSaving}>
      保存
    </Button>
  </VStack>;
}

function UploadInstructions() {
  return <FormHelperText mb={2}>
    上传文件至
    <Link href="https://jsj.ink/f/Bz3uSO" target='_blank'>此表格</Link>
    ，提交后访问<Link href="https://jsj.top/f/Bz3uSO/r/8AogTN" target='_blank'>
    此网页</Link>，点击第一行数据，在弹出的对话框中的文件上点击鼠标右键，
    拷贝文件链接，并复制到下面的输入框：
  </FormHelperText>;
}
