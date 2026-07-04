import { Grid, VStack } from "@chakra-ui/react";
import PageBreadcrumb from "components/PageBreadcrumb";
import dynamic from "next/dynamic";

// Dynamically import complex dashboard cards so the home page shell and
// navigation breadcrumb render instantly without waiting for card subtrees.
const GroupsCard = dynamic(() => import("components/launchpad/GroupsCard"));
const MentorCard = dynamic(() => import("components/launchpad/MentorCard"));
const TasksCard = dynamic(() => import("components/launchpad/TasksCard"));
import { PropsWithChildren } from "react";
import { isPermitted } from "shared/Role";
import { breakpoint } from "theme/breakpoints";
import { sectionSpacing } from "theme/metrics";
import { useMyId, useMyRoles } from "useMe";

const title = "个人空间";

export default function Page() {
  const myRoles = useMyRoles();
  const myId = useMyId();
  return (
    <>
      <PageBreadcrumb current={title} />

      <Grid
        templateColumns={{ base: "1fr", [breakpoint]: "1fr 0.618fr" }}
        gap={sectionSpacing}
      >
        <Column>
          <GroupsCard />
        </Column>

        <Column>
          <TasksCard
            assigneeIds={[myId]}
            allowMentorshipAssignment
            includeTasksCreatedByMe
          />

          {isPermitted(myRoles, "Mentor") && <MentorCard />}
        </Column>
      </Grid>
    </>
  );
}

function Column({ children }: PropsWithChildren) {
  return (
    <VStack w="full" align="stretch" spacing={sectionSpacing}>
      {children}
    </VStack>
  );
}

Page.title = title;
