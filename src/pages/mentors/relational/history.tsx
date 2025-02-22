import { Card, CardBody, Grid, GridItem, Heading, Text } from "@chakra-ui/react";

import { VStack } from "@chakra-ui/react";
import PageBreadcrumb from "components/PageBreadcrumb";
import { componentSpacing, sectionSpacing } from "theme/metrics";
import { trpcNext } from "trpc";
import Loader from "components/Loader";
import { MentorSelectionBatch } from "shared/MentorSelection";
import { compareDate, formatUserName, prettifyDate } from "shared/strings";
import invariant from "shared/invariant";

export default function Page() {
  const { data } = trpcNext.mentorSelections.listFinalizedBatches.useQuery();

  return <>
    <PageBreadcrumb current="导师选择历史" />

    <VStack w="2xl" spacing={sectionSpacing} align="start">

      {!data ? <Loader /> : data.length === 0 ?
        <Text> 尚无选择历史。 </Text>
        :
        data.sort((a, b) => compareDate(b.finalizedAt, a.finalizedAt))
          .map(batch => <Batch key={batch.id} batch={batch} />)
      }
    </VStack>
  </>;
}

function Batch({ batch }: {
  batch: MentorSelectionBatch
}) {
  invariant(batch.finalizedAt, "Batch must be finalized");
  return <>
    <Heading size="sm">
      {prettifyDate(batch.finalizedAt)}
    </Heading>

    <Card w="full">
      <CardBody>
        <Grid templateColumns="auto 1fr" gap={componentSpacing}>
          {batch.selections.map((s, idx) => <>
            <GridItem key={idx} whiteSpace="nowrap">
              <Text>
                {idx + 1}. <b>{formatUserName(s.mentor.name, "formal")}</b>：
              </Text>
            </GridItem>
            <GridItem>
              <Text>
                {s.reason}
              </Text>
            </GridItem>
          </>)}
        </Grid>
      </CardBody>
    </Card>
  </>;
}

