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
import {
  notSetText,
  parseQueryString,
  removeChinaPhonePrefix,
} from "shared/strings";
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
import { SetPhoneModal, SetEmailModal } from "components/PostLoginModels";
import { toast } from "react-toastify";
import { useCanValidatePearlStudent } from "components/useCanValidatePearlStudent";
import { useCanValidateUstcStudent } from "components/useCanValidateUstcStudent";
import { UstcStudentValidationModal } from "components/UstcStudentModals";

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
      <SectionHeading>账号信息</SectionHeading>

      <FormControl>
        <FormLabel>邮箱</FormLabel>
        <Input value={user.email || notSetText} readOnly />
      </FormControl>
      <FormControl>
        <Button variant="brand" onClick={() => setIsSettingEmail(true)}>
          修改
        </Button>
      </FormControl>

      <FormControl>
        <FormLabel>手机号</FormLabel>
        <Input
          readOnly
          value={!user.phone ? notSetText : removeChinaPhonePrefix(user.phone)!}
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

      {isSettingEmail && (
        <SetEmailModal
          cancelLabel="取消"
          cancel={() => setIsSettingEmail(false)}
        />
      )}

      {canValidatePearlStudent && (
        <>
          <SectionHeading>珍珠生验证</SectionHeading>
          <Text>
            如果您是新华爱心教育基金会曾经或正在资助的珍珠生，请点击按钮进行验证。
          </Text>
          <Button
            variant="brand"
            onClick={() => setIsValidatingPearlStudent(true)}
          >
            开始验证
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
          <SectionHeading>中科大学生邮箱验证</SectionHeading>
          <Text>如果您有中国科学技术大学的学生邮箱，请点击按钮进行验证。</Text>
          <Button
            variant="brand"
            onClick={() => setIsValidatingUstcStudent(true)}
          >
            开始验证
          </Button>
        </>
      )}

      {isValidatingUstcStudent && (
        <UstcStudentValidationModal
          cancelLabel="取消"
          cancel={() => setIsValidatingUstcStudent(false)}
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
