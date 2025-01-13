import { Th, Td } from '@chakra-ui/react';
import TruncatedTextWithTooltip from './TruncatedTextWithTooltip';

export function MenteeSourceHeaderCell() {
  return <Th>来源</Th>;
}

export function MenteeSourceCell({ source } : {
  source: string | null,
}) {
  return <Td>
    {source && <TruncatedTextWithTooltip text={source} maxW="130px" />}
  </Td>;
}
