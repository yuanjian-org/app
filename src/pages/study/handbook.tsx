import { VStack, Button, Text } from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import PageBreadcrumb from "components/PageBreadcrumb";
import { trpcNext } from "trpc";
import { prettifyDate } from "shared/strings";
import { sectionSpacing } from "theme/metrics";
import { getStandaloneFormUrl } from "pages/form";
import { encodeXField } from "shared/jinshuju";
import useMe from "useMe";

const title = "《社会导师手册》自学与评测";

export default function Page() {
  const me = useMe();
  const { data: state } = trpcNext.users.getUserState.useQuery();

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
          as="a"
          target="_blank"
          href="https://www.notion.so/yuanjian/16d36363e907809aa464da12861db4d7"
          variant="outline"
          colorScheme="brand"
          rightIcon={<ExternalLinkIcon />}
        >
          阅读《社会导师手册》
        </Button>

        <Text>第二步：</Text>
        <Button
          as="a"
          target="_blank"
          href={getStandaloneFormUrl("wqPdKE", encodeXField(me, me.id))}
          variant="brand"
        >
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
