import {
  Td,
  Link,
  HStack,
  Tooltip,
  Badge,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import { UserWithMergeInfo } from 'shared/User';
import trpc from 'trpc';
import { compareDate } from 'shared/strings';
import { MdMerge } from 'react-icons/md';
import { toast } from 'react-toastify';
import ConfirmationModal from './ConfirmationModal';
import { canIssueMergeToken } from 'shared/merge';

export default function MergeTokenCell({ user, refetch } : {
  user: UserWithMergeInfo,
  refetch: () => void,
}) {
  return <Td>
    <HStack spacing={2}>
      <SendMergeToken
        userId={user.id}
        email={user.email}
        refetch={refetch}
      />

      {/* # mergedFrom */}
      {user.mergedFrom && user.mergedFrom.length > 0 &&
        <Tooltip label="已迁移到此账号的账号数量">
          <Badge colorScheme='blackAlpha'>{user.mergedFrom.length}</Badge>
        </Tooltip>
      }

      {/* # mergeToken */}
      {user.mergeToken && (
        compareDate(user.mergeToken.expiresAt, new Date()) > 0 ?
          <Tooltip label="已发送激活码，且尚未过期">
            <Badge colorScheme='green'>T</Badge>
          </Tooltip>
          :
          <Tooltip label="发送的激活码已经过期">
            <Badge bg="gray" color='white'><s>T</s></Badge>
          </Tooltip>
        )
      }
    </HStack>
  </Td>;
}

function SendMergeToken({ userId, email, refetch }: { 
  userId: string,
  email: string,
  refetch: () => void,
}) {
  const [confirming, setConfirming] = useState<boolean>(false);

  const send = async () => {
    await trpc.merge.emailMergeToken.mutate({ userId });
    toast.success("发送成功。");
    refetch();
  };

  return !canIssueMergeToken(email) ? <></> : <Link
    onClick={() => setConfirming(true)}
  >
    <MdMerge />
    {confirming && <ConfirmationModal
      message={`发送微信激活码到用户邮箱：${email}？`}
      confirm={send}
      close={() => setConfirming(false)}
    />}
  </Link>;
}
