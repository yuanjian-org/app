import { Flex, Heading } from "@chakra-ui/react";
import Loader from "components/Loader";
import trpc, { trpcNext } from "trpc";
import {
  menteeApplicationFields,
  volunteerApplicationFields,
} from "shared/applicationFields";
import { sectionSpacing } from "theme/metrics";
import { formatUserName } from "shared/strings";
import User from "shared/User";
import { isPermitted } from "shared/Role";
import { InterviewType } from "shared/InterviewType";
import { useMyRoles } from "useMe";
import { FieldRow } from "./FieldRow";
import { ContactFieldRow } from "./ContactFieldRow";

export default function Applicant({
  userId,
  type,
  showTitle,
  useNameAsTitle,
}: {
  userId: string;
  type: InterviewType;
  showTitle?: boolean;
  useNameAsTitle?: boolean; // Valid only if showTitle is true
}) {
  const { data, refetch } = trpcNext.users.getApplicant.useQuery({
    userId,
    type,
  });

  return !data ? (
    <Loader />
  ) : (
    <LoadedApplicant
      user={data.user}
      sex={data.sex}
      type={type}
      application={data.application}
      showTitle={showTitle}
      useNameAsTitle={useNameAsTitle}
      refetch={refetch}
    />
  );
}

function LoadedApplicant({
  user,
  sex,
  type,
  application,
  showTitle,
  useNameAsTitle,
  refetch,
}: {
  user: User;
  sex: string | null;
  type: InterviewType;
  application: Record<string, any> | null;
  refetch: () => void;
  showTitle?: boolean;
  useNameAsTitle?: boolean;
}) {
  const myRoles = useMyRoles();
  const isMentee = type == "MenteeInterview";
  const imPrivileged = isPermitted(myRoles, [
    "MentorshipManager",
    "MentorshipOperator",
  ]);

  const update = async (name: string, value: string) => {
    await trpc.users.setApplication.mutate({
      type,
      userId: user.id,
      application: {
        ...application,
        [name]: value,
      },
    });
    refetch();
  };

  return (
    <Flex direction="column" gap={sectionSpacing}>
      {showTitle && (
        <Heading size="md">
          {useNameAsTitle ? `${formatUserName(user.name)}` : "申请表"}
        </Heading>
      )}

      {sex && <FieldRow name="性别" readonly value={sex} />}

      {/* It's okay to have mentors' contact information visible to peers */}
      <ContactFieldRow
        mask={isMentee}
        copyable={!isMentee || imPrivileged}
        name="微信"
        value={user.wechat}
      />

      {/* There isn't a need to expose phone numbers yet */}
      {/* <ContactFieldRow
        mask={isMentee}
        copyable={!isMentee || imPrivileged}
        name="手机"
        value={removeChinaPhonePrefix(user.phone)}
      /> */}

      {(isMentee ? menteeApplicationFields : volunteerApplicationFields).map(
        (f) => {
          if (application && f.name in application) {
            return (
              <FieldRow
                readonly={!imPrivileged}
                key={f.name}
                name={f.name}
                value={application[f.name]}
                update={(v) => update(f.name, v)}
              />
            );
          } else if (imPrivileged && f.showForEdits) {
            return (
              <FieldRow
                readonly={false}
                key={f.name}
                name={f.name}
                value={""}
                update={(v) => update(f.name, v)}
              />
            );
          }
        },
      )}
    </Flex>
  );
}
