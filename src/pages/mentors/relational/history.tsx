import { Card, CardBody, Grid, GridItem, Heading, Text } from "@chakra-ui/react";

import { ChevronLeftIcon } from "@chakra-ui/icons";
import { Link, VStack } from "@chakra-ui/react";
import NextLink from "next/link";
import PageBreadcrumb from "components/PageBreadcrumb";
import { componentSpacing, maxTextWidth, sectionSpacing } from "theme/metrics";
import { trpcNext } from "trpc";
import Loader from "components/Loader";
import { MentorSelectionBatch } from "shared/MentorSelection";
import { compareDate, formatUserName, prettifyDate } from "shared/strings";
import invariant from "shared/invariant";

export default function Page() {
  const { data } = trpcNext.mentorSelections.listFinalizedBatches.useQuery();

  return <>
    <PageBreadcrumb current="导师选择历史" />

    <VStack maxW={maxTextWidth} spacing={sectionSpacing} align="start">

      {!data ? <Loader /> : data.length === 0 ?
        <Text color="gray"> 尚无选择历史。 </Text>
        :
        data.sort((a, b) => compareDate(b.finalizedAt, a.finalizedAt))
          .map(batch => <Batch key={batch.id} batch={batch} />)
      }

      <Link as={NextLink} href="/mentors/relational">
        <ChevronLeftIcon me={1} /> 返回选择页面
      </Link>
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
              {idx + 1}. <b>{formatUserName(s.mentor.name, "formal")}</b>：
            </GridItem>
            <GridItem>
              {s.reason}
            </GridItem>
          </>)}
        </Grid>
      </CardBody>
    </Card>
  </>;
}

