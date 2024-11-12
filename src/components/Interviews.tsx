import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  TableContainer,
  WrapItem,
  Wrap,
  Text,
  Tooltip,
  HStack,
  Td,
} from '@chakra-ui/react';
import React from 'react';
import Loader from 'components/Loader';
import { formatUserName, compareUUID, toPinyin } from 'shared/strings';
import { Interview } from 'shared/Interview';
import { useUserContext } from 'UserContext';
import { CheckIcon } from '@chakra-ui/icons';
import { sectionSpacing } from 'theme/metrics';
import {
  EditorFeedback,
  EditorFeedbackDimension,
  summaryDimensionName,
  summaryScoreLabels,
  getScoreColor,
} from './InterviewEditor';
import { CircleIcon } from './CircleIcon';
import { isPermitted } from 'shared/Role';
import { MenteeStatusSelectCell } from './MenteeStatusSelect';
import trpc, { trpcNext } from 'trpc';
import { MenteeStatus } from 'shared/MenteeStatus';
import invariant from 'tiny-invariant';
import TdLink from './TdLink';

/**
 * @param forCalibration when true, show additional columns in the table and
 * link to `/interviews/<id>` as opposed to `/interviews/<id>/feedback`.
 * 
 * TODO: Refactor to remove the `forCalibration` flag.
 */
export default function Interviews({ interviews, forCalibration }: {
  interviews: Interview[] | undefined
  forCalibration: boolean
}) {
  const [me] = useUserContext();

  // Show interviewee statuses only to MentorshipManagers
  const showStatus = forCalibration && isPermitted(me.roles,
    "MentorshipManager");
  
  return !interviews ? <Loader /> : <TableContainer>
    <Table>
      <Thead><Tr>
        {showStatus && <Th>状态</Th>}
        <Th>候选人</Th>
        <Th>{forCalibration ? "" : "其他"}面试官</Th>
        {forCalibration && <>
          <Th>讨论结果</Th>
          <Th>讨论备注（悬停光标看全文）</Th>
          <Th>拼音（便于查找）</Th>
        </>}
      </Tr></Thead>
      <Tbody>
      
      {interviews
        // Fix dislay order
        .sort((i1, i2) => compareUUID(i1.id, i2.id))
        .map(i => <InterviewRow
          i={i} 
          key={i.id}
          forCalibration={forCalibration}
          showStatus={showStatus}
        />)}
      </Tbody>
    </Table>

    <Text fontSize="sm" color="grey" marginTop={sectionSpacing}>
      共 <b>{interviews.length}</b> 名
    </Text>
    <Text marginTop={sectionSpacing} color="grey" fontSize="sm">
      <CheckIcon /> 表示已经填写了面试反馈的面试官。
    </Text>
  </TableContainer>;
}

function InterviewRow({ i, forCalibration, showStatus }: {
  i: Interview,
  forCalibration: boolean,
  showStatus: boolean
}) {
  const [me] = useUserContext();
  const { data: app, refetch } = trpcNext.users.getApplicant.useQuery({
    userId: i.interviewee.id,
    type: i.type,
  });

  const saveMenteeStatus = async (status: MenteeStatus | null | undefined) => {
    invariant(status !== undefined);
    await trpc.users.setMenteeStatus.mutate({
      userId: i.interviewee.id,
      menteeStatus: status
    });
    void refetch();
  };

  const url = forCalibration ? `/interviews/${i.id}` :
      `/interviews/${i.id}/feedback`;

  return <Tr key={i.id} _hover={{ bg: "white" }}>

    {showStatus && app && (i.type !== "MenteeInterview" ? <Td></Td> :
      <MenteeStatusSelectCell
        status={app.user.menteeStatus}
        onChange={saveMenteeStatus}
      />
    )}

    <TdLink href={url}>{formatUserName(i.interviewee.name)}</TdLink>

    <TdLink href={url}><Wrap spacing="2">
      {i.feedbacks
        .filter(f => forCalibration || f.interviewer.id !== me.id)
        .map(f => <WrapItem key={f.id}>
          {formatUserName(f.interviewer.name)}
          {f.feedbackUpdatedAt && <CheckIcon marginStart={1} />}
        </WrapItem>
      )}
    </Wrap></TdLink>

    {forCalibration && <>
      <TdLink href={url}><DecisionScore interview={i} /></TdLink>
      <TdLink href={url}><DecisionComment interview={i} /></TdLink>
    </>}

    {forCalibration && <TdLink href={url}>
      {toPinyin(i.interviewee.name ?? "")},
      {i.feedbacks
        .filter(f => forCalibration || f.interviewer.id !== me.id)
        .map(f => toPinyin(f.interviewer.name ?? "")).join(",")
      }
    </TdLink>}
  </Tr>;
}

function DecisionScore({ interview } : {
  interview: Interview,
}) {
  const d = getDimension(interview);
  return d?.score ? <HStack gap={2}>
    <CircleIcon color={getScoreColor(summaryScoreLabels, d.score)} />
    <Text>{summaryScoreLabels[d.score - 1]}</Text>
  </HStack> : null;
}

function DecisionComment({ interview } : {
  interview: Interview,
}) {
  const d = getDimension(interview);
  return d?.comment ? <Tooltip label={d.comment}>
    <Text isTruncated maxWidth="200px">{d.comment}</Text>
  </Tooltip> : null;
}

function getDimension(i: Interview): EditorFeedbackDimension | null {
  if (!i.decision) return null;
  for (const d of (i.decision as EditorFeedback).dimensions) {
    if (d.name == summaryDimensionName) return d;
  }
  return null;
}
