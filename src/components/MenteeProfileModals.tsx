import {
  Button,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  HStack,
  ModalCloseButton,
  FormControl,
  Input,
  FormLabel,
  VStack,
  Spacer,
  Link,
  Textarea,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import trpc, { trpcNext } from "../trpc";
import ModalWithBackdrop from "./ModalWithBackdrop";
import { componentSpacing } from "theme/metrics";
import { UserState } from "shared/UserState";
import { toast } from "react-toastify";
import useMe from "useMe";
import { useSession } from "next-auth/react";
import { SmallGrayText } from "./SmallGrayText";
import { RiCustomerServiceFill } from "react-icons/ri";
import FormHelperTextWithMargin from "./FormHelperTextWithMargin";
import { UserProfile } from "shared/UserProfile";

export function useIsMenteeProfileComplete(profile: UserProfile | undefined) {
  if (!profile) return false;
  return (
    !!profile.毕业高中 &&
    !!profile.大学 &&
    !!profile.就读专业 &&
    !!profile.大一入读年份 &&
    !!profile.现就读阶段 &&
    !!profile.自我介绍
  );
}

export function MenteeProfileModals({
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

  return <MenteeProfileModal cancelLabel="跳过" cancel={decline} />;
}

export function MenteeProfileModal({
  cancelLabel,
  cancel,
}: {
  cancelLabel?: string;
  cancel?: () => void;
}) {
  const user = useMe();
  const { data } = trpcNext.users.getUserProfile.useQuery({ userId: user.id });
  const profile = data?.profile;

  const [highSchool, setHighSchool] = useState<string>("");
  const [college, setCollege] = useState<string>("");
  const [major, setMajor] = useState<string>("");
  const [enrollYear, setEnrollYear] = useState<string>("");
  const [stage, setStage] = useState<string>("");
  const [intro, setIntro] = useState<string>("");

  useEffect(() => {
    if (profile) {
      setHighSchool(profile.毕业高中 || "");
      setCollege(profile.大学 || "");
      setMajor(profile.就读专业 || "");
      setEnrollYear(profile.大一入读年份 || "");
      setStage(profile.现就读阶段 || "");
      setIntro(profile.自我介绍 || "");
    }
  }, [profile]);

  const { update } = useSession();
  const [loading, setLoading] = useState(false);

  const isInputValid =
    highSchool.trim().length > 0 &&
    college.trim().length > 0 &&
    major.trim().length > 0 &&
    enrollYear.trim().length > 0 &&
    stage.trim().length > 0 &&
    intro.trim().length > 0;

  const submit = async () => {
    setLoading(true);
    try {
      const updatedProfile = {
        ...profile,
        毕业高中: highSchool.trim(),
        大学: college.trim(),
        就读专业: major.trim(),
        大一入读年份: enrollYear.trim(),
        现就读阶段: stage.trim(),
        自我介绍: intro.trim(),
      };
      await trpc.users.setUserProfile.mutate({
        userId: user.id,
        profile: updatedProfile,
      });

      await update();
      toast.success(`资料已完善。`);
      if (cancel) {
        cancel();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalWithBackdrop isOpen size="lg" onClose={cancel || (() => undefined)}>
      <ModalContent>
        <ModalHeader>完善学生资料</ModalHeader>
        {cancel && <ModalCloseButton />}
        <ModalBody>
          <VStack spacing={componentSpacing} align="stretch">
            <SmallGrayText>
              为了更好地为您匹配导师，请完善以下资料（均为必填）：
            </SmallGrayText>

            <FormControl>
              <FormLabel>毕业高中</FormLabel>
              <Input
                autoFocus
                value={highSchool}
                onChange={(e) => setHighSchool(e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>大学</FormLabel>
              <Input
                value={college}
                onChange={(e) => setCollege(e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>就读专业</FormLabel>
              <Input value={major} onChange={(e) => setMajor(e.target.value)} />
            </FormControl>

            <FormControl>
              <FormLabel>大一入读年份</FormLabel>
              <Input
                value={enrollYear}
                onChange={(e) => setEnrollYear(e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>现就读阶段</FormLabel>
              <FormHelperTextWithMargin>
                比如本科、专科、硕博连读等
              </FormHelperTextWithMargin>
              <Input value={stage} onChange={(e) => setStage(e.target.value)} />
            </FormControl>

            <FormControl>
              <FormLabel>自我介绍</FormLabel>
              <FormHelperTextWithMargin>
                为什么要寻求帮助，未来你会如何回馈他人
              </FormHelperTextWithMargin>
              <Textarea
                height={140}
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
              />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <HStack spacing={componentSpacing} w="full">
            <SmallGrayText>
              如有问题，
              <Link
                href="https://work.weixin.qq.com/kfid/kfcd32727f0d352531e"
                isExternal
              >
                联系客服
              </Link>
            </SmallGrayText>
            <RiCustomerServiceFill color="gray" />

            <Spacer />
            {cancel && (
              <Button onClick={cancel} isDisabled={loading}>
                {cancelLabel}
              </Button>
            )}
            <Button
              onClick={submit}
              variant="brand"
              isDisabled={!isInputValid}
              isLoading={loading}
            >
              提交
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>
  );
}
