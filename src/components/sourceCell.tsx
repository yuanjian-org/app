import { Th, Tooltip, Text, } from '@chakra-ui/react';
import { menteeSourceField } from 'shared/applicationFields';

export function SourceHeaderCell() {
  return <Th>来源（悬停光标看全文）</Th>;
}

export function SourceCell({ application } : {
  application: {} | null | undefined,
}) {
  const source = (application as Record<string, any> | null)
    ?.[menteeSourceField];

  return <Tooltip label={source}>
    <Text isTruncated maxWidth="130px">{source}</Text>
  </Tooltip>;
}
