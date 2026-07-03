import { VStack, Button, Link, Text } from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import PageBreadcrumb from "components/PageBreadcrumb";
import trpc, { trpcNext } from "trpc";
import { prettifyDate } from "shared/strings/prettifyDate";
import { sectionSpacing } from "theme/metrics";
import { getStandaloneFormUrl } from "pages/form";
import { useState } from "react";

const title = "《学生通讯原则》自学与评测";

export default function Page() {
  const { data: state } = trpcNext.users.getUserState.useQuery();
  const [loading, setLoading] = useState(false);

  const handleStartExam = async () => {
    setLoading(true);
    try {
      const xField = await trpc.users.getJinshujuXField.query({});
      const w = window.open(getStandaloneFormUrl("nsnx4G", xField), "_blank");
      // Prevent reverse tabnabbing vulnerability
      if (w) w.opener = null;
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageBreadcrumb current={title} />

      <VStack
        mt={sectionSpacing}
        spacing={sectionSpacing}
        maxW="lg"
        align="stretch"
      >
        <Text>
          这份材料介绍志愿者与学生沟通时的注意事项，并提供具体的情景分析。
        </Text>

        <Text>第一步：</Text>
        <Button
          as={Link}
          isExternal
          href="https://yuanjian.notion.site/37636363e90780e28c2adee62ffebc09"
          variant="outline"
          colorScheme="brand"
          rightIcon={<ExternalLinkIcon />}
        >
          阅读《学生通讯原则》
        </Button>

        <Text>第二步：</Text>
        <Button isLoading={loading} onClick={handleStartExam} variant="brand">
          开始评测&nbsp;&nbsp;&nbsp;✍️
        </Button>

        {state && (
          <>
            <Text>上次评测通过时间：</Text>
            <Text>
              <b>{state.commsExam ? prettifyDate(state.commsExam) : "无"}</b>
            </Text>
          </>
        )}
      </VStack>
    </>
  );
}

Page.title = title;
