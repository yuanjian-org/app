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
} from "@chakra-ui/react";
import { useEffect, useMemo, useState } from "react";
import trpc, { trpcNext } from "../../trpc";
import Loader from "components/Loader";
import { componentSpacing } from "theme/metrics";
import { sectionSpacing } from "theme/metrics";
import { toast } from "react-toastify";
import { UserProfile } from "shared/UserProfile";
import invariant from "shared/invariant";
import { parseQueryString, shaChecksum } from "shared/strings";
import { useRouter } from "next/router";
import User, { getUserUrl, MinUser } from "shared/User";
import { markdownSyntaxUrl } from "components/MarkdownSupport";
import { ExternalLinkIcon, LockIcon } from "@chakra-ui/icons";
import { displayName, isPermitted } from "shared/Role";
import { encodeUploadTokenUrlSafe, UploadTarget } from "shared/jinshuju";
import { MdChangeCircle, MdCloudUpload } from "react-icons/md";
import _ from "lodash";
import FormHelperTextWithMargin from "components/FormHelperTextWithMargin";
import getBaseUrl from "shared/getBaseUrl";
import { useMyId, useMyRoles } from "useMe";
import { useSession } from "next-auth/react";
import NextLink from "next/link";
import { getEmbeddedFormUrl } from "pages/form";
import { encodeXField } from "shared/jinshuju";

export default function Page() {
  const queryUserId = parseQueryString(useRouter(), "userId");
  const myId = useMyId();
  const userId = queryUserId === "me" ? myId : queryUserId;
  const { update: updateSession } = useSession();

  const queryOpts = {
    // Avoid accidental override when switching between windows
    refetchOnWindowFocus: false,
    enabled: !!userId,
  };

  const { data: oldUser } = trpcNext.users.getFull.useQuery(
    userId ?? "",
    queryOpts,
  );
  const [user, setUser] = useState<User>();
  useEffect(() => setUser(oldUser), [oldUser]);

  const { data: old } = trpcNext.users.getUserProfile.useQuery(
    { userId },
    queryOpts,
  );
  const [profile, setProfile] = useState<UserProfile>();
  useEffect(() => setProfile(old?.profile), [old]);

  const save = async () => {
    invariant(user && profile, "!user || !profile on save");
    if (!_.isEqual(oldUser, user)) {
      await trpc.users.update.mutate(user);
      await updateSession();
    }
    if (!_.isEqual(old?.profile, profile)) {
      await trpc.users.setUserProfile.mutate({ userId: user.id, profile });
    }
  };

  const updateUser = (u: User) => {
    setUser(u);
    // Do not auto save, because it may violate the chinese name constraint
    // when the user is typing using Pinyin input method.
    // void save();
  };

  const updateProfile = (k: keyof UserProfile, v: string) => {
    const updated = {
      ...profile,
      [k]: v,
    };
    if (!v) delete updated[k];
    setProfile(updated);
    void save();
  };

  const [isSaving, setIsSaving] = useState(false);

  const onSave = async () => {
    setIsSaving(true);
    try {
      await save();
      toast.success("保存成功。");
    } finally {
      setIsSaving(false);
    }
  };

  const SaveButton = () => (
    <Button onClick={onSave} variant="brand" isLoading={isSaving}>
      保存
    </Button>
  );

  return !(user && profile) ? (
    <Loader />
  ) : (
    <VStack
      maxWidth="xl"
      align="start"
      spacing={componentSpacing}
      margin={sectionSpacing}
    >
      <Basic
        user={user}
        profile={profile}
        setUser={updateUser}
        setProfile={setProfile}
      />
      <SaveButton />

      <Divider my={componentSpacing} />

      <Picture
        user={user}
        profile={profile}
        updateProfile={updateProfile}
        SaveButton={SaveButton}
      />

      <Divider my={componentSpacing} />

      {isPermitted(user.roles, "Mentor") ? (
        <Mentor user={user} profile={profile} updateProfile={updateProfile} />
      ) : (
        <NonMentor profile={profile} updateProfile={updateProfile} />
      )}

      <SaveButton />

      <Link href={getUserUrl(user)} target="_blank">
        <HStack>
          <Text>查看展示效果</Text> <ExternalLinkIcon />
        </HStack>
      </Link>

      <Link href={`/who-can-see-my-data`} target="_blank">
        <HStack>
          <LockIcon /> <Text>谁能看到我的资料</Text>
        </HStack>
      </Link>
    </VStack>
  );
}

Page.title = "个人资料";

function Basic({
  user,
  profile,
  setUser,
  setProfile,
}: {
  user: User;
  profile: UserProfile;
  setUser: (u: User) => void;
  setProfile: (p: UserProfile) => void;
}) {
  return (
    <>
      <Heading size="md">基本信息</Heading>

      {isPermitted(user.roles, "Volunteer") && (
        <FormControl>
          <FormLabel>自定义URL</FormLabel>
          <FormHelperTextWithMargin>
            {displayName("Volunteer")}
            可以自定义
            <Link href={getUserUrl(user)} target="_blank">
              个人资料展示页
            </Link>
            的URL。URL只支持小写英文字母和数字。为了便于其他小伙伴记忆，建议使用中文真名的拼音
            {}或者英文昵称。
          </FormHelperTextWithMargin>
          <InputGroup>
            <InputLeftAddon bg="white">{getBaseUrl() + "/"}</InputLeftAddon>
            <Input
              bg="white"
              fontWeight="bold"
              value={user.url ?? ""}
              onChange={(e) =>
                setUser({
                  ...user,
                  url: e.target.value ? e.target.value : null,
                })
              }
            />
          </InputGroup>
        </FormControl>
      )}

      <FormControl isInvalid={!user.name}>
        <FormLabel>中文全名</FormLabel>
        <Input
          bg="white"
          value={user.name ?? ""}
          onChange={(e) =>
            setUser({
              ...user,
              name: e.target.value,
            })
          }
        />
        {!user.name && <FormErrorMessage>用户姓名不能为空</FormErrorMessage>}
      </FormControl>

      <FormControl>
        <FormLabel>昵称或英文名</FormLabel>
        <Input
          bg="white"
          value={profile.英文别名 ?? ""}
          onChange={(e) =>
            setProfile({
              ...profile,
              英文别名: e.target.value,
            })
          }
        />
      </FormControl>

      <FormControl display="flex" gap={componentSpacing}>
        <FormLabel>性别</FormLabel>
        <RadioGroup
          value={profile.性别 ?? ""}
          onChange={(v) =>
            setProfile({
              ...profile,
              性别: v,
            })
          }
        >
          <Stack direction="row">
            <Radio bg="white" value="男">
              男
            </Radio>
            <Radio bg="white" value="女">
              女
            </Radio>
          </Stack>
        </RadioGroup>
      </FormControl>
    </>
  );
}

/**
 * We use the checksum not only as a security measure but also an e-tag to
 * prevent concurrent writes.
 *
 * TODO: It's a weak security measure because anyone who has access to the
 * mentor's profile can compute the hash. Use a stronger method.
 */
function encodeJinshujuXField(
  user: MinUser,
  profile: UserProfile,
  target: UploadTarget,
) {
  return encodeXField(
    user,
    encodeUploadTokenUrlSafe(target, user.id, shaChecksum(profile)),
  );
}

function Picture({
  user,
  profile,
  updateProfile,
  SaveButton,
}: {
  user: MinUser;
  profile: UserProfile;
  updateProfile: (k: keyof UserProfile, v: string) => void;
  SaveButton: React.ComponentType;
}) {
  invariant(profile, "!profile");
  const myRoles = useMyRoles();

  const uploadToken = useMemo(
    () => encodeJinshujuXField(user, profile, "UserProfilePicture"),
    [user, profile],
  );

  return (
    <>
      <Heading size="md">生活照</Heading>
      <FormControl>
        {profile.照片链接 && (
          <Image
            src={profile.照片链接}
            alt="照片"
            maxW="300px"
            my={componentSpacing}
          />
        )}

        <Link as={NextLink} href={getEmbeddedFormUrl("Bz3uSO", uploadToken)}>
          {profile.照片链接 ? (
            <HStack>
              <MdChangeCircle />
              <Text>更换照片</Text>
            </HStack>
          ) : (
            <HStack>
              <MdCloudUpload />
              <Text>上传照片</Text>
            </HStack>
          )}
        </Link>

        <FormHelperTextWithMargin>
          建议选择面部清晰、不戴墨镜的近照
        </FormHelperTextWithMargin>

        {isPermitted(myRoles, "UserManager") && (
          <>
            <FormHelperTextWithMargin>
              <Text color="red.700">
                以下链接仅
                {displayName("UserManager")}
                可见，用于在个别情况下直接引用其他网站的图像：
              </Text>
            </FormHelperTextWithMargin>
            <Input
              bg="white"
              value={profile.照片链接 || ""}
              mb={componentSpacing}
              onChange={(ev) => updateProfile("照片链接", ev.target.value)}
            />
            <SaveButton />
          </>
        )}
      </FormControl>
    </>
  );
}

function Video({ user, profile }: { user: MinUser; profile: UserProfile }) {
  invariant(profile, "!profile");

  const uploadToken = useMemo(
    () => encodeJinshujuXField(user, profile, "UserProfileVideo"),
    [user, profile],
  );

  return (
    <>
      {profile.视频链接 && (
        // Allows user to download their own video.
        <video
          src={profile.视频链接}
          controls
          style={{
            maxWidth: "300px",
            marginTop: `${componentSpacing * 4}px`,
            marginBottom: `${componentSpacing * 4}px`,
          }}
        />
      )}

      <Link as={NextLink} href={getEmbeddedFormUrl("nhFsf1", uploadToken)}>
        {profile.视频链接 ? (
          <HStack>
            <MdChangeCircle />
            <Text>更换视频</Text>
          </HStack>
        ) : (
          <HStack>
            <MdCloudUpload />
            <Text>上传视频</Text>
          </HStack>
        )}
      </Link>
    </>
  );
}

function NonMentor({
  profile,
  updateProfile,
}: {
  profile: UserProfile;
  updateProfile: (k: keyof UserProfile, v: string) => void;
}) {
  return (
    <>
      <Heading size="md">个人资料</Heading>
      <Text>
        <MarkdownSupported />
      </Text>
      <PositionFormControl profile={profile} updateProfile={updateProfile} />
      <CityFormControl profile={profile} updateProfile={updateProfile} />
      <CareerFormControl profile={profile} updateProfile={updateProfile} />
      <HobbyFormControl profile={profile} updateProfile={updateProfile} />
      <DailyLifeFormControl profile={profile} updateProfile={updateProfile} />
    </>
  );
}

function MarkdownSupported() {
  return (
    <>
      所有文字均支持
      <Link target="_blank" href={markdownSyntaxUrl}>
        {" "}
        Markdown 格式
      </Link>
      。
    </>
  );
}

function PositionFormControl({
  profile,
  updateProfile,
  highlight,
}: {
  profile: UserProfile;
  updateProfile: (k: keyof UserProfile, v: string) => void;
  highlight?: boolean;
}) {
  return (
    <FormControl>
      <FormLabel>雇主与职位 {highlight && <Highlight />}</FormLabel>
      <FormHelperTextWithMargin>
        比如甲公司人事处处长、餐饮业创业者等
      </FormHelperTextWithMargin>
      <Input
        bg="white"
        value={profile.身份头衔 || ""}
        onChange={(ev) => updateProfile("身份头衔", ev.target.value)}
      />
    </FormControl>
  );
}

function CityFormControl({
  profile,
  updateProfile,
  highlight,
}: {
  profile: UserProfile;
  updateProfile: (k: keyof UserProfile, v: string) => void;
  highlight?: boolean;
}) {
  return (
    <FormControl>
      <FormLabel>现居住城市或地区 {highlight && <Highlight />}</FormLabel>
      <Input
        bg="white"
        value={profile.现居住地 || ""}
        onChange={(ev) => updateProfile("现居住地", ev.target.value)}
      />
    </FormControl>
  );
}

function HobbyFormControl({
  profile,
  updateProfile,
}: {
  profile: UserProfile;
  updateProfile: (k: keyof UserProfile, v: string) => void;
}) {
  return (
    <FormControl>
      <FormLabel>业余爱好和特长、个人网站或自媒体账号等</FormLabel>
      <Textarea
        bg="white"
        height={140}
        value={profile.爱好与特长 || ""}
        onChange={(ev) => updateProfile("爱好与特长", ev.target.value)}
      />
    </FormControl>
  );
}

function CareerFormControl({
  profile,
  updateProfile,
  highlight,
}: {
  profile: UserProfile;
  updateProfile: (k: keyof UserProfile, v: string) => void;
  highlight?: boolean;
}) {
  return (
    <FormControl>
      <FormLabel>职业经历和网站 {highlight && <Highlight />}</FormLabel>
      <FormHelperTextWithMargin>
        <ListAndMarkdownSupport />
        ，比如：
        <br />
        <br />
        * 经历1
        <br />
        * 经历2
        <br />* 领英：linkedin.com/in/user
      </FormHelperTextWithMargin>
      <Textarea
        bg="white"
        height={140}
        value={profile.职业经历 || ""}
        onChange={(ev) => updateProfile("职业经历", ev.target.value)}
      />
    </FormControl>
  );
}

function DailyLifeFormControl({
  profile,
  updateProfile,
}: {
  profile: UserProfile;
  updateProfile: (k: keyof UserProfile, v: string) => void;
}) {
  return (
    <FormControl>
      <FormLabel>目前的日常和生活趣事</FormLabel>
      <FormHelperTextWithMargin>
        比如业余活动、好玩儿或独特的经历、家中宠物等
      </FormHelperTextWithMargin>
      <Textarea
        bg="white"
        height={140}
        value={profile.生活日常 || ""}
        onChange={(ev) => updateProfile("生活日常", ev.target.value)}
      />
    </FormControl>
  );
}

function Mentor({
  user,
  profile,
  updateProfile,
}: {
  user: MinUser;
  profile: UserProfile;
  updateProfile: (k: keyof UserProfile, v: string) => void;
}) {
  return (
    <>
      <Heading size="md">导师信息</Heading>
      <Text>
        这些信息是学生了解导师的重要渠道，是他们了解并选择
        <Link target="_blank" href="/s/match">
          与你匹配
        </Link>
        的唯一渠道，因此请详尽填写，并展示你在生活中的丰富个性，而不只是职场中的剪影。
        <MarkdownSupported />
      </Text>

      <FormControl>
        <FormLabel>
          视频介绍 <Highlight />
        </FormLabel>
        <FormHelperTextWithMargin>
          <Text style={{ display: "inline" }} color="red.700">
            强烈建议
          </Text>
          上传长度约1-2分钟的视频，以便学生直观感受你的沟通方式。
          这将很大程度提高匹配的成功率和满意度。
          内容可包括坐标、职业、性格、擅长聊的话题等等。
          <Link target="_blank" href="/weihan">
            参考示例
          </Link>
          。
        </FormHelperTextWithMargin>
        <Video user={user} profile={profile} />
      </FormControl>

      <PositionFormControl
        profile={profile}
        updateProfile={updateProfile}
        highlight
      />

      <FormControl>
        <FormLabel>
          专业领域 <Highlight />
        </FormLabel>
        <FormHelperTextWithMargin>
          比如金融、电子工程、教育学专业等
        </FormHelperTextWithMargin>
        <Input
          bg="white"
          value={profile.专业领域 || ""}
          onChange={(ev) => updateProfile("专业领域", ev.target.value)}
        />
      </FormControl>

      <CityFormControl
        profile={profile}
        updateProfile={updateProfile}
        highlight
      />

      <FormControl>
        <FormLabel>成长过程中曾经居住的城市或地区</FormLabel>
        <Input
          bg="white"
          value={profile.曾居住地 || ""}
          onChange={(ev) => updateProfile("曾居住地", ev.target.value)}
        />
      </FormControl>

      {/* <FormControl>
      <FormLabel>擅长辅导领域</FormLabel>
      <Input bg="white" value={profile.擅长辅导领域 || ""} 
        onChange={ev => updateProfile('擅长辅导领域', ev.target.value)}
      />
    </FormControl> */}

      <FormControl>
        <FormLabel>
          擅长聊天话题 <Highlight />
        </FormLabel>
        <FormHelperTextWithMargin>
          擅长或喜欢“八卦”的事情，比如时事新闻、中国历史、哲学思辨、网游桌游……
        </FormHelperTextWithMargin>
        <Textarea
          bg="white"
          height={140}
          value={profile.擅长话题 || ""}
          onChange={(ev) => updateProfile("擅长话题", ev.target.value)}
        />
      </FormControl>

      <FormControl>
        <FormLabel>
          成长过程中的亮点、难忘的经历、或曾经给你重要影响的事或人 <Highlight />
        </FormLabel>
        <Textarea
          bg="white"
          height={140}
          value={profile.成长亮点 || ""}
          onChange={(ev) => updateProfile("成长亮点", ev.target.value)}
        />
      </FormControl>

      <CareerFormControl
        profile={profile}
        updateProfile={updateProfile}
        highlight
      />

      <FormControl>
        <FormLabel>教育经历</FormLabel>
        <FormHelperTextWithMargin>
          大学及以上，也鼓励填写更早的经历。
          <ListAndMarkdownSupport />。
        </FormHelperTextWithMargin>
        <Textarea
          bg="white"
          height={140}
          value={profile.教育经历 || ""}
          onChange={(ev) => updateProfile("教育经历", ev.target.value)}
        />
      </FormControl>

      <FormControl>
        <FormLabel>个性特点</FormLabel>
        <Textarea
          bg="white"
          height={140}
          value={profile.个性特点 || ""}
          onChange={(ev) => updateProfile("个性特点", ev.target.value)}
        />
      </FormControl>

      <HobbyFormControl profile={profile} updateProfile={updateProfile} />

      <FormControl>
        <FormLabel>喜爱的图书、影视作品、网站、自媒体账号等</FormLabel>
        <Textarea
          bg="white"
          height={140}
          value={profile.喜爱读物 || ""}
          onChange={(ev) => updateProfile("喜爱读物", ev.target.value)}
        />
      </FormControl>

      <DailyLifeFormControl profile={profile} updateProfile={updateProfile} />
    </>
  );
}

function Highlight() {
  return (
    <Tag ms={2} size="sm" colorScheme="green">
      首页亮点
    </Tag>
  );
}

function ListAndMarkdownSupport() {
  return (
    <>
      可用以星号开头的列表格式或
      <Link target="_blank" href={markdownSyntaxUrl}>
        其他 Markdown 格式
      </Link>
    </>
  );
}
