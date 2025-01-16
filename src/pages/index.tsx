import { Grid, VStack } from '@chakra-ui/react';
import PageBreadcrumb from 'components/PageBreadcrumb';
import GroupsGadget from 'components/gadgets/GroupsGadget';
import NewsGadget from 'components/gadgets/NewsGadget';
import { breakpoint, sectionSpacing } from 'theme/metrics';

const title = "个人空间";

export default function Page() {
  return (<>
    <PageBreadcrumb current={title} />

    <Grid
      templateColumns={{ base: "1fr", [breakpoint]: "1fr 1fr" }} 
      gap={sectionSpacing}
    >
      <VStack w="full" align="stretch">
        <GroupsGadget />
      </VStack>
      <VStack w="full" align="stretch">
        <NewsGadget />
      </VStack>
    </Grid>
  </>);
}

Page.title = title;
