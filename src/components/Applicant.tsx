import {
  Flex,
  Box,
  Link,
  UnorderedList,
  ListItem,
  Heading,
  useClipboard,
  Tooltip,
  Text,
} from "@chakra-ui/react";
import { useEffect } from "react";
import { CopyIcon, DownloadIcon } from "@chakra-ui/icons";
import Loader from "components/Loader";
import trpc, { trpcNext } from "trpc";
import {
  menteeApplicationFields,
  volunteerApplicationFields,
} from "shared/applicationFields";
import z from "zod";
import { sectionSpacing } from "theme/metrics";
import { formatUserName, notSetText } from "shared/strings";
import invariant from "tiny-invariant";
import EditableWithIconOrLink from "components/EditableWithIconOrLink";
import User from "shared/User";
import { displayName, isPermitted } from "shared/Role";
import NextLink from "next/link";
import { toast } from "react-toastify";
import { InterviewType } from "shared/InterviewType";
import { useMyRoles } from "useMe";
import { SmallGrayText } from "./SmallGrayText";

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

/**
 * @param value null if the value is not set
 */
function ContactFieldRow({
  mask,
  copyable,
  name,
  value,
}: {
  mask: boolean;
  copyable: boolean;
  name: string;
  value: string | null;
}) {
  const { onCopy, hasCopied } = useClipboard(value || "");

  useEffect(() => {
    if (hasCopied) toast.success("内容已经拷贝到剪贴板。");
  }, [hasCopied]);

  return (
    <Flex direction="column">
      <b>{name} </b>
      <Box>
        {!copyable && (
          <SmallGrayText>
            请联系
            <Link as={NextLink} href="/who-can-see-my-data">
              {displayName("MentorshipOperator")}
            </Link>
          </SmallGrayText>
        )}
        {copyable && !value && <Text color="gray">{notSetText}</Text>}
        {copyable && value && (
          <>
            {mask ? "••••••••••••" : value}{" "}
            <Tooltip label="拷贝内容到剪贴板">
              <CopyIcon onClick={onCopy} cursor="pointer" />
            </Tooltip>
          </>
        )}
      </Box>
    </Flex>
  );
}

function FieldRow({
  name,
  value,
  readonly,
  update,
}: {
  name: string;
  value: any;
  readonly: boolean;
  update?: (value: string) => Promise<void>; // required only if !readonly
}) {
  return (
    <Flex direction="column">
      <Box>
        <b>{name}</b>
      </Box>
      <Box>
        <FieldValueCell value={value} readonly={readonly} update={update} />
      </Box>
    </Flex>
  );
}

function FieldValueCell({
  value,
  readonly,
  update,
}: {
  value: any;
  readonly: boolean;
  update?: (value: string) => Promise<void>; // required only if !readonly
}) {
  invariant(readonly || update);

  // Array. Recurse.
  if (Array.isArray(value)) {
    return (
      <UnorderedList>
        {value.map((v, idx) => (
          <ListItem key={idx}>
            {/* Don't allow edits for child values */}
            <FieldValueCell readonly value={v} />
          </ListItem>
        ))}
      </UnorderedList>
    );

    // URL
  } else if (z.string().url().safeParse(value).success) {
    return (
      <Link href={value}>
        下载链接 <DownloadIcon />
      </Link>
    );

    // An arbitrary object
  } else if (typeof value === "object") {
    return JSON.stringify(value, null, 2);

    // String
  } else if (typeof value === "string") {
    const v = value.split("\n").join("\r\n");
    return readonly ? (
      value.split("\n").map((p, idx) => <p key={idx}>{p}</p>)
    ) : (
      <EditableWithIconOrLink
        editor="textarea"
        decorator="icon"
        defaultValue={v}
        onSubmit={update}
      />
    );

    // Other types. Display as is.
  } else {
    const v = value.toString();
    return readonly ? (
      v
    ) : (
      <EditableWithIconOrLink
        editor="input"
        decorator="icon"
        defaultValue={v}
        onSubmit={update}
      />
    );
  }
}
