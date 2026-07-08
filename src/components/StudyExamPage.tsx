import T from "components/T";
import { VStack, Button, Link, Text } from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import PageBreadcrumb from "components/PageBreadcrumb";
import trpc, { trpcNext } from "trpc";
import { prettifyDate } from "shared/strings/prettifyDate";
import { sectionSpacing } from "theme/metrics";
import { getStandaloneFormUrl } from "pages/form";
import { useState } from "react";
export interface StudyExamPageProps {
  title: string;
  description: string;
  links: Array<{
    href: string;
    text: string;
  }>;
  examFormId: string;
  examStateKey: "commsExam" | "handbookExam" | "menteeInterviewerExam";
}
export default function StudyExamPage({
  title,
  description,
  links,
  examFormId,
  examStateKey,
}: StudyExamPageProps) {
  const { data: state } = trpcNext.users.getUserState.useQuery();
  const [loading, setLoading] = useState(false);
  const handleStartExam = async () => {
    setLoading(true);
    try {
      const xField = await trpc.users.getJinshujuXField.query({});
      const w = window.open(getStandaloneFormUrl(examFormId, xField), "_blank");
      // Prevent reverse tabnabbing vulnerability
      if (w) w.opener = null;
    } finally {
      setLoading(false);
    }
  };
  const numberToChinese = ["一", "二", "三", "四", "五"];
  return (
    <>
      <PageBreadcrumb current={title} />

      <VStack
        mt={sectionSpacing}
        spacing={sectionSpacing}
        maxW="lg"
        align="stretch"
      >
        <Text>{description}</Text>

        {links.map((link, index) => (
          <div key={index}>
            <Text>
              <T>第</T>
              {numberToChinese[index]}
              <T>步：</T>
            </Text>
            <Button
              as={Link}
              isExternal
              href={link.href}
              variant="outline"
              colorScheme="brand"
              rightIcon={<ExternalLinkIcon />}
              w="full"
              justifyContent="center"
              mt={4}
            >
              {link.text}
            </Button>
          </div>
        ))}

        <Text>
          <T>第</T>
          {numberToChinese[links.length]}
          <T>步：</T>
        </Text>
        <Button isLoading={loading} onClick={handleStartExam} variant="brand">
          <T>开始评测   ✍️</T>
        </Button>

        {state && (
          <>
            <Text>
              <T>上次评测通过时间：</T>
            </Text>
            <Text>
              <b>
                {state[examStateKey]
                  ? prettifyDate(new Date(state[examStateKey] as string))
                  : "无"}
              </b>
            </Text>
          </>
        )}
      </VStack>
    </>
  );
}
