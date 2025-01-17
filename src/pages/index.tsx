import { Grid, VStack } from '@chakra-ui/react';
import PageBreadcrumb from 'components/PageBreadcrumb';
import GroupsGadget from 'components/gadgets/GroupsGadget';
import NewsGadget from 'components/gadgets/NewsGadget';
import StudyGadget from 'components/gadgets/StudyGadget';
import { PropsWithChildren } from 'react';
import { isPermitted } from 'shared/Role';
import { breakpoint, sectionSpacing } from 'theme/metrics';
import { useMyRoles } from 'useMe';

const title = "个人空间";

export default function Page() {
  return (<>
    <PageBreadcrumb current={title} />

    <Grid
      templateColumns={{ base: "1fr", [breakpoint]: "1fr 1fr" }} 
      gap={sectionSpacing}
    >
      <Column>
        <GroupsGadget />
      </Column>

      <Column>
        <NewsGadget />

        {isPermitted(useMyRoles(), "Volunteer") && <StudyGadget />}
      </Column>
    </Grid>
  </>);
}

function Column({ children }: PropsWithChildren) {
  return <VStack w="full" align="stretch" spacing={sectionSpacing}>
    {children}
  </VStack>;
}

Page.title = title;
