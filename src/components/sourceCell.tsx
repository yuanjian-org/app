import { Th, Td } from '@chakra-ui/react';
import { menteeSourceField } from 'shared/applicationFields';

export function SourceHeaderCell() {
  return <Th>来源</Th>;
}

export function SourceCell({ application } : {
  application: {} | null | undefined,
}) {
  const source = (application as Record<string, any> | null)
    ?.[menteeSourceField];

  return <Td>{source}</Td>;
}
