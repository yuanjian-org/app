import { VStack, Button, Text } from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import PageBreadcrumb from "components/PageBreadcrumb";
import { trpcNext } from "trpc";
import { prettifyDate } from "shared/strings";
import { sectionSpacing } from "theme/metrics";
import { getStandaloneFormUrl } from "pages/form";
import { encodeXField } from "shared/jinshuju";
import useMe from "useMe";

const title = "面试官自学与评测";

export default function Page() {
  const me = useMe();
  const { data: state } = trpcNext.users.getUserState.useQuery();

  return <>
    <PageBreadcrumb current={title} />

    <VStack
      mt={sectionSpacing}
      spacing={sectionSpacing}
      maxW="lg"
      align="stretch"
    >
      <Text>
        面试官是候选人了解社会导师制的第一扇窗口。请充分准备面试，为每位候选人留下良好的第一印象。
      </Text>

      <Text>第一步：</Text>
      <Button
        as="a"
        target="_blank"
        href="https://www.notion.so/yuanjian/4616bf621b5b41fbbd62477d66d87ffe"
        variant="outline"
        colorScheme="brand"
        rightIcon={<ExternalLinkIcon />}
      >
        阅读《招生流程与须知》
      </Button>

      <Text>第二步：</Text>
      <Button
        as="a"
        target="_blank"
        href="https://www.notion.so/yuanjian/0de91c837f1743c3a3ecdedf78f9e064"
        variant="outline"
        colorScheme="brand"
        rightIcon={<ExternalLinkIcon />}
      >
        阅读《面试标准与参考题库》
      </Button>

      <Text>第三步：</Text>
      <Button
        as="a"
        target="_blank"
        href={getStandaloneFormUrl("w02l95", encodeXField(me, me.id))}
        variant="brand"
      >
        开始评测&nbsp;&nbsp;&nbsp;✍️
      </Button>

      {state && <>
        <Text>上次评测通过时间：</Text>
        <Text><b>
          {state.menteeInterviewerExam ?
            prettifyDate(state.menteeInterviewerExam) : "无"
          }
        </b></Text>
      </>}
    </VStack>
  </>;
}

Page.title = title;
