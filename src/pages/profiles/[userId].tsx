import {
  FormControl,
  FormLabel,
  VStack,
  Input,
  Button,
  Textarea,
  Text,
  Link,
  Divider,
  Heading,
  Image,
  HStack,
  Tag,
  Stack,
  RadioGroup,
  Radio,
  FormErrorMessage,
  InputGroup,
  InputLeftAddon,
} from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import trpc, { trpcNext } from "../../trpc";
import { useUserContext } from 'UserContext';
import Loader from 'components/Loader';
import { componentSpacing } from 'theme/metrics';
import { sectionSpacing } from 'theme/metrics';
import { toast } from "react-toastify";
import { UserProfile } from 'shared/UserProfile';
import invariant from "tiny-invariant";
import {
  parseQueryStringOrUnknown, shaChecksum 
} from 'shared/strings';
import { useRouter } from 'next/router';
import User, { getUserUrl } from 'shared/User';
import { markdownSyntaxUrl } from 'components/MarkdownSupport';
import { ExternalLinkIcon, LockIcon } from '@chakra-ui/icons';
import { isPermitted, RoleProfiles } from 'shared/Role';
import { encodeUploadTokenUrlSafe } from 'shared/upload';
import { MdChangeCircle, MdCloudUpload } from 'react-icons/md';
import _ from 'lodash';
import FormHelperTextWithMargin from 'components/FormHelperTextWithMargin';
import { CropImageModal } from 'components/CropImageModal';
import getBaseUrl from 'shared/getBaseUrl';
import { ImageParams } from 'shared/UserProfile';

/**
 * The mentorId query parameter can be a user id or "me". The latter is to
 * allow a convenient URL to manage users' own mentor profiles.
 */
export default function Page() {
  const queryUserId = parseQueryStringOrUnknown(useRouter(), 'userId');
  const [me] = useUserContext();
  const userId = queryUserId === "me" ? me.id : queryUserId;

  const queryOpts = {
    // Avoid accidental override when switching between windows
    refetchOnWindowFocus: false
  };

  const { data: oldUser } = trpcNext.users.getFull.useQuery(userId, queryOpts);
  const [user, setUser] = useState<User>();
  useEffect(() => setUser(oldUser), [oldUser]);

  const { data: old } = 
    trpcNext.users.getUserProfile.useQuery({ userId }, queryOpts);
  const [profile, setProfile] = useState<UserProfile>();
  useEffect(() => setProfile(old?.profile), [old]);

  const updateProfile = (k: keyof UserProfile, v: any) => {
    invariant(profile);
    const updated = structuredClone(profile);
    if (v) updated[k] = v;
    else delete updated[k];
    setProfile(updated);
  };

  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    invariant(user && profile);
    setIsSaving(true);
    try {
      if (!_.isEqual(oldUser, user)) {
        await trpc.users.update.mutate(user);
      }
      if (!_.isEqual(old?.profile, profile)) {
        await trpc.users.setUserProfile.mutate({ userId, profile });
      }
      toast.success("保存成功。");
    } finally {
      setIsSaving(false);
    }
  };

  const SaveButton = () => (
    <Button onClick={save} variant="brand" isLoading={isSaving}>
      保存
    </Button>
  );

  return !(user && profile) ? <Loader /> : <VStack
    maxWidth="xl"
    align="start"
    spacing={componentSpacing} 
    margin={sectionSpacing}
  >
    <Basic
      user={user}
      profile={profile} 
      setUser={setUser}
      setProfile={setProfile}
    />
    <SaveButton />

    <Divider my={componentSpacing} />

    <Picture
      userId={userId}
      profile={profile}
      updateProfile={updateProfile}
      SaveButton={SaveButton}
    />

    <Divider my={componentSpacing} />

    {isPermitted(user.roles, 'Mentor') ?
      <Mentor
        profile={profile}
        updateProfile={updateProfile}
      />
      :
      <NonMentor
        profile={profile}
        updateProfile={updateProfile}
      />
    }

    <SaveButton />

    <Link href={getUserUrl(user)} target='_blank'>
      <HStack>
        <Text>查看展示效果</Text> <ExternalLinkIcon />
      </HStack>
    </Link>

    <Link href={`/who-can-see-my-data`} target='_blank'>
      <HStack>
        <LockIcon /> <Text>谁能看到我的资料</Text>
      </HStack>
    </Link>

  </VStack>;
}

Page.title = "个人资料";

function Basic({ user, profile, setUser, setProfile }: {
  user: User,
  profile: UserProfile,
  setUser: (u: User) => void,
  setProfile: (p: UserProfile) => void,
}) {
  return <>
    <Heading size="md">基本信息</Heading>
    <FormControl>
      <FormLabel>邮箱</FormLabel>
      <FormHelperTextWithMargin>如需更改，请联系
        {RoleProfiles.UserManager.displayName}。
      </FormHelperTextWithMargin>
      <Input value={user.email} readOnly />
    </FormControl>

    {isPermitted(user.roles, "Volunteer") && <FormControl>
      <FormLabel>自定义URL</FormLabel>
      <FormHelperTextWithMargin>
        {RoleProfiles.Volunteer.displayName}
        可以自定义
        <Link href={getUserUrl(user)} target='_blank'>
          个人资料展示页
        </Link>
        的URL。URL只支持小写英文字母和数字。为了便于其他小伙伴记忆，建议使用中文真名的拼音{
        }或者英文昵称。
      </FormHelperTextWithMargin>
      <InputGroup>
        <InputLeftAddon bg="white">{getBaseUrl() + '/'}</InputLeftAddon>
        <Input
          bg="white"
          fontWeight="bold"
          value={user.url ?? ""}
          onChange={e => setUser({
            ...user,
            url: e.target.value ? e.target.value : null,
          })}
        />
      </InputGroup>
    </FormControl>}

    <FormControl isInvalid={!user.name}>
      <FormLabel>中文全名</FormLabel>
      <Input
        bg="white"
        value={user.name ?? ""}
        onChange={e => setUser({
          ...user,
          name: e.target.value
        })}
      />
      {!user.name && <FormErrorMessage>用户姓名不能为空</FormErrorMessage>}
    </FormControl>

    <FormControl>
      <FormLabel>英文别名</FormLabel>
      <Input
        bg="white"
        value={profile.英文别名 ?? ""}
        onChange={e => setProfile({
          ...profile,
          英文别名: e.target.value
        })}
      />
    </FormControl>

    <FormControl>
      <FormLabel>微信</FormLabel>
      <Input
        bg="white" 
        value={user.wechat ?? ""}
        onChange={e => setUser({
          ...user,
          wechat: e.target.value
        })}
      />
    </FormControl>    

    <FormControl display="flex" gap={componentSpacing}>
      <FormLabel>性别</FormLabel>
      <RadioGroup
        value={profile.性别 ?? ""}
        onChange={v => setProfile({
          ...profile,
          性别: v
        })}
      >
        <Stack direction="row">
          <Radio bg="white" value="男">男</Radio>
          <Radio bg="white" value="女">女</Radio>
        </Stack>
      </RadioGroup>
    </FormControl>
  </>;
}

function Picture({ userId, profile, updateProfile, SaveButton }: {
  userId: string,
  profile: UserProfile,
  updateProfile: (k: keyof UserProfile, v: any) => void,
  SaveButton: React.ComponentType,
}) {
  const [me] = useUserContext();
  const [isCropImageModalOpen, setCropImageModalOpen] = useState(false);

  // We use the checksum not only as a security measure but also an e-tag to
  // prevent concurrent writes.
  // TODO: It's a weak security measure because anyone who has access to the
  // mentor's profile can compute the hash. Use a stronger method.
  const uploadToken = useMemo(() =>
    profile ? encodeUploadTokenUrlSafe("UserProfilePicture", userId,
      shaChecksum(profile)) : null, 
    [userId, profile]
  );

  const updateProfileImageParams = (x: number, y: number, zoom: number) => {
    updateProfile('照片参数', { x, y, zoom }); 
  };

  return <>
    <Heading size="md">生活照</Heading>
    <FormControl>
      {profile.照片链接 && <Image
        src={profile.照片链接}
        alt="照片"
        maxW='300px'
        my={componentSpacing}
      />}

      {uploadToken && <>
        <Link href={`https://jsj.ink/f/Bz3uSO?x_field_1=${uploadToken}`}>
          {profile.照片链接 ? 
            <HStack><MdChangeCircle /><Text>更换照片</Text></HStack>
          : 
            <HStack><MdCloudUpload /><Text>上传照片</Text></HStack>
          }
        </Link>
        {profile.照片链接 && 
          <HStack onClick={()=>setCropImageModalOpen(!isCropImageModalOpen)}>
            <MdChangeCircle /><Text>修改图像</Text>
          </HStack>
        }
        {isCropImageModalOpen && <CropImageModal 
          onClose={() => setCropImageModalOpen(false)} 
          imageUrl={profile.照片链接} onSave={updateProfileImageParams} />}
      </>}

      <FormHelperTextWithMargin>
        建议选择面部清晰、不戴墨镜的近照
      </FormHelperTextWithMargin>

      {isPermitted(me.roles, 'UserManager') && <>
        <FormHelperTextWithMargin>
          <Text color="red.700">以下链接仅
          {RoleProfiles.UserManager.displayName}
          可见，用于在个别情况下直接引用其他网站的图像：</Text>
        </FormHelperTextWithMargin>
        <Input bg="white" value={profile.照片链接 || ""} mb={componentSpacing}
          onChange={ev => updateProfile('照片链接', ev.target.value)}
        />
        <SaveButton />
      </>}
    </FormControl>
  </>;
}

function NonMentor({ profile, updateProfile }: {
  profile: UserProfile,
  updateProfile: (k: keyof UserProfile, v: string) => void,
}) {
  return <>
    <Heading size="md">个人资料</Heading>
    <Text><MarkdownSupported /></Text>
    <NoAutoSave />
    <PositionFormControl profile={profile} updateProfile={updateProfile} />
    <CityFormControl profile={profile} updateProfile={updateProfile} />
    <HobbyFormControl profile={profile} updateProfile={updateProfile} />
    <DailyLifeFormControl profile={profile} updateProfile={updateProfile} />
  </>;
}

function MarkdownSupported() {
  return <>
    所有文字均支持
    <Link target='_blank' href={markdownSyntaxUrl}>
      {' '}Markdown 格式
    </Link>。
  </>;
};

function NoAutoSave() {
  return <Text color="red.700" mb={sectionSpacing}>
    更新内容后务必点击“保存”。本页不支持自动保存。
  </Text>;
}

function PositionFormControl({ profile, updateProfile, highlight }: {
  profile: UserProfile,
  updateProfile: (k: keyof UserProfile, v: string) => void,
  highlight?: boolean,
}) {
  return <FormControl>
    <FormLabel>雇主与职位 {highlight && <Highlight />}</FormLabel>
    <FormHelperTextWithMargin>
      比如甲公司人事处处长、餐饮业创业者等
    </FormHelperTextWithMargin>
    <Input bg="white" value={profile.身份头衔 || ""} 
      onChange={ev => updateProfile('身份头衔', ev.target.value)}
    />
  </FormControl>;
}

function CityFormControl({ profile, updateProfile, highlight }: {
  profile: UserProfile,
  updateProfile: (k: keyof UserProfile, v: string) => void,
  highlight?: boolean,
}) {
  return <FormControl>
    <FormLabel>现居住城市或地区{highlight && <Highlight />}</FormLabel>
    <Input bg="white" value={profile.现居住地 || ""} 
      onChange={ev => updateProfile('现居住地', ev.target.value)}
    />
  </FormControl>;
}

function HobbyFormControl({ profile, updateProfile }: {
  profile: UserProfile,
  updateProfile: (k: keyof UserProfile, v: string) => void,
}) {
  return <FormControl>
    <FormLabel>业余爱好和特长</FormLabel>
    <Textarea bg="white" height={140} value={profile.爱好与特长 || ""} 
      onChange={ev => updateProfile('爱好与特长', ev.target.value)}
    />
  </FormControl>;
}

function DailyLifeFormControl({ profile, updateProfile }: {
  profile: UserProfile,
  updateProfile: (k: keyof UserProfile, v: string) => void,
}) {
  return <FormControl>
    <FormLabel>目前的生活日常</FormLabel>
    <FormHelperTextWithMargin>
      比如生活趣事、平常的业余活动、子女情况等
    </FormHelperTextWithMargin>
    <Textarea bg="white" height={140} value={profile.生活日常 || ""} 
      onChange={ev => updateProfile('生活日常', ev.target.value)}
    />
  </FormControl>;
}

function Mentor({ profile, updateProfile }: {
  profile: UserProfile,
  updateProfile: (k: keyof UserProfile, v: string) => void,
}) {
  return <>
    <Heading size="md">导师信息</Heading>
    <Text>
      这些信息是学生了解导师的重要渠道，是他们
      <Link target='_blank' href="/s/matchmaking">初次匹配</Link>
      时的唯一参考。请详尽填写，并展现出最真实的你。<MarkdownSupported />
    </Text>

    <NoAutoSave />

    <PositionFormControl profile={profile} updateProfile={updateProfile}
      highlight />

    <FormControl>
      <FormLabel>专业领域 <Highlight /></FormLabel>
      <FormHelperTextWithMargin>
        比如金融、电子工程、教育学专业等
      </FormHelperTextWithMargin>
      <Input bg="white" value={profile.专业领域 || ""} 
        onChange={ev => updateProfile('专业领域', ev.target.value)}
      />
    </FormControl>

    <CityFormControl profile={profile} updateProfile={updateProfile}
      highlight />

    <FormControl>
      <FormLabel>成长过程中曾经居住的城市或地区</FormLabel>
      <Input bg="white" value={profile.曾居住地 || ""} 
        onChange={ev => updateProfile('曾居住地', ev.target.value)}
      />
    </FormControl>

    <FormControl>
      <FormLabel>擅长辅导领域</FormLabel>
      <Input bg="white" value={profile.擅长辅导领域 || ""} 
        onChange={ev => updateProfile('擅长辅导领域', ev.target.value)}
      />
    </FormControl>

    <FormControl>
      <FormLabel>擅长聊天话题 <Highlight /></FormLabel>
      <FormHelperTextWithMargin>
        擅长或喜欢“八卦”的事情，比如时事新闻、中国历史、哲学思辨、网游桌游……
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
      <FormLabel>职业经历 <Highlight /></FormLabel>
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

    <HobbyFormControl profile={profile} updateProfile={updateProfile} />

    <FormControl>
      <FormLabel>喜爱的图书、影视作品、网站、自媒体账号等</FormLabel>
      <Textarea bg="white" height={140} value={profile.喜爱读物 || ""} 
        onChange={ev => updateProfile('喜爱读物', ev.target.value)}
      />
    </FormControl>

    <DailyLifeFormControl profile={profile} updateProfile={updateProfile} />
  </>;
}

function Highlight() {
  return <Tag ms={2} size="sm" colorScheme="green">首页亮点</Tag>;
}

function ListAndMarkdownSupport() {
  return <>
    可用以星号开头的列表格式或
    <Link target="_blank" href={markdownSyntaxUrl}>其他 Markdown 格式</Link>
  </>;
}
