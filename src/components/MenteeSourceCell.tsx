import { Th, Td, Tooltip, Text, } from '@chakra-ui/react';
import { menteeSourceField } from 'shared/applicationFields';

export function MenteeSourceHeaderCell() {
  return <Th>来源（悬停光标看全文）</Th>;
}

export function MenteeSourceCell({ application } : {
  application: {} | null | undefined,
}) {
  const source = (application as Record<string, any> | null)
    ?.[menteeSourceField];

  return <Td>
    <Tooltip label={source}>
      <Text isTruncated maxWidth="130px">{source}</Text>
    </Tooltip>
  </Td>;
}
