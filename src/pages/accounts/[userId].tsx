import {
  FormControl,
  FormLabel,
  Input,
  Heading,
  VStack,
  HStack,
  Text,
  Link,
  Button,
} from "@chakra-ui/react";
import { chinaPhonePrefix, parseQueryString } from "shared/strings";
import { useRouter } from "next/router";
import FormHelperTextWithMargin from "components/FormHelperTextWithMargin";
import trpc, { trpcNext } from "trpc";
import Loader from "components/Loader";
import { componentSpacing } from "theme/metrics";
import { sectionSpacing } from "theme/metrics";
import { LockIcon } from "@chakra-ui/icons";
import NextLink from "next/link";
import { useEffect, useState } from "react";
import { useMyId } from "useMe";
import { SetPhoneModal } from "components/PostLoginModels";
import { toast } from "react-toastify";

export const accountPageTitle = "账号与安全";

export default function Page() {
  const queryUserId = parseQueryString(useRouter(), "userId");
  const myId = useMyId();
  const userId = queryUserId === "me" ? myId : queryUserId;

  const { data: user } = trpcNext.users.getFull.useQuery(userId ?? "", {
    enabled: !!userId,
  });

  const [wechat, setWechat] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSettingPhone, setIsSettingPhone] = useState(false);

  useEffect(() => {
    setWechat(user?.wechat ?? "");
  }, [user]);

  const SectionHeading = ({ children }: { children: React.ReactNode }) => (
    <Heading mt={sectionSpacing} size="md">
      {children}
    </Heading>
  );

  const saveWechat = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await trpc.users.update.mutate({
        ...user,
        wechat: wechat || null,
      });
      toast.success("保存成功。");
    } finally {
      setIsSaving(false);
    }
  };

  const notProvided = "未提供";

  return !user ? (
    <Loader />
  ) : (
    <VStack
      maxWidth="xl"
      align="start"
      spacing={componentSpacing}
      margin={sectionSpacing}
    >
      <SectionHeading>账号信息</SectionHeading>

      <FormControl>
        <FormLabel>邮箱</FormLabel>
        <Input value={user.email || notProvided} readOnly />
        <FormHelperTextWithMargin>
          如需更改，
          <Link
            href="https://work.weixin.qq.com/kfid/kfcd32727f0d352531e"
            target="_blank"
          >
            请联系客服
          </Link>
          。
        </FormHelperTextWithMargin>
      </FormControl>

      <FormControl>
        <FormLabel>手机号</FormLabel>
        <Input
          readOnly
          value={
            !user.phone
              ? notProvided
              : user.phone.startsWith(chinaPhonePrefix)
                ? user.phone.slice(chinaPhonePrefix.length)
                : user.phone
          }
        />
      </FormControl>
      <FormControl>
        <Button variant="brand" onClick={() => setIsSettingPhone(true)}>
          修改
        </Button>
      </FormControl>

      <FormControl>
        <FormLabel>微信号</FormLabel>
        <Input
          bg="white"
          value={wechat}
          onChange={(e) => setWechat(e.target.value)}
        />
      </FormControl>
      <FormControl>
        <Button variant="brand" onClick={saveWechat} isLoading={isSaving}>
          保存
        </Button>
      </FormControl>

      {isSettingPhone && (
        <SetPhoneModal
          cancelLabel="取消"
          cancel={() => setIsSettingPhone(false)}
        />
      )}

      <SectionHeading>安全信息</SectionHeading>

      <Link as={NextLink} href="/who-can-see-my-data">
        <HStack>
          <LockIcon />
          <Text>谁能看到我的数据</Text>
        </HStack>
      </Link>
    </VStack>
  );
}

Page.title = accountPageTitle;
