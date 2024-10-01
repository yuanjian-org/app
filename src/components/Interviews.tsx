import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  WrapItem,
  Wrap,
  Text,
  Tooltip,
  HStack,
} from '@chakra-ui/react';
import React from 'react';
import Loader from 'components/Loader';
import { formatUserName, compareUUID, toPinyin } from 'shared/strings';
import { Interview } from 'shared/Interview';
import { useUserContext } from 'UserContext';
import { CheckIcon } from '@chakra-ui/icons';
import TrLink from 'components/TrLink';
import { sectionSpacing } from 'theme/metrics';
import {
  EditorFeedback,
  EditorFeedbackDimension,
  summaryDimensionName,
  summaryScoreLabels,
  getScoreColor,
} from './InterviewEditor';
import { CircleIcon } from './CircleIcon';

/**
 * @param forCalibration when true, show the current user in the interviewer list, and link to `/interviews/<id>` as
 * opposed to `/interviews/<id>/feedback`.
 */
export default function Interviews({ interviews, forCalibration }: {
  interviews: Interview[] | undefined
  forCalibration: boolean
}) {
  const [me] = useUserContext();
  
  return !interviews ? <Loader /> : <TableContainer>
    <Table>
      <Thead><Tr>
        <Th>候选人</Th>
        <Th>{forCalibration ? "" : "其他"}面试官</Th>
        {forCalibration && <>
          <Th>讨论结果</Th>
          <Th>讨论备注（悬停光标看全文）</Th>
        </>}
        {forCalibration && <Th>拼音（便于查找）</Th>}
      </Tr></Thead>
      <Tbody>
      
      {interviews
      // Fix dislay order
      .sort((i1, i2) => compareUUID(i1.id, i2.id))
      .map(i => {
        return <TrLink key={i.id} href={forCalibration ? `/interviews/${i.id}` : `/interviews/${i.id}/feedback`}>
          <Td>
            {formatUserName(i.interviewee.name)}
          </Td>

          <Td><Wrap spacing="2">
            {i.feedbacks
              .filter(f => forCalibration || f.interviewer.id !== me.id)
              .map(f => <WrapItem key={f.id}>
                {formatUserName(f.interviewer.name)}
                {f.feedbackUpdatedAt && <CheckIcon marginStart={1} />}
              </WrapItem>
            )}
          </Wrap></Td>

          {forCalibration && <>
            <Td><DecisionScore interview={i} /></Td>
            <Td><DecisionComment interview={i} /></Td>
          </>}

          {forCalibration && <Td>
            {toPinyin(i.interviewee.name ?? "")},
            {i.feedbacks
              .filter(f => forCalibration || f.interviewer.id !== me.id)
              .map(f => toPinyin(f.interviewer.name ?? "")).join(",")
            }
          </Td>}
        </TrLink>;
      })}
      </Tbody>
    </Table>
    
    <Text fontSize="sm" color="grey" marginTop={sectionSpacing}>
      共 <b>{interviews.length}</b> 名
    </Text>
    <Text marginTop={sectionSpacing} color="grey" fontSize="sm"><CheckIcon /> 表示已经填写了面试反馈的面试官。</Text>
  </TableContainer>;
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
