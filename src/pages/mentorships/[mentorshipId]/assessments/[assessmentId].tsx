import { trpcNext } from "../../../../trpc";
import PageBreadcrumb from "components/PageBreadcrumb";
import { useRouter } from "next/router";
import { parseQueryString } from "shared/strings/parseQueryString";
import Loader from "components/Loader";
import { Heading, Text, Flex } from "@chakra-ui/react";
import T from "components/T";

export default function Page() {
  return <AssessmentEditor />;
}

function AssessmentEditor() {
  const router = useRouter();
  const id = parseQueryString(router, "assessmentId");
  const { data: assessment } = trpcNext.assessments.get.useQuery(id ?? "", {
    enabled: !!id,
  });

  // const save = useCallback(async (summary: string) => {
  //   await trpc.assessments.update.mutate({ id, summary });
  // }, [id]);

  return (
    <>
      <PageBreadcrumb current="反馈与评估" />

      {!assessment ? (
        <Loader />
      ) : (
        <Flex direction="column" gap={6}>
          <Heading size="sm">
            <T>总评</T>
          </Heading>
          <Text color="disabled">
            <T>尚未开发</T>
          </Text>
          <Heading size="sm">
            <T>按辅助层面评估</T>
          </Heading>
          <Text color="disabled">
            <T>尚未开发</T>
          </Text>
        </Flex>
      )}
    </>
  );
}

// Date is optional merely to suppress typescript warning
export function getYearText(date?: Date | string): string {
  // @ts-expect-error
  return new Date(date).getFullYear() + "年度";
}

import getI18nProps from "components/getI18nProps";
export const getServerSideProps = getI18nProps;
