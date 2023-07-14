import React, { useCallback } from 'react';
import { NextPageWithLayout } from "../../../../NextPageWithLayout";
import AppLayout from "../../../../AppLayout";
import trpc, { trpcNext } from "../../../../trpc";
import PageBreadcrumb from 'components/PageBreadcrumb';
import { useRouter } from 'next/router';
import { parseQueryParameter } from '../../../../parseQueryParamter';
import Assessment from 'shared/Assessment';
import Loader from 'components/Loader';
import { AutosavingMarkdownEditor } from 'components/MarkdownEditor';
import { Heading, Text, Flex } from '@chakra-ui/react';
import { getYearText } from 'components/AssessmentsPanel';

const Page: NextPageWithLayout = () => <AssessmentEditor />;

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

function AssessmentEditor() {
  const router = useRouter();
  const id = parseQueryParameter(router, "assessmentId");
  const partnershipId = parseQueryParameter(router, "partnershipId");
  const { data: assessment } = trpcNext.assessments.get.useQuery<Assessment>(id);

  const save = useCallback(async (summary: string) => {
    await trpc.assessments.update.mutate({ id, summary });
  }, [id]);

  return (<>
    <PageBreadcrumb current={assessment ? getYearText(assessment.createdAt): "评估年度"} parents={[
      { name: "一对一导师管理", link: "/partnerships" },
      { name: "评估列表", link: `/partnerships/${partnershipId}/assessments` },
    ]} />

    {!assessment ? <Loader /> : <Flex direction="column" gap={6}>
      <Heading size="sm">总评</Heading>
      <AutosavingMarkdownEditor key={assessment.id} initialValue={assessment?.summary || ''} onSave={save} />
      <Heading size="sm">按辅助层面评估</Heading>
      <Text color="disabled">尚未开发</Text>
    </Flex>}
  </>);
}
