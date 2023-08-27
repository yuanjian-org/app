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
import { trpcNext } from 'trpc';
import menteeApplicationFields from 'shared/menteeApplicationFields';
import z from "zod";
import { paragraphSpacing, sectionSpacing } from 'theme/metrics';
import { formatUserName } from 'shared/strings';
import invariant from "tiny-invariant";

export default function MenteeApplicant({ userId, showName, showContact } : {
  userId: string,
  showName?: boolean,
  showContact?: boolean,
}) {
  const { data } = trpcNext.users.getApplicant.useQuery({ 
    userId,
    type: "MenteeInterview",
  });

  return !data ? <Loader /> : <Flex direction="column" gap={sectionSpacing}>
    <Heading size="md">{showName ? `${formatUserName(data.user.name, "formal")}` : "申请材料"}</Heading>

    {data.user.sex && <FieldRow name="性别" value={data.user.sex} />}

    {showContact && <>
      <FieldRow name="微信" value={data.user.wechat || '（无）'} />
      <FieldRow name="邮箱" value={data.user.email} />
    </>}

    {!data.application ? "没有申请数据。" : menteeApplicationFields.map(f => {
      invariant(data.application);
      if (f.name in data.application) {
        return <FieldRow key={f.name} name={f.name}
          // @ts-ignore
          value={data.application[f.name]} 
        />;
      }
    })}
  </Flex>;
}

function FieldRow({ name, value }: {
  name: string,
  value: any,
}) {
  return <Flex direction="column" gap={paragraphSpacing}>
    <Box><b>{name}</b></Box>
    <Box><FieldValueCell value={value} /></Box>
  </Flex>;
}

function FieldValueCell({ value }: {
  value: any,
}) {
  if (Array.isArray(value)) {
    return <UnorderedList>
      {value.map((v, idx) => <ListItem key={idx}><FieldValueCell value={v} /></ListItem>)}
    </UnorderedList>;
  } else if (z.string().url().safeParse(value).success) {
    return <Link href={value}>
      下载链接 <DownloadIcon />
    </Link>;
  } else if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  } else if (typeof value === "string") {
    return value.split("\n").map((p, idx) => <p key={idx}>{p}</p>);
  } else {
    return value;
  }
}
