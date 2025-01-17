import { VStack, Button, Text } from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import PageBreadcrumb from "components/PageBreadcrumb";
import { trpcNext } from "trpc";
import { prettifyDate } from "shared/strings";
import { sectionSpacing } from "theme/metrics";
import { getStandaloneFormUrl } from "pages/form";
import { encodeXField } from "shared/jinshuju";
import useMe from "useMe";

const title = "《学生通讯原则》自学与评测";

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
        这份材料介绍志愿者与学生沟通时的注意事项，并提供具体的情景分析。
      </Text>

      <Text>第一步：</Text>
      <Button
        as="a"
        target="_blank"
        href="https://www.notion.so/yuanjian/48e50e5ab07f4e37a77e6e93e7d4d311"
        variant="outline"
        colorScheme="brand"
        rightIcon={<ExternalLinkIcon />}
      >
        阅读《学生通讯原则》
      </Button>

      <Text>第二步：</Text>
      <Button
        as="a"
        target="_blank"
        href={getStandaloneFormUrl("nsnx4G", encodeXField(me, me.id))}
        variant="brand"
      >
        开始评测&nbsp;&nbsp;&nbsp;✍️
      </Button>

      {state && <>
        <Text>上次评测通过时间：</Text>
        <Text><b>
          {state.commsExam ?
            prettifyDate(state.commsExam) : "无"
          }
        </b></Text>
      </>}
    </VStack>
  </>;
}

Page.title = title;
