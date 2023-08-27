import {
  Flex,
  Box,
  Link,
  UnorderedList,
  ListItem,
  Heading,
} from '@chakra-ui/react'
import React from 'react'
import { DownloadIcon } from '@chakra-ui/icons';
import Loader from 'components/Loader';
import trpc, { trpcNext } from 'trpc';
import menteeApplicationFields from 'shared/menteeApplicationFields';
import z from "zod";
import { paragraphSpacing, sectionSpacing } from 'theme/metrics';
import { formatUserName } from 'shared/strings';
import invariant from "tiny-invariant";
import EditableWithIcon from "components/EditableWithIcon";
import User from 'shared/User';

export default function MenteeApplicant({ userId, showName, showContact, readonly } : {
  userId: string,
  readonly: boolean
  showName?: boolean,
  showContact?: boolean,
}) {
  const { data, refetch } = trpcNext.users.getApplicant.useQuery({ userId, type: "MenteeInterview" });

  return !data ? <Loader /> :
    <LoadedApplicant user={data.user} application={data.application} showName={showName} showContact={showContact}
      readonly={readonly} refetch={refetch}
    />;
}

function LoadedApplicant({ user, application, showName, showContact, readonly, refetch } : {
  user: User,
  application: Record<string, any> | null,
  readonly: boolean
  refetch: () => void,
  showName?: boolean,
  showContact?: boolean,
}) {
  const update = async (name: string, value: string) => {
    const updated = structuredClone(application ?? {});
    updated[name] = value;
    await trpc.users.updateApplication.mutate({
      type: "MenteeInterview",
      userId: user.id,
      application: updated,
    });
    refetch();
  };

  return <Flex direction="column" gap={sectionSpacing}>
    <Heading size="md">{showName ? `${formatUserName(user.name, "formal")}` : "申请材料"}</Heading>

    <FieldRow name="性别" readonly value={user.sex ?? ''} />

    {showContact && <>
      <FieldRow name="微信" readonly value={user.wechat ?? ''} />
      <FieldRow name="邮箱" readonly value={user.email} />
    </>}

    {!application ? "没有申请数据。" : menteeApplicationFields.map(f => {
      invariant(application);
      if (f.name in application) {
        return <FieldRow readonly={readonly} key={f.name} name={f.name}
          // @ts-ignore
          value={application[f.name]}
          update={v => update(f.name, v)}
        />;
      }
    })}
  </Flex>;
}

function FieldRow({ name, value, readonly, update }: {
  name: string,
  value: any,
  readonly: boolean,
  update?: (value: string) => Promise<void>,  // required only if !readonly
}) {
  return <Flex direction="column" gap={paragraphSpacing}>
    <Box><b>{name}</b></Box>
    <Box><FieldValueCell value={value} readonly={readonly} update={update} /></Box>
  </Flex>;
}

function FieldValueCell({ value, readonly, update }: {
  value: any,
  readonly: boolean,
  update?: (value: string) => Promise<void>,  // required only if !readonly
}) {
  invariant(readonly || update);

  if (Array.isArray(value)) {
    return <UnorderedList>
      {value.map((v, idx) => <ListItem key={idx}>
        {/* Don't allow edits for child values */}
        <FieldValueCell readonly value={v} />
      </ListItem>)}
    </UnorderedList>;
  } else if (z.string().url().safeParse(value).success) {
    return <Link href={value}>
      下载链接 <DownloadIcon />
    </Link>;
  } else if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  } else if (typeof value === "string") {
    const v = value.split("\n").join("\r\n");
    return readonly ?
      value.split("\n").map((p, idx) => <p key={idx}>{p}</p>)
      :
      <EditableWithIcon mode="textarea" defaultValue={v} onSubmit={update} />;
  } else {
    return value;
  }
}
