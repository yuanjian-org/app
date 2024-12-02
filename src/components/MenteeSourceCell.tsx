import { Th, Td, Tooltip, Text, } from '@chakra-ui/react';

export function MenteeSourceHeaderCell() {
  return <Th>来源（悬停光标看全文）</Th>;
}

export function MenteeSourceCell({ source } : {
  source: string | null,
}) {
  return <Td>
    {source && <Tooltip label={source}>
      <Text isTruncated maxWidth="130px">{source}</Text>
    </Tooltip>}
  </Td>;
}
