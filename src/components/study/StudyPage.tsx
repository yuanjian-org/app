import { VStack, Button, Link, Text, Box } from "@chakra-ui/react";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import PageBreadcrumb from "components/PageBreadcrumb";
import trpc, { trpcNext } from "trpc";
import { prettifyDate } from "shared/strings/prettifyDate";
import { sectionSpacing } from "theme/metrics";
import { getStandaloneFormUrl } from "pages/form";
import { useState } from "react";
import { UserState } from "shared/UserState";

export interface StudyPageProps {
  title: string;
  description: string;
  steps: {
    label: string;
    url: string;
  }[];
  formId: string;
  examDateKey: keyof UserState;
}

export default function StudyPage({
  title,
  description,
  steps,
  formId,
  examDateKey,
}: StudyPageProps) {
  const { data: state } = trpcNext.users.getUserState.useQuery();
  const [loading, setLoading] = useState(false);

  const handleStartExam = async () => {
    setLoading(true);
    try {
      const xField = await trpc.users.getJinshujuXField.query({});
      const w = window.open(getStandaloneFormUrl(formId, xField), "_blank");
      // Prevent reverse tabnabbing vulnerability
      if (w) w.opener = null;
    } finally {
      setLoading(false);
    }
  };

  const nextStepLabel = ["第一步：", "第二步：", "第三步：", "第四步："][
    steps.length
  ];

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

        {steps.map((step, idx) => (
          <Box key={idx}>
            <Text>{["第一步：", "第二步：", "第三步：", "第四步："][idx]}</Text>
            <Button
              as={Link}
              isExternal
              href={step.url}
              variant="outline"
              colorScheme="brand"
              rightIcon={<ExternalLinkIcon />}
              mt={2}
            >
              {step.label}
            </Button>
          </Box>
        ))}

        <Box>
          <Text>{nextStepLabel}</Text>
          <Button
            isLoading={loading}
            onClick={handleStartExam}
            variant="brand"
            mt={2}
          >
            开始评测&nbsp;&nbsp;&nbsp;✍️
          </Button>
        </Box>

        {state && (
          <Box>
            <Text>上次评测通过时间：</Text>
            <Text>
              <b>
                {state[examDateKey]
                  ? prettifyDate(state[examDateKey] as unknown as Date)
                  : "无"}
              </b>
            </Text>
          </Box>
        )}
      </VStack>
    </>
  );
}
