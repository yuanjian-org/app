import { whiteLabel } from "shared/WhiteLabel";
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
  Stack,
  RadioGroup,
  Radio,
  FormErrorMessage,
  InputGroup,
  InputLeftAddon,
  Spinner,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import trpc, { trpcNext } from "../../trpc";
import Loader from "components/Loader";
import { componentSpacing } from "theme/metrics";
import { sectionSpacing } from "theme/metrics";
import { toast } from "react-toastify";
import { UserProfile } from "shared/UserProfile";
import invariant from "shared/invariant";
import { parseQueryString } from "shared/strings/parseQueryString";
import { useRouter } from "next/router";
import User, { getUserUrl, MinUser } from "shared/User";
import { markdownSyntaxUrl } from "components/MarkdownSupport";
import { ExternalLinkIcon, LockIcon } from "@chakra-ui/icons";
import { displayName, isPermitted } from "shared/Role";
import { MdChangeCircle, MdCloudUpload } from "react-icons/md";
import _ from "lodash";
import FormHelperTextWithMargin from "components/FormHelperTextWithMargin";
import getBaseUrl from "shared/getBaseUrl";
import MenteeProfileFields from "components/MenteeProfileFields";
import { useMyId, useMyRoles } from "useMe";
import { useSession } from "next-auth/react";
import { getEmbeddedFormUrl } from "pages/form";
import Select from "react-select";
import { UserProfilePictureLink } from "components/UserCards";
import { features } from "shared/Features";
import T from "components/T";

export default function Page() {
  const queryUserId = parseQueryString(useRouter(), "userId");
  const myId = useMyId();
  const userId = queryUserId === "me" ? myId : queryUserId;
  const { update: updateSession } = useSession();
  const enableOrgs = features.orgs;

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
      <T>保存</T>
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
      {enableOrgs && isPermitted(user.roles, "Mentor") && myId === user.id && (
        <Orgs user={user} />
      )}
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
        <>
          <Heading size="md">
            <T>导师信息</T>
          </Heading>
          <Text>
            这些信息是学生了解导师的重要渠道，是他们了解并选择
            <Link isExternal href="https://yuantuapp.com/s/match">
              <T>与你匹配</T>
            </Link>
            的唯一渠道，因此请详尽填写，并展示你在生活中的丰富个性，而不只是职场中的剪影。
            <MarkdownSupported />
          </Text>
        </>
      ) : (
        <>
          <Heading size="md">
            <T>个人资料</T>
          </Heading>
          <Text>
            <MarkdownSupported />
          </Text>
        </>
      )}

      {isPermitted(user.roles, "Mentee") && (
        <MenteeProfileFields profile={profile} updateProfile={updateProfile} />
      )}

      {isPermitted(user.roles, "Mentor") ? (
        <MentorProfileFields
          user={user}
          profile={profile}
          updateProfile={updateProfile}
        />
      ) : (
        <NonMentorProfileFields
          profile={profile}
          updateProfile={updateProfile}
        />
      )}

      <SaveButton />

      <Link href={getUserUrl(user)} isExternal>
        <HStack>
          <Text>
            <T>查看展示效果</T>
          </Text>{" "}
          <ExternalLinkIcon />
        </HStack>
      </Link>

      <Link href={`/who-can-see-my-data`} isExternal>
        <HStack>
          <LockIcon />{" "}
          <Text>
            <T>谁能看到我的资料</T>
          </Text>
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
      <Heading size="md">
        <T>基本信息</T>
      </Heading>

      {isPermitted(user.roles, "Volunteer") && (
        <FormControl>
          <FormLabel>
            <T>自定义URL</T>
          </FormLabel>
          <FormHelperTextWithMargin>
            {displayName("Volunteer")}
            <T>可以自定义</T>
            <Link href={getUserUrl(user)} isExternal>
              <T>个人资料展示页</T>
            </Link>
            的URL。URL只支持小写英文字母和数字。为了便于其他小伙伴记忆，建议使用中文真名的拼音
            {}
            <T>或者英文昵称。</T>
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
        <FormLabel>
          <T>中文全名</T>
        </FormLabel>
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
        {!user.name && (
          <FormErrorMessage>
            <T>用户姓名不能为空</T>
          </FormErrorMessage>
        )}
      </FormControl>

      <FormControl>
        <FormLabel>
          <T>昵称或英文名</T>
        </FormLabel>
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
        <FormLabel>
          <T>性别</T>
        </FormLabel>
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
              <T>男</T>
            </Radio>
            <Radio bg="white" value="女">
              <T>女</T>
            </Radio>
          </Stack>
        </RadioGroup>
      </FormControl>
    </>
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
  const router = useRouter();

  const isMe = useMyId() === user.id;
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    setLoading(true);
    try {
      const uploadToken = await trpc.users.getJinshujuXField.query({
        uploadTarget: "user",
      });
      await router.push(getEmbeddedFormUrl("Bz3uSO", uploadToken));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Heading size="md">
        <T>生活照</T>
      </Heading>
      <FormControl>
        <Image
          src={UserProfilePictureLink(profile)}
          alt={"照片"}
          maxW="300px"
          my={componentSpacing}
        />

        {isMe && (
          <Link onClick={handleUpload}>
            {loading ? (
              <HStack>
                <Spinner size="sm" />
                <Text>
                  <T>加载中...</T>
                </Text>
              </HStack>
            ) : profile.照片链接 ? (
              <HStack>
                <MdChangeCircle />
                <Text>
                  <T>更换照片</T>
                </Text>
              </HStack>
            ) : (
              <HStack>
                <MdCloudUpload />
                <Text>
                  <T>上传照片</T>
                </Text>
              </HStack>
            )}
          </Link>
        )}

        <FormHelperTextWithMargin>
          <T>建议选择面部清晰、不戴墨镜的近照</T>
        </FormHelperTextWithMargin>

        {isPermitted(myRoles, "UserAdmin") && (
          <>
            <FormHelperTextWithMargin>
              <Text color="red.700">
                <T>以下链接仅</T>
                {displayName("UserAdmin")}
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
  const router = useRouter();

  const isMe = useMyId() === user.id;
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    setLoading(true);
    try {
      const uploadToken = await trpc.users.getJinshujuXField.query({
        uploadTarget: "user",
      });
      await router.push(getEmbeddedFormUrl("nhFsf1", uploadToken));
    } finally {
      setLoading(false);
    }
  };

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

      {isMe && (
        <Link onClick={handleUpload}>
          {loading ? (
            <HStack>
              <Spinner size="sm" />
              <Text>
                <T>加载中...</T>
              </Text>
            </HStack>
          ) : profile.视频链接 ? (
            <HStack>
              <MdChangeCircle />
              <Text>
                <T>更换视频</T>
              </Text>
            </HStack>
          ) : (
            <HStack>
              <MdCloudUpload />
              <Text>
                <T>上传视频</T>
              </Text>
            </HStack>
          )}
        </Link>
      )}
    </>
  );
}

function NonMentorProfileFields({
  profile,
  updateProfile,
}: {
  profile: UserProfile;
  updateProfile: (k: keyof UserProfile, v: string) => void;
}) {
  return (
    <>
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
      <T>所有文字均支持</T>
      <Link isExternal href={markdownSyntaxUrl}>
        {" "}
        <T>Markdown 格式</T>
      </Link>
      。
    </>
  );
}

function PositionFormControl({
  profile,
  updateProfile,
}: {
  profile: UserProfile;
  updateProfile: (k: keyof UserProfile, v: string) => void;
  highlight?: boolean;
}) {
  return (
    <FormControl>
      <FormLabel>
        <T>雇主与职位</T>
      </FormLabel>
      <FormHelperTextWithMargin>
        <T>比如甲公司人事处处长、餐饮业创业者等</T>
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
}: {
  profile: UserProfile;
  updateProfile: (k: keyof UserProfile, v: string) => void;
}) {
  return (
    <FormControl>
      <FormLabel>
        <T>现居住城市或地区</T>
      </FormLabel>
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
      <FormLabel>
        <T>业余爱好和特长、个人网站或自媒体账号等</T>
      </FormLabel>
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
}: {
  profile: UserProfile;
  updateProfile: (k: keyof UserProfile, v: string) => void;
}) {
  return (
    <FormControl>
      <FormLabel>
        <T>职业经历、学术背景和个人网站</T>
      </FormLabel>
      <FormHelperTextWithMargin>
        <ListAndMarkdownSupport />
        <T>，比如：</T>
        <br />
        <br />
        <T>* 经历1</T>
        <br />
        <T>* 经历2</T>
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
      <FormLabel>
        <T>目前的日常和生活趣事</T>
      </FormLabel>
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

function Orgs({ user }: { user: MinUser }) {
  const { data: allOrgs } = trpcNext.orgs.list.useQuery();
  const { data: myOrgs, refetch } = trpcNext.orgs.listUserOrgs.useQuery(
    user.id,
  );
  const joinMutation = trpcNext.orgs.join.useMutation();
  const leaveMutation = trpcNext.orgs.leave.useMutation();

  if (!allOrgs || !myOrgs) return <Loader />;

  const options = allOrgs.map((org) => ({
    value: org.id,
    label: org.name,
  }));

  const value = myOrgs.map((org) => ({
    value: org.id,
    label: org.name,
  }));

  const handleChange = async (selected: any) => {
    const selectedIds = new Set<string>(
      selected.map((s: any) => s.value as string),
    );
    const currentIds = new Set<string>(myOrgs.map((o) => o.id));

    const toJoin = [...selectedIds].filter((id) => !currentIds.has(id));
    const toLeave = [...currentIds].filter((id) => !selectedIds.has(id));

    let updated = false;

    for (const orgId of toJoin) {
      await joinMutation.mutateAsync(orgId);
      updated = true;
    }

    for (const orgId of toLeave) {
      await leaveMutation.mutateAsync(orgId);
      updated = true;
    }

    if (updated) {
      void refetch();
      toast.success("机构信息已更新");
    }
  };

  return (
    <FormControl>
      <FormLabel>
        <T>所属机构</T>
      </FormLabel>
      <Select
        isMulti
        options={options}
        value={value}
        onChange={handleChange}
        isDisabled={joinMutation.isLoading || leaveMutation.isLoading}
        placeholder={"搜索机构..."}
        noOptionsMessage={() => "没有找到相关机构"}
      />
    </FormControl>
  );
}

function MentorProfileFields({
  user,
  profile,
  updateProfile,
}: {
  user: MinUser;
  profile: UserProfile;
  updateProfile: (k: keyof UserProfile, v: string) => void;
}) {
  const label = whiteLabel;
  const exampleVideoUrl =
    label === "yuantu"
      ? "/weihan"
      : "https://gd-pri.jinshujufiles.com/en/nhFsf1/" +
        "lqs7KDT_0-e1Qbav95cQO1y41jGl_field_1_1762145720.mp4?token=" +
        "7NK_Z1IEoKaIY6I9RXzO4b9uQPwuwdvnlGbzHZmF:" +
        "BcXOiypPSbIjSbrKtneqBhjIVGc=:" +
        "eyJTIjoiZ2QtcHJpLmppbnNodWp1ZmlsZXMuY29tL2VuL25oRnNmMS9scXM3S0" +
        "RUXzAtZTFRYmF2OTVjUU8xeTQxakdsX2ZpZWxkXzFfMTc2MjE0NTcyMC5tcDQq" +
        "IiwiRSI6MjA3NzcxNTI1MX0=&download&attname=720p.mp4";

  return (
    <>
      <FormControl>
        <FormLabel>
          <T>视频介绍</T>
        </FormLabel>
        <FormHelperTextWithMargin>
          <Text style={{ display: "inline" }} color="red.700">
            <T>强烈建议</T>
          </Text>
          上传长度约1-2分钟的视频，以便学生直观感受你的沟通方式。
          这将很大程度提高匹配的成功率和满意度。
          内容可包括坐标、职业、性格、擅长聊的话题等等。
          <Link isExternal href={exampleVideoUrl}>
            <T>参考示例</T>
          </Link>
          。
        </FormHelperTextWithMargin>
        <Video user={user} profile={profile} />
      </FormControl>

      <PositionFormControl profile={profile} updateProfile={updateProfile} />

      <FormControl>
        <FormLabel>
          <T>专业领域或研究方向</T>
        </FormLabel>
        <FormHelperTextWithMargin>
          <T>比如金融、电子工程、教育学等</T>
        </FormHelperTextWithMargin>
        <Input
          bg="white"
          value={profile.专业领域 || ""}
          onChange={(ev) => updateProfile("专业领域", ev.target.value)}
        />
      </FormControl>

      <CityFormControl profile={profile} updateProfile={updateProfile} />

      <FormControl>
        <FormLabel>
          <T>成长过程中曾经居住的城市或地区</T>
        </FormLabel>
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
          <T>擅长聊天话题</T>
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
          成长过程中的亮点、难忘的经历、或曾经给你重要影响的事或人
        </FormLabel>
        <Textarea
          bg="white"
          height={140}
          value={profile.成长亮点 || ""}
          onChange={(ev) => updateProfile("成长亮点", ev.target.value)}
        />
      </FormControl>

      <CareerFormControl profile={profile} updateProfile={updateProfile} />

      <FormControl>
        <FormLabel>
          <T>教育经历</T>
        </FormLabel>
        <FormHelperTextWithMargin>
          <T>大学及以上，也鼓励填写更早的经历。</T>
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
        <FormLabel>
          <T>个性特点</T>
        </FormLabel>
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

function ListAndMarkdownSupport() {
  return (
    <>
      <T>可用以星号开头的列表格式或</T>
      <Link isExternal href={markdownSyntaxUrl}>
        <T>其他 Markdown 格式</T>
      </Link>
    </>
  );
}
