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
import { parseQueryString } from "shared/strings";
import { useRouter } from "next/router";
import { RoleProfiles } from "shared/Role";
import FormHelperTextWithMargin from "components/FormHelperTextWithMargin";
import { isFakeEmail } from "shared/fakeEmail";
import { trpcNext } from "trpc";
import Loader from "components/Loader";
import { componentSpacing } from "theme/metrics";
import { sectionSpacing } from "theme/metrics";
import { LockIcon } from "@chakra-ui/icons";
import NextLink from "next/link";
import { canAcceptMergeToken } from "shared/merge";
import { useState } from "react";
import { InputMergeTokenModal, MergeTokenFormat } from "components/MergeModals";
import { useMyId } from "useMe";
import { canValidatePearlStudent } from "shared/pearlStudent";
import { PearlStudentValidationModal } from "components/PearlStudentModals";

export const accountPageTitle = "账号与安全";

export default function Page() {
  const queryUserId = parseQueryString(useRouter(), "userId");
  const myId = useMyId();
  const userId = queryUserId === "me" ? myId : queryUserId;

  const { data: user } = trpcNext.users.getFull.useQuery(userId ?? "", {
    enabled: !!userId,
  });

  const [isMerging, setIsMerging] = useState(false);
  const [isValidatingPearlStudent, setIsValidatingPearlStudent] =
    useState(false);

  return !user ? (
    <Loader />
  ) : (
    <VStack
      maxWidth="xl"
      align="start"
      spacing={componentSpacing}
      margin={sectionSpacing}
    >
      {!isFakeEmail(user.email) && (
        <>
          <Heading size="md">账号信息</Heading>

          <FormControl>
            <FormLabel>邮箱</FormLabel>
            <FormHelperTextWithMargin>
              如需更改，请联系
              {RoleProfiles.UserManager.displayName}。
            </FormHelperTextWithMargin>
            <Input value={user.email} readOnly />
          </FormControl>
        </>
      )}

      {canAcceptMergeToken(user.email) && (
        <>
          <Heading size="md">微信账号</Heading>

          <Text>
            如果您通过电子邮件收到微信激活码，请点击下面的按钮输入。
            <MergeTokenFormat />
          </Text>
          <Text>
            警告：使用微信激活码后，您的账号将被迁移，而无法继续访问当前账号下的数据。
            如需迁移当前账号下的数据，请联系
            {RoleProfiles.UserManager.displayName}。
          </Text>
          <Button variant="brand" onClick={() => setIsMerging(true)}>
            输入微信激活码
          </Button>
        </>
      )}

      {isMerging && (
        <InputMergeTokenModal
          cancelLabel="取消"
          cancel={() => setIsMerging(false)}
        />
      )}

      {canValidatePearlStudent(user.roles) && (
        <>
          <Heading mt={sectionSpacing} size="md">
            珍珠生验证
          </Heading>
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

      <Heading mt={sectionSpacing} size="md">
        安全信息
      </Heading>

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
