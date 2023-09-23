import React, { useCallback } from 'react';
import trpc, { trpcNext } from "../../../../trpc";
import PageBreadcrumb from 'components/PageBreadcrumb';
import { useRouter } from 'next/router';
import { parseQueryStringOrUnknown } from "shared/strings";
import Assessment from 'shared/Assessment';
import Loader from 'components/Loader';
import { AutosavingMarkdownEditor } from 'components/MarkdownEditor';
import { Heading, Text, Flex } from '@chakra-ui/react';
import { getYearText } from 'components/AssessmentsPanel';

export default function Page() { return <AssessmentEditor />; }

function AssessmentEditor() {
  const router = useRouter();
  const id = parseQueryStringOrUnknown(router, "assessmentId");
  const mentorshipId = parseQueryStringOrUnknown(router, "mentorshipId");
  const { data: assessment } = trpcNext.assessments.get.useQuery<Assessment>(id);

  const save = useCallback(async (summary: string) => {
    await trpc.assessments.update.mutate({ id, summary });
  }, [id]);

  return (<>
    <PageBreadcrumb current={assessment ? getYearText(assessment.createdAt): "评估年度"} parents={[
      { name: "一对一导师管理", link: "/mentorships" },
      { name: "评估列表", link: `/mentorships/${mentorshipId}/assessments` },
    ]} />

    {!assessment ? <Loader /> : <Flex direction="column" gap={6}>
      <Heading size="sm">总评</Heading>
      <AutosavingMarkdownEditor key={assessment.id} initialValue={assessment?.summary || ''} onSave={save} />
      <Heading size="sm">按辅助层面评估</Heading>
      <Text color="disabled">尚未开发</Text>
    </Flex>}
  </>);
}
