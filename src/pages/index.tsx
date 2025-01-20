import { Grid, VStack } from '@chakra-ui/react';
import PageBreadcrumb from 'components/PageBreadcrumb';
import GroupsCard from 'components/launchpad/GroupsCard';
import StudyCard from 'components/launchpad/StudyCard';
import TasksCard from 'components/launchpad/TasksCard';
import { PropsWithChildren } from 'react';
import { isPermitted } from 'shared/Role';
import { breakpoint, sectionSpacing } from 'theme/metrics';
import { useMyRoles } from 'useMe';

const title = "个人空间";

export default function Page() {
  return (<>
    <PageBreadcrumb current={title} />

    <Grid
      templateColumns={{ base: "1fr", [breakpoint]: "1fr 0.618fr" }}
      gap={sectionSpacing}
    >
      <Column>
        <GroupsCard />
      </Column>

      <Column>
        <TasksCard />

        {isPermitted(useMyRoles(), "Volunteer") && <StudyCard />}
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
