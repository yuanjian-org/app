import { VStack, Button, Link, Text } from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import PageBreadcrumb from "components/PageBreadcrumb";
import trpc, { trpcNext } from "trpc";
import { prettifyDate } from "shared/strings";
import { sectionSpacing } from "theme/metrics";
import { getStandaloneFormUrl } from "pages/form";
import { useState } from "react";

const title = "《社会导师手册》自学与评测";

export default function Page() {
  const { data: state } = trpcNext.users.getUserState.useQuery();
  const [loading, setLoading] = useState(false);

  const handleStartExam = async () => {
    setLoading(true);
    try {
      const xField = await trpc.users.getJinshujuXField.query();
      const w = window.open(getStandaloneFormUrl("wqPdKE", xField), "_blank");
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
          此手册是一对一导师的重要参考资料，总结了导师在辅助学生时应遵循的原则和方法框架。
        </Text>

        <Text>第一步：</Text>
        <Button
          as={Link}
          isExternal
          href="https://yuanjian.notion.site/37136363e907807685b3daba4cb5c2cf"
          variant="outline"
          colorScheme="brand"
          rightIcon={<ExternalLinkIcon />}
        >
          阅读《社会导师手册》
        </Button>

        <Text>第二步：</Text>
        <Button isLoading={loading} onClick={handleStartExam} variant="brand">
          开始评测&nbsp;&nbsp;&nbsp;✍️
        </Button>

        {state && (
          <>
            <Text>上次评测通过时间：</Text>
            <Text>
              <b>
                {state.handbookExam ? prettifyDate(state.handbookExam) : "无"}
              </b>
            </Text>
          </>
        )}
      </VStack>
    </>
  );
}

Page.title = title;
