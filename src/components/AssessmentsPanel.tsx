import {
  Table,
  Tbody,
  Td,
} from '@chakra-ui/react';
import React from 'react';
import { EditIcon } from '@chakra-ui/icons';
import Loader from 'components/Loader';
import { useRouter } from 'next/router';
import NextLink from "next/link";
import Assessment from 'shared/Assessment';
import trpc from 'trpc';
import TrLink from './TrLink';

export default function AssessmentsPanel({ partnershipId, assessments, allowEdit } : {
  partnershipId: string,
  assessments: Assessment[] | undefined | null,
  allowEdit?: boolean,
}) {
  return !assessments ? 
    <Loader /> 
    : 
    <Table>
      <Tbody>
        {assessments.length > 0 ? assessments.map(a => (
          <AssessmentRow
            key={a.id} 
            mentorshipId={partnershipId} 
            assessmentId={a.id}
            date={a.createdAt}
            summary={a.summary}
            allowEdit={allowEdit}
          />
        ))
        : 
        <AssessmentRow
          mentorshipId={partnershipId}
          date={new Date()}
          allowEdit={allowEdit}
        />}
      </Tbody>
    </Table>;
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
    href={assessmentId ? `/mentorships/${mentorshipId}/assessments/${assessmentId}` : "#"}
    onClick={assessmentId ? undefined : createAndGo}
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
