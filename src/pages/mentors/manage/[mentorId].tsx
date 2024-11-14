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
  Image,
  HStack,
  Tag,
} from '@chakra-ui/react';
import { PropsWithChildren, useEffect, useMemo, useState } from 'react';
import trpc, { trpcNext } from "../../../trpc";
import { useUserContext } from 'UserContext';
import Loader from 'components/Loader';
import { componentSpacing } from 'theme/metrics';
import { sectionSpacing } from 'theme/metrics';
import { toast } from "react-toastify";
import { MentorProfile } from 'shared/MentorProfile';
import invariant from "tiny-invariant";
import { formatUserName, parseQueryStringOrUnknown, shaChecksum } from 'shared/strings';
import { useRouter } from 'next/router';
import { defaultMentorCapacity, MentorPreference, UserPreference } from 'shared/User';
import MarkdownSupport from 'components/MarkdownSupport';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import { isPermitted } from 'shared/Role';
import { encodeUploadTokenUrlSafe } from 'shared/upload';
import { MdChangeCircle, MdCloudUpload } from 'react-icons/md';

/**
 * The mentorId query parameter can be a user id or "me". The latter is to
 * allow a convenient URL to manage users' own mentor profiles.
 */
export default function Page() {
  const queryUserId = parseQueryStringOrUnknown(useRouter(), 'mentorId');
  const [me] = useUserContext();
  const userId = queryUserId === "me" ? me.id : queryUserId;

  const { data: user } = trpcNext.users.get.useQuery(userId);

  /**
   * Code block that updates UserPreference.
   * TODO: Break it out into smaller functions.
   */

  const { data: oldPref } = 
    trpcNext.users.getUserPreference.useQuery({ userId }, {
    // Avoid accidental override when switching between windows
    refetchOnWindowFocus: false
  });
  const [pref, setPref] = useState<UserPreference>();
  useEffect(() => setPref(oldPref), [oldPref]);

  const updatePref = (k: keyof MentorPreference, v: any) => {
    invariant(pref);
    const updated = structuredClone(pref);
    if (!updated.mentor) updated.mentor = {};
    updated.mentor[k] = v;
    setPref(updated);
  };

  /**
   * Code block that updates MentorProfile
   */

  const { data: oldProfile } = 
    trpcNext.users.getMentorProfile.useQuery({ userId }, {
    // Avoid accidental override when switching between windows
    refetchOnWindowFocus: false
  });
  const [profile, setProfile] = useState<MentorProfile>();
  useEffect(() => setProfile(oldProfile), [oldProfile]);

  // We use the checksum not only as a security measure but also an e-tag to
  // prevent concurrent writes.
  // TODO: It's a weak security measure because anyone who has access to the
  // mentor's profile can compute the hash. Use a stronger method.
  const uploadToken = useMemo(() =>
    profile ? encodeUploadTokenUrlSafe("MentorProfilePicture", userId,
      shaChecksum(profile)) : null, 
    [userId, profile]
  );

  const updateProfile = (k: keyof MentorProfile, v: string) => {
    invariant(profile);
    const updated = structuredClone(profile);
    if (v) updated[k] = v;
    else delete updated[k];
    setProfile(updated);
  };

  /**
   * Code block that saves data to db
   */

  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    invariant(profile && pref);
    setIsSaving(true);
    try {
      await trpc.users.setUserPreference.mutate({ userId, preference: pref });
      await trpc.users.setMentorProfile.mutate({ userId, profile });
      toast.success("保存成功。");
    } finally {
      setIsSaving(false);
    }
  };

  return !(user && pref && profile) ? <Loader /> : <VStack
    maxWidth="xl"
    align="start"
    spacing={componentSpacing} 
    margin={sectionSpacing}
  >
    <Heading size="md">
      {userId === me.id ? "导师偏好" : formatUserName(user.name, "formal")}
    </Heading>

    <FormControl>
      <Flex align="center">
        我可以同时带
        <NumberInput background="white" size="sm" maxW={20} mx={1} min={0}
          value={pref.mentor?.最多匹配学生 ?? defaultMentorCapacity} 
          onChange={v => updatePref('最多匹配学生', Number.parseInt(v))}
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

    <FormControl>
      {/* TODO: remove this and use global styling */}
      <Checkbox sx={{ '.chakra-checkbox__control': { bg: 'white' } }}
        isChecked={pref.mentor?.不参加就业辅导 ?? false}
        onChange={e => updatePref('不参加就业辅导', e.target.checked)}
      >
        我暂不参与简历诊断、模拟面试等就业类服务，仅参加长期一对一服务。
      </Checkbox>
    </FormControl>

    <Button onClick={save} variant="brand" isLoading={isSaving}>
      保存
    </Button>

    <Divider my={componentSpacing} />

    <Heading size="md">生活照</Heading>
    
    <FormControl>
      {profile.照片链接 && <Link href={profile.照片链接} target='_blank'><Image
        src={profile.照片链接}
        alt="照片"
        maxW='300px'
        my={componentSpacing}
      /></Link>}

      {uploadToken && <>
        <Link href={`https://jsj.ink/f/Bz3uSO?x_field_1=${uploadToken}`}>
          {profile.照片链接 ? 
            <HStack><MdChangeCircle /><Text>更换照片</Text></HStack>
          : 
            <HStack><MdCloudUpload /><Text>上传照片</Text></HStack>
          }
        </Link>
      </>}

      {isPermitted(me.roles, 'MentorshipManager') && <>
        <FormHelperTextWithMargin>
          以下链接仅管理员可见：
        </FormHelperTextWithMargin>
        <Input bg="white" value={profile.照片链接 || ""} 
          onChange={ev => updateProfile('照片链接', ev.target.value)}
        />
      </>}
    </FormControl>

    <Divider my={componentSpacing} />

    <Heading size="md">展示信息</Heading>

    <Text>
      这些信息是学生了解导师的重要渠道，是他们
      <Link href="/s/matchmaking" target="_blank">初次匹配</Link>
      时的唯一参考。请详尽填写，并展现出最真实的你。
    </Text>

    <Text color="red.700">
      注意：更新内容后务必点击“保存”。本页不支持自动保存。
    </Text>

    <MarkdownSupport prefix="提示：所有内容均" />

    <FormControl mt={sectionSpacing}>
      <FormLabel>雇主与职位 <Highlight /></FormLabel>
      <FormHelperTextWithMargin>
        注明专业领域，比如甲公司人事处处长、餐饮业创业者等
      </FormHelperTextWithMargin>
      <Input bg="white" value={profile.身份头衔 || ""} 
        onChange={ev => updateProfile('身份头衔', ev.target.value)}
      />
    </FormControl>

    <FormControl>
      <FormLabel>现居住城市或地区 <Highlight /></FormLabel>
      <Input bg="white" value={profile.现居住地 || ""} 
        onChange={ev => updateProfile('现居住地', ev.target.value)}
      />
    </FormControl>

    <FormControl>
      <FormLabel>擅长聊天话题 <Highlight /></FormLabel>
      <FormHelperTextWithMargin>
        擅长或喜欢“八卦”的事情，比如事实新闻、中国历史、哲学思辨、网游桌游……
      </FormHelperTextWithMargin>
      <Textarea bg="white" height={140} value={profile.擅长话题 || ""} 
        onChange={ev => updateProfile('擅长话题', ev.target.value)}
      />
    </FormControl>

    <FormControl>
      <FormLabel>
        成长过程中的亮点、难忘的经历、或曾经给你重要影响的事或人 <Highlight />
      </FormLabel>
      <Textarea bg="white" height={140} value={profile.成长亮点 || ""} 
        onChange={ev => updateProfile('成长亮点', ev.target.value)}
      />
    </FormControl>

    <FormControl>
      <FormLabel>成长过程中曾经居住的城市或地区</FormLabel>
      <Textarea bg="white" height={140} value={profile.曾居住地 || ""} 
        onChange={ev => updateProfile('曾居住地', ev.target.value)}
      />
    </FormControl>

    <FormControl>
      <FormLabel>职业经历</FormLabel>
      <FormHelperTextWithMargin>
        <ListAndMarkdownSupport />，比如：<br /><br />
         * 经历1<br />
         * 经历2
      </FormHelperTextWithMargin>
      <Textarea bg="white" height={140} value={profile.职业经历 || ""} 
        onChange={ev => updateProfile('职业经历', ev.target.value)}
      />
    </FormControl>

    <FormControl>
      <FormLabel>教育经历</FormLabel>
      <FormHelperTextWithMargin>
        大学及以上，也鼓励填写更早的经历。<ListAndMarkdownSupport />。
      </FormHelperTextWithMargin>
      <Textarea bg="white" height={140} value={profile.教育经历 || ""} 
        onChange={ev => updateProfile('教育经历', ev.target.value)}
      />
    </FormControl>

    <FormControl>
      <FormLabel>个性特点</FormLabel>
      <Textarea bg="white" height={140} value={profile.个性特点 || ""} 
        onChange={ev => updateProfile('个性特点', ev.target.value)}
      />
    </FormControl>

    <FormControl>
      <FormLabel>业余爱好和特长</FormLabel>
      <Textarea bg="white" height={140} value={profile.爱好与特长 || ""} 
        onChange={ev => updateProfile('爱好与特长', ev.target.value)}
      />
    </FormControl>

    <FormControl>
      <FormLabel>喜爱的图书、影视作品、网站、自媒体账号等</FormLabel>
      <Textarea bg="white" height={140} value={profile.喜爱读物 || ""} 
        onChange={ev => updateProfile('喜爱读物', ev.target.value)}
      />
    </FormControl>

    <FormControl>
      <FormLabel>目前的生活日常</FormLabel>
      <FormHelperTextWithMargin>
        比如生活趣事、平常的业余活动、子女情况等
      </FormHelperTextWithMargin>
      <Textarea bg="white" height={140} value={profile.生活日常 || ""} 
        onChange={ev => updateProfile('生活日常', ev.target.value)}
      />
    </FormControl>

    <Button onClick={save} variant="brand" isLoading={isSaving}>
      保存
    </Button>

    <Text><Link href={`/mentors/${userId}`} target='_blank'>
      <HStack>
        <Text>查看展示效果</Text> <ExternalLinkIcon />
      </HStack>
    </Link></Text>
  </VStack>;
}

function Highlight() {
  return <Tag ms={2} size="sm" colorScheme="green">首页亮点</Tag>;
}

function ListAndMarkdownSupport() {
  return <>
    可用以星号开头的列表格式或
    <Link
      target="_blank"
      href="https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax"
    >其他 Markdown 格式</Link>
  </>;
}

/**
 * TODO: Use theme css instead
 */
function FormHelperTextWithMargin({ children } : PropsWithChildren) {
  return <FormHelperText mb={2}>{children}</FormHelperText>;
}

Page.title = "导师信息";
