import { VStack, ListItem, UnorderedList } from '@chakra-ui/react';
import PageBreadcrumb from 'components/PageBreadcrumb';
import { componentSpacing, maxTextWidth } from 'theme/metrics';
import { trpcNext } from 'trpc';

export default function Page() {
  const { data } = trpcNext.summaries.listDeleted.useQuery();
  const sorted = data?.sort((a, b) => b.id - a.id);

  return (
    <VStack spacing={componentSpacing} width={maxTextWidth} align="start">
      <PageBreadcrumb current="已删除纪要文字" />

      <UnorderedList spacing={componentSpacing}>
        {sorted?.map(d => <ListItem key={d.id}>{d.text}</ListItem>)}
      </UnorderedList>
    </VStack>
  );
}
