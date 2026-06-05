import {
  Button,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  HStack,
  Spacer,
  Text,
  VStack,
} from "@chakra-ui/react";
import trpc, { trpcNext } from "../trpc";
import ModalWithBackdrop from "./ModalWithBackdrop";
import { componentSpacing } from "theme/metrics";
import { UserState } from "shared/UserState";
import { useEffect, useState } from "react";
import MenteeProfileFields from "./MenteeProfileFields";
import { toast } from "react-toastify";
import { UserProfile } from "shared/UserProfile";

import useMe from "useMe";

export function isMenteeProfileComplete(profile?: UserProfile) {
  if (!profile) return false;
  return !!(
    profile.毕业高中 &&
    profile.大学 &&
    profile.就读专业 &&
    profile.大一入读年份 &&
    profile.现就读阶段 &&
    profile.自我介绍
  );
}

function BaseMenteeProfileModal({
  bodyText,
  secondaryAction,
  onComplete,
}: {
  bodyText: React.ReactNode;
  secondaryAction?: React.ReactNode;
  onComplete?: () => void;
}) {
  const me = useMe();
  const { data: initialData, isFetched } =
    trpcNext.users.getUserProfile.useQuery({ userId: me.id });
  const [profile, setProfile] = useState<Partial<UserProfile>>({});

  useEffect(() => {
    if (initialData?.profile) {
      setProfile(initialData.profile);
    }
  }, [initialData]);

  const updateProfile = (k: keyof UserProfile, v: string) => {
    const updated = { ...profile, [k]: v };
    if (!v) delete updated[k];
    setProfile(updated);
  };

  const isComplete = isMenteeProfileComplete(profile as UserProfile);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await trpc.users.setUserProfile.mutate({
        userId: me.id,
        profile: profile as UserProfile,
      });
      toast.success("个人资料已保存");
      if (onComplete) onComplete();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalWithBackdrop isOpen onClose={() => undefined} size="xl">
      <ModalContent>
        <ModalHeader>完善个人资料</ModalHeader>
        <ModalBody>
          <VStack spacing={componentSpacing} align="start">
            <Text>{bodyText}</Text>
            {isFetched ? (
              <MenteeProfileFields
                profile={profile}
                updateProfile={updateProfile}
                showIsRequired
              />
            ) : (
              <Text>加载中...</Text>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <HStack spacing={componentSpacing} w="full">
            {secondaryAction}
            <Spacer />
            <Button
              variant="brand"
              isDisabled={!isComplete}
              isLoading={saving}
              onClick={save}
            >
              提交
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>
  );
}

export function SkippableMenteeProfileModal({
  userState,
  refetchUserState,
}: {
  userState: UserState | null;
  refetchUserState: () => void;
}) {
  const decline = async () => {
    await trpc.users.setMyState.mutate({
      ...userState,
      declinedMenteeProfileModal: true,
    });
    refetchUserState();
  };

  return (
    <BaseMenteeProfileModal
      bodyText={
        <>
          <Text>为了让导师更好地了解你，我们需要你填写一些个人资料。</Text>
          <Text mt={componentSpacing}>
            你可以现在填写，也可以选择跳过，之后再前往【个人资料】页进行完善。
          </Text>
        </>
      }
      onComplete={decline}
      secondaryAction={<Button onClick={decline}>稍后再说，跳过此步</Button>}
    />
  );
}

export function MandatoryMenteeProfileModal() {
  return (
    <BaseMenteeProfileModal
      bodyText={<Text>在使用该功能之前，请先完善学生信息。</Text>}
    />
  );
}
