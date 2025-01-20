import { trpcNext } from "../../../../trpc";
import PageBreadcrumb from 'components/PageBreadcrumb';
import { useRouter } from 'next/router';
import { parseQueryString } from "shared/strings";
import Loader from 'components/Loader';
import { Heading, Text, Flex } from '@chakra-ui/react';

export default function Page() { return <AssessmentEditor />; }

function AssessmentEditor() {
  const router = useRouter();
  const id = parseQueryString(router, "assessmentId");
  const { data: assessment } = trpcNext.assessments.get.useQuery(id ?? "", {
    enabled: !!id,
  });

  // const save = useCallback(async (summary: string) => {
  //   await trpc.assessments.update.mutate({ id, summary });
  // }, [id]);

  return (<>
    <PageBreadcrumb current="反馈与评估" />

    {!assessment ? <Loader /> : <Flex direction="column" gap={6}>
      <Heading size="sm">总评</Heading>
      <Text color="disabled">尚未开发</Text>
      <Heading size="sm">按辅助层面评估</Heading>
      <Text color="disabled">尚未开发</Text>
    </Flex>}
  </>);
}

// Date is optional merely to suppress typescript warning
export function getYearText(date?: Date | string): string {
  // @ts-expect-error
  return new Date(date).getFullYear() + "年度";
}
