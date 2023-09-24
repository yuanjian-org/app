import {
  Table,
  TableContainer,
  Tbody,
  Td,
} from '@chakra-ui/react';
import React from 'react';
import { EditIcon } from '@chakra-ui/icons';
import { useRouter } from 'next/router';
import Assessment from 'shared/Assessment';
import trpc from 'trpc';
import TrLink from './TrLink';

export default function AssessmentsPanel({ mentorshipId, assessments, allowEdit } : {
  mentorshipId: string,
  assessments: Assessment[],
  allowEdit?: boolean,
}) {
  return <TableContainer><Table>
    <Tbody>
      {assessments.length > 0 ? assessments.map(a => (
        <AssessmentRow
          key={a.id} 
          mentorshipId={mentorshipId} 
          assessmentId={a.id}
          date={a.createdAt}
          summary={a.summary}
          allowEdit={allowEdit}
        />
      ))
      : 
      <AssessmentRow
        mentorshipId={mentorshipId}
        date={new Date()}
        allowEdit={allowEdit}
      />}
    </Tbody>
  </Table></TableContainer>;
}

// Date is optional merely to suppress typescript warning
export function getYearText(date?: Date | string): string {
  // @ts-expect-error
  return new Date(date).getFullYear() + "年度";
}

function AssessmentRow({ mentorshipId, assessmentId, date, summary, allowEdit } : {
  mentorshipId: string,
  assessmentId?: string,  // When undefined, create a new assessment and enter the new assessment page.
  date?: Date | string,   // Optional merely to suppress typescript warning
  summary?: string | null,
  allowEdit?: boolean,
}) {
  const router = useRouter();
  const url = (assessmentId: string) => `/mentorships/${mentorshipId}/assessments/${assessmentId}`;
  const createAndGo = async () => {
    const id = await trpc.assessments.create.mutate({ partnershipId: mentorshipId });
    router.push(url(id));
  };

  return <TrLink
    {...assessmentId ? 
      { href: `/mentorships/${mentorshipId}/assessments/${assessmentId}` }
      :
      { onClick: createAndGo }
    }
  >
    <Td>
      {getYearText(date)}
    </Td>
    {summary ? 
      <Td>{summary}</Td> : 
      <Td color="disabled">尚未评估</Td>
    }
    {allowEdit &&
      <Td>
        <EditIcon />
      </Td>
    }
  </TrLink>;
}
