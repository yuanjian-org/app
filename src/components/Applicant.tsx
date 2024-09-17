import {
  Flex,
  Box,
  Link,
  UnorderedList,
  ListItem,
  Heading,
  Text,
  useClipboard,
  Tooltip,
} from '@chakra-ui/react';
import React, { useEffect } from 'react';
import { CopyIcon, DownloadIcon } from '@chakra-ui/icons';
import Loader from 'components/Loader';
import trpc, { trpcNext } from 'trpc';
import menteeApplicationFields from 'shared/menteeApplicationFields';
import z from "zod";
import { sectionSpacing } from 'theme/metrics';
import { formatUserName } from 'shared/strings';
import invariant from "tiny-invariant";
import EditableWithIconOrLink from "components/EditableWithIconOrLink";
import User from 'shared/User';
import { useUserContext } from 'UserContext';
import { isPermitted } from 'shared/Role';
import NextLink from "next/link";
import { toast } from 'react-toastify';
import { InterviewType } from 'shared/InterviewType';
import mentorApplicationFields from 'shared/mentorApplicationFields';

export default function Applicant({
  userId, type, showTitle, useNameAsTitle
} : {
  userId: string,
  type: InterviewType,
  showTitle?: boolean,
  useNameAsTitle?: boolean, // Valid only if showTitle is true
}) {
  const { data, refetch } = trpcNext.users.getApplicant.useQuery({
    userId, type
  });

  return !data ? <Loader /> :
    <LoadedApplicant user={data.user} type={type} application={data.application}
      showTitle={showTitle} useNameAsTitle={useNameAsTitle} refetch={refetch}
    />;
}

function LoadedApplicant({ user, type, application, showTitle, useNameAsTitle,
  refetch
} : {
  user: User,
  type: InterviewType,
  application: Record<string, any> | null,
  refetch: () => void,
  showTitle?: boolean,
  useNameAsTitle?: boolean,
}) {
  const [me] = useUserContext();
  const isMentee = type == "MenteeInterview";
  const imManager = isPermitted(me.roles, "MentorshipManager");

  const update = async (name: string, value: string) => {
    const updated = structuredClone(application ?? {});
    updated[name] = value;
    await trpc.users.updateApplication.mutate({
      type,
      userId: user.id,
      application: updated,
    });
    refetch();
  };

  return <Flex direction="column" gap={sectionSpacing}>
    {showTitle && <Heading size="md">{useNameAsTitle ?
      `${formatUserName(user.name)}` : "申请材料"}</Heading>}

    {user.sex && <FieldRow name="性别" readonly value={user.sex} />}

    {/* It's okay to have mentors' contact information visible to peers */}
    <ContactFieldRow redacted={isMentee} copyable={!isMentee || imManager}
      name="微信" value={user.wechat ?? '（未提供微信）'} />

    <ContactFieldRow redacted={isMentee} copyable={!isMentee || imManager}
      name="邮箱" value={user.email} />

    {(isMentee ? menteeApplicationFields : mentorApplicationFields).map(f => {
      if (application && f.name in application) {
        return <FieldRow readonly={!imManager} key={f.name} name={f.name}
          value={application[f.name]}
          update={v => update(f.name, v)}
        />;
      } else if (imManager && f.showForEdits) {
        return <FieldRow readonly={false} key={f.name} name={f.name}
          value={''}
          update={v => update(f.name, v)}
        />;
      }
    })}
  </Flex>;
}

function ContactFieldRow({ redacted, copyable, name, value }: { 
  redacted: boolean,
  copyable: boolean,
  name: string,
  value: string 
}) {
  // clipboard doesn't support copying of empty strings
  invariant(value !== "");
  const { onCopy, hasCopied } = useClipboard(value);

  useEffect(() => {
    if (hasCopied) toast.success("内容已经拷贝到剪贴板。");
  }, [hasCopied]);

  return <Flex direction="column">
    <Flex>
      <b>{name}{' '}</b>
      {!copyable && <Text color="grey">
        （请联系<Link as={NextLink} href="/who-can-see-my-data">学生管理员</Link>）
      </Text>}
    </Flex>
    <Box>
      {redacted ? '••••••••••••' : value}
      {' '}
      {copyable &&
        <Tooltip label="拷贝内容到剪贴板">
          <CopyIcon onClick={onCopy} cursor="pointer" />
        </Tooltip>
      }
    </Box>
  </Flex>;
}

function FieldRow({ name, value, readonly, update }: {
  name: string,
  value: any,
  readonly: boolean,
  update?: (value: string) => Promise<void>,  // required only if !readonly
}) {
  return <Flex direction="column">
    <Box><b>{name}</b></Box>
    <Box>
      <FieldValueCell value={value} readonly={readonly} update={update} />
    </Box>
  </Flex>;
}

function FieldValueCell({ value, readonly, update }: {
  value: any,
  readonly: boolean,
  update?: (value: string) => Promise<void>,  // required only if !readonly
}) {
  invariant(readonly || update);

  // Array. Recurse.
  if (Array.isArray(value)) {
    return <UnorderedList>
      {value.map((v, idx) => <ListItem key={idx}>
        {/* Don't allow edits for child values */}
        <FieldValueCell readonly value={v} />
      </ListItem>)}
    </UnorderedList>;

  // URL
  } else if (z.string().url().safeParse(value).success) {
    return <Link href={value}>
      下载链接 <DownloadIcon />
    </Link>;

  // An arbitrary object
  } else if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  
  // String
  } else if (typeof value === "string") {
    const v = value.split("\n").join("\r\n");
    return readonly ?
      value.split("\n").map((p, idx) => <p key={idx}>{p}</p>)
      :
      <EditableWithIconOrLink editor="textarea" decorator="icon"
        defaultValue={v} onSubmit={update}
      />;
  
  // Other types. Display as is.
  } else {
    return value;
  }
}
