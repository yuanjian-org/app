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
import { notSetText } from "shared/strings/notSetText";
import { parseQueryString } from "shared/strings/parseQueryString";
import { removeChinaPhonePrefix } from "shared/strings/removeChinaPhonePrefix";
import { useRouter } from "next/router";
import trpc, { trpcNext } from "trpc";
import Loader from "components/Loader";
import { componentSpacing } from "theme/metrics";
import { sectionSpacing } from "theme/metrics";
import { LockIcon } from "@chakra-ui/icons";
import NextLink from "next/link";
import { useEffect, useState } from "react";
import { useMyId } from "useMe";
import { PearlStudentValidationModal } from "components/PearlStudentModals";
import { SetEmailModal, SetPhoneModal } from "components/PostLoginModels";
import { toast } from "react-toastify";
import { useCanValidatePearlStudent } from "components/useCanValidatePearlStudent";
import { useCanValidateUstcStudent } from "components/useCanValidateUstcStudent";
import { UstcStudentValidationModal } from "components/UstcStudentModals";
import T from "components/T";

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
  const [isSettingEmail, setIsSettingEmail] = useState(false);
  const [isValidatingPearlStudent, setIsValidatingPearlStudent] =
    useState(false);
  const [isValidatingUstcStudent, setIsValidatingUstcStudent] = useState(false);

  const canValidatePearlStudent = useCanValidatePearlStudent(user?.roles ?? []);
  const canValidateUstcStudent = useCanValidateUstcStudent(user?.email);

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

  return !user ? (
    <Loader />
  ) : (
    <VStack
      maxWidth="xl"
      align="start"
      spacing={componentSpacing}
      margin={sectionSpacing}
    >
      <SectionHeading>
        <T>账号信息</T>
      </SectionHeading>

      <FormControl>
        <FormLabel>
          <T>邮箱</T>
        </FormLabel>
        <Input value={user.email || notSetText} readOnly />
      </FormControl>
      <FormControl>
        <Button variant="brand" onClick={() => setIsSettingEmail(true)}>
          <T>修改</T>
        </Button>
      </FormControl>

      {isSettingEmail && (
        <SetEmailModal cancel={() => setIsSettingEmail(false)} />
      )}

      <FormControl>
        <FormLabel>
          <T>手机号</T>
        </FormLabel>
        <Input
          readOnly
          value={!user.phone ? notSetText : removeChinaPhonePrefix(user.phone)!}
        />
      </FormControl>
      <FormControl>
        <Button variant="brand" onClick={() => setIsSettingPhone(true)}>
          <T>修改</T>
        </Button>
      </FormControl>

      {isSettingPhone && (
        <SetPhoneModal
          cancelLabel="取消"
          cancel={() => setIsSettingPhone(false)}
        />
      )}

      <FormControl>
        <FormLabel>
          <T>微信号</T>
        </FormLabel>
        <Input
          bg="white"
          value={wechat}
          onChange={(e) => setWechat(e.target.value)}
        />
      </FormControl>
      <FormControl>
        <Button variant="brand" onClick={saveWechat} isLoading={isSaving}>
          <T>保存</T>
        </Button>
      </FormControl>

      {canValidatePearlStudent && (
        <>
          <SectionHeading>
            <T>珍珠生验证</T>
          </SectionHeading>
          <Text>
            如果您是新华爱心教育基金会曾经或正在资助的珍珠生，请点击按钮进行验证。
          </Text>
          <Button
            variant="brand"
            onClick={() => setIsValidatingPearlStudent(true)}
          >
            <T>开始验证</T>
          </Button>
        </>
      )}

      {isValidatingPearlStudent && (
        <PearlStudentValidationModal
          cancelLabel="取消"
          cancel={() => setIsValidatingPearlStudent(false)}
        />
      )}

      {canValidateUstcStudent && (
        <>
          <SectionHeading>
            <T>中科大学生邮箱验证</T>
          </SectionHeading>
          <Text>如果您有中国科学技术大学的学生邮箱，请点击按钮进行验证。</Text>
          <Button
            variant="brand"
            onClick={() => setIsValidatingUstcStudent(true)}
          >
            <T>开始验证</T>
          </Button>
        </>
      )}

      {isValidatingUstcStudent && (
        <UstcStudentValidationModal
          cancelLabel="取消"
          cancel={() => setIsValidatingUstcStudent(false)}
        />
      )}

      <SectionHeading>
        <T>安全信息</T>
      </SectionHeading>

      <Link as={NextLink} href="/who-can-see-my-data">
        <HStack>
          <LockIcon />
          <Text>
            <T>谁能看到我的数据</T>
          </Text>
        </HStack>
      </Link>
    </VStack>
  );
}

Page.title = accountPageTitle;

import getI18nProps from "components/getI18nProps";
export const getServerSideProps = getI18nProps;
