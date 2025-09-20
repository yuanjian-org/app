import {
  FormControl,
  VStack,
  Input,
  FormHelperText,
  Button,
  Text,
  Checkbox,
  Flex,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Heading,
  FormLabel,
  SimpleGrid,
  GridItem,
  Wrap,
  Grid,
  Divider,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import trpc, { trpcNext } from "../../trpc";
import { componentSpacing } from "theme/metrics";
import { sectionSpacing } from "theme/metrics";
import { toast } from "react-toastify";
import DatePicker from "react-datepicker";
import {
  allNotificationTypes,
  defaultMentorCapacity,
  InterviewerPreference,
  MentorPreference,
  NotificationType,
  UserPreference,
} from "shared/UserPreference";
import datePicker from "theme/datePicker";
import { isPermitted } from "shared/Role";
import { chinaPhonePrefix, parseQueryString } from "shared/strings";
import { useRouter } from "next/router";
import invariant from "tiny-invariant";
import Loader from "components/Loader";
import { TraitsPreference } from "shared/Traits";
import {
  traitsPrefLabel2value,
  traitsPrefProfiles,
  TraitTag,
} from "components/Traits";
import useMe, { useMyId } from "useMe";
import SwitchAndLabel from "components/SwitchAndLabel";
import ConfirmationModal from "components/ConfirmationModal";

export default function Page() {
  const queryUserId = parseQueryString(useRouter(), "userId");
  const myId = useMyId();
  const userId = queryUserId === "me" ? myId : queryUserId;

  const { data: user } = trpcNext.users.getFull.useQuery(userId ?? "", {
    enabled: !!userId,
  });

  const { data: oldPref } = trpcNext.users.getUserPreference.useQuery(
    { userId: userId ?? "" },
    { enabled: !!userId },
  );
  const [pref, setPref] = useState<UserPreference>();
  useEffect(() => setPref(oldPref), [oldPref]);

  const updateInterviewerPref = (k: keyof InterviewerPreference, v: any) =>
    update({ ...pref, interviewer: { ...pref?.interviewer, [k]: v } });

  const updateMentorPref = (k: keyof MentorPreference, v: any) =>
    update({ ...pref, mentor: { ...pref?.mentor, [k]: v } });

  const setDisabled = (
    arr: NotificationType[] | undefined,
    k: NotificationType,
    v: "enable" | "disable",
  ) => {
    const cleaned = (arr ?? []).filter((i) => i !== k);
    return v === "disable" ? [...cleaned, k] : cleaned;
  };

  const updateSmsDisabled = (k: NotificationType, v: "enable" | "disable") =>
    update({ ...pref, smsDisabled: setDisabled(pref?.smsDisabled, k, v) });

  const updateEmailDisabled = (k: NotificationType, v: "enable" | "disable") =>
    update({ ...pref, emailDisabled: setDisabled(pref?.emailDisabled, k, v) });

  const update = async (pref: UserPreference) => {
    invariant(userId);
    setPref(pref);
    await trpc.users.setUserPreference.mutate({
      userId,
      preference: pref,
    });
  };

  const [isSaving, setIsSaving] = useState(false);
  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      invariant(userId);
      await trpc.users.setUserPreference.mutate({
        userId,
        preference: pref || {},
      });
      toast.success("保存成功。");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user || !pref) return <Loader />;

  const isMentor = isPermitted(user.roles, "Mentor");
  const isMentee = isPermitted(user.roles, "Mentee");

  const PrefDivider = () => <Divider my={componentSpacing} />;

  return (
    <VStack spacing={sectionSpacing} m={sectionSpacing} maxW="lg" align="start">
      {/* Do not show interview options to non-mentor mentees */}
      {(isMentor || !isMentee) && (
        <>
          <InterviewerPreferences
            data={pref.interviewer}
            update={updateInterviewerPref}
            isMentor={isMentor}
          />
          <PrefDivider />
        </>
      )}

      {isMentor && (
        <>
          <MentorPreferences data={pref.mentor} update={updateMentorPref} />
          <PrefDivider />
        </>
      )}

      <NotificationPreferences
        data={pref}
        updateSmsDisabled={updateSmsDisabled}
        updateEmailDisabled={updateEmailDisabled}
      />

      <Button
        variant="brand"
        mt={sectionSpacing}
        isLoading={isSaving}
        onClick={handleSubmit}
      >
        保存
      </Button>
    </VStack>
  );
}

Page.title = "偏好设置";

function InterviewerPreferences({
  data,
  update,
  isMentor,
}: {
  data?: InterviewerPreference;
  update: (k: keyof InterviewerPreference, v: any) => void;
  isMentor: boolean;
}) {
  const oneMonthDate = new Date(new Date().setMonth(new Date().getMonth() + 1));
  const threeMonthsDate = new Date(
    new Date().setMonth(new Date().getMonth() + 3),
  );
  const until = data?.limit?.until ? new Date(data.limit.until) : oneMonthDate;
  const noMoreThan = data?.limit?.noMoreThan || 0;

  const setLimit = (noMoreThan: number, until: Date) =>
    update("limit", { noMoreThan, until: until.toISOString() });

  const removeLimit = () => update("limit", undefined);

  const toggleOptIn = (optIn: boolean) =>
    update("optIn", optIn ? true : undefined);

  return (
    <>
      <Heading size="md">面试官偏好</Heading>

      {!isMentor && (
        <FormControl>
          <Checkbox
            isChecked={data?.optIn}
            onChange={(e) => toggleOptIn(e.target.checked)}
          >
            我可以帮助面试学生。
          </Checkbox>
        </FormControl>
      )}

      <FormControl>
        <Flex wrap="wrap" alignItems="center">
          <Checkbox
            isChecked={!!data?.limit}
            onChange={(e) =>
              e.target.checked ? setLimit(noMoreThan, until) : removeLimit()
            }
          >
            面试限制：
          </Checkbox>
          在
          <DatePicker
            selected={until}
            onChange={(date) => {
              const newDate = date || oneMonthDate;
              setLimit(noMoreThan, newDate);
            }}
            minDate={new Date()}
            maxDate={threeMonthsDate}
            disabled={!data?.limit}
            customInput={<Input {...datePicker} textAlign="center" />}
          />
          之前，我还可以参与
          <NumberInput
            value={noMoreThan}
            onChange={(v) => setLimit(Number.parseInt(v), until)}
            min={0}
            max={10}
            isDisabled={!data?.limit}
            maxW="60px"
            marginX={1}
          >
            <NumberInputField bgColor="white" />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
          场面试。
        </Flex>
        <FormHelperText>
          将次数限制设置为 0 避免所有面试。在所选日期之后，面试限制将自动解除。
        </FormHelperText>
      </FormControl>
    </>
  );
}

function MentorPreferences({
  data,
  update,
}: {
  data?: MentorPreference;
  update: (k: keyof MentorPreference, v: any) => void;
}) {
  return (
    <>
      <Heading size="md">导师偏好</Heading>

      <FormControl>
        <Flex align="center">
          我可以同时带
          <NumberInput
            background="white"
            size="sm"
            maxW={20}
            mx={1}
            min={0}
            value={data?.最多匹配学生 ?? defaultMentorCapacity}
            onChange={(v) => update("最多匹配学生", Number.parseInt(v))}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
          名学生。
        </Flex>
        <FormHelperText>
          强烈建议两名学生或以上，因为横向对比十分有助于导师的工作。{}
          若希望避免匹配学生，请选择0。
        </FormHelperText>
      </FormControl>

      <MenteeTraitsPreferences
        data={data?.学生特质}
        update={(v) => update("学生特质", v)}
      />

      <FormControl>
        <Checkbox
          isChecked={data?.不参加就业辅导 ?? false}
          onChange={(e) => update("不参加就业辅导", e.target.checked)}
        >
          我暂不参与简历诊断、模拟面试等就业类服务，仅参加长期一对一服务。
        </Checkbox>
      </FormControl>
    </>
  );
}

function MenteeTraitsPreferences({
  data,
  update,
}: {
  data?: TraitsPreference;
  update: (pref: TraitsPreference) => void;
}) {
  const updateTrait = (
    trait: keyof TraitsPreference,
    value: number | undefined,
  ) => {
    update({ ...data, [trait]: value });
  };

  return (
    <>
      <Text>对学生的偏好：</Text>

      <SimpleGrid
        columns={2}
        rowGap={componentSpacing}
        templateColumns="auto 1fr"
      >
        {traitsPrefProfiles.map(({ title, field, labels }, i) => (
          <TraitPreference
            key={i}
            title={title}
            labels={labels}
            value={data?.[field] as number | undefined}
            update={(v) => updateTrait(field, v)}
          />
        ))}
      </SimpleGrid>

      <FormControl>
        <FormLabel>其他偏好：</FormLabel>
        <Input
          bg="white"
          value={data?.其他 ?? ""}
          onChange={(ev) => update({ ...data, 其他: ev.target.value })}
          placeholder="无"
        />
      </FormControl>
    </>
  );
}

function TraitPreference({
  title,
  labels,
  value,
  update,
}: {
  title: string;
  labels: string[];
  value: number | undefined;
  update: (value: number | undefined) => void;
}) {
  invariant(labels.length <= 4);

  return (
    <>
      <GridItem
        // Vertically center the text
        display="flex"
        alignItems="center"
      >
        <Text>
          <b>{title}：</b>
        </Text>
      </GridItem>
      <GridItem>
        <Wrap>
          <TraitTag
            label="无偏好"
            selected={value === undefined}
            onClick={() => update(undefined)}
          />

          {labels.map((label, i) => (
            <TraitTag
              key={i}
              label={label}
              selected={value === traitsPrefLabel2value[i]}
              onClick={() => update(traitsPrefLabel2value[i])}
            />
          ))}
        </Wrap>
      </GridItem>
    </>
  );
}

function NotificationPreferences({
  data,
  updateSmsDisabled,
  updateEmailDisabled,
}: {
  data: UserPreference;
  updateSmsDisabled: (k: NotificationType, v: "enable" | "disable") => void;
  updateEmailDisabled: (k: NotificationType, v: "enable" | "disable") => void;
}) {
  const me = useMe();
  const [confirmingInternationalSms, setConfirmingInternationalSms] =
    useState<boolean>(false);

  const Row = ({ type }: { type: NotificationType }) => (
    <>
      <GridItem>
        <Text>{type === "基础" ? "所有通知" : type}</Text>
      </GridItem>
      <GridItem>
        {type === "基础" ? (
          <SwitchAndLabel
            isChecked={!data.smsDisabled?.includes(type)}
            onChange={(v) => {
              if (v && me.phone && !me.phone.startsWith(chinaPhonePrefix)) {
                setConfirmingInternationalSms(true);
              } else {
                updateSmsDisabled(type, v ? "enable" : "disable");
              }
            }}
          />
        ) : (
          <SwitchAndLabel
            isDisabled={data.smsDisabled?.includes("基础")}
            isChecked={!data.smsDisabled?.includes(type)}
            onChange={(v) => updateSmsDisabled(type, v ? "enable" : "disable")}
          />
        )}
      </GridItem>
      <GridItem>
        <SwitchAndLabel
          isDisabled={type !== "基础" && data.emailDisabled?.includes("基础")}
          isChecked={!data.emailDisabled?.includes(type)}
          onChange={(v) => updateEmailDisabled(type, v ? "enable" : "disable")}
        />
      </GridItem>
    </>
  );

  return (
    <>
      <Heading size="md">通知偏好</Heading>

      <Grid templateColumns="1fr 1fr 1fr" gap={sectionSpacing}>
        <GridItem />
        <GridItem>
          <Text>短信通知</Text>
        </GridItem>
        <GridItem>
          <Text>邮件通知</Text>
        </GridItem>

        {allNotificationTypes
          .filter(
            (type) => type !== "内部笔记" || isPermitted(me.roles, "Mentor"),
          )
          .filter(
            (type) =>
              type !== "一对一通话提醒" || isPermitted(me.roles, "Mentor"),
          )
          .filter(
            (type) => type !== "点赞" || isPermitted(me.roles, "Volunteer"),
          )
          .map((type) => (
            <Row key={type} type={type} />
          ))}
      </Grid>

      {confirmingInternationalSms && (
        <ConfirmationModal
          message="您使用的是国际手机号，可能无法收到来自远图的短信。"
          confirmButtonText="知道了，继续开启短信通知"
          onConfirm={() => updateSmsDisabled("基础", "enable")}
          onClose={() => setConfirmingInternationalSms(false)}
        />
      )}
    </>
  );
}
