import {
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Radio,
  RadioGroup,
  Stack,
  Text,
  Button,
  Flex,
  Table,
  Tbody,
  Tr,
  Th,
  Td,
  Thead,
  Textarea,
  ModalBody,
  ModalHeader,
  ModalContent,
  VStack,
  ModalFooter,
} from "@chakra-ui/react";
import { Landmark, LandmarkAssessment, LandmarkScore } from "shared/Map";
import { useState } from "react";
import { componentSpacing } from "theme/metrics";
import MarkdownSupport from "./MarkdownSupport";
import trpc, { trpcNext } from "trpc";
import { prettifyDate } from "shared/strings/prettifyDate";
import { breakpoint } from "theme/breakpoints";
import ModalWithBackdrop from "./ModalWithBackdrop";
import { formatUserName } from "shared/strings/formatUserName";
import invariant from "tiny-invariant";
import { compareDate } from "shared/strings/compareDate";
import Loader from "./Loader";
import { useMyId } from "useMe";
import T from "components/T";

const desktopTextLimit = 60;
const mobileTextLimit = 20;

export default function LandmarkDrawer({
  onClose,
  landmark,
}: {
  onClose: () => void;
  landmark: Landmark;
}) {
  return (
    <Drawer size="lg" isOpen onClose={onClose}>
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>{landmark.名称}</DrawerHeader>
        <DrawerBody>
          <Flex flexDirection="column" gap={componentSpacing}>
            <LandmarkDefinition definition={landmark.定义} />
            <LandmarkAssessmentSelect landmark={landmark} />
            <LandmarkAssessmentHistory landmark={landmark} />
          </Flex>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

function LandmarkDefinition({ definition }: { definition: string }) {
  return <Text>{definition}</Text>;
}

function LandmarkAssessmentSelect({ landmark }: { landmark: Landmark }) {
  const myId = useMyId();
  const [score, setScore] = useState<LandmarkScore | undefined>();
  const [markdown, setMarkdown] = useState<string>("");
  const createLandmarkAssessment = async () => {
    invariant(score !== undefined);
    await trpc.map.createLandmarkAssessment.mutate({
      userId: myId,
      landmark: landmark.名称,
      score,
      markdown,
    });
  };
  return (
    <>
      <Text>
        <T>你认为你的</T>
        {landmark.名称}
        <T>处于以下哪个阶段？（单选）</T>
      </Text>
      <RadioGroup
        onChange={(value) => setScore(Number(value))}
        value={String(score)}
      >
        <Stack direction="column">
          {landmark.层级.map((level, index) => (
            <Radio key={index} value={String(index + 1)}>
              {level}
            </Radio>
          ))}
        </Stack>
      </RadioGroup>
      <Editor markdown={markdown} setMarkdown={setMarkdown} />
      <Button
        onClick={createLandmarkAssessment}
        variant="brand"
        alignSelf="center"
      >
        <T>提交</T>
      </Button>
    </>
  );
}

function Editor({
  markdown,
  setMarkdown,
}: {
  markdown: string;
  setMarkdown: (value: string) => void;
}) {
  return (
    <>
      <Textarea
        value={markdown}
        onChange={(e) => setMarkdown(e.target.value)}
        autoFocus
      />
      <Flex justifyContent="flex-end">
        <MarkdownSupport />
      </Flex>
    </>
  );
}

function getAssessorName(assessment: LandmarkAssessment) {
  return assessment.assessor ? formatUserName(assessment.assessor.name) : "我";
}

function getAssessmentDate(assessment: LandmarkAssessment) {
  return assessment.createdAt && prettifyDate(assessment.createdAt);
}

function LandmarkAssessmentHistory({ landmark }: { landmark: Landmark }) {
  const { data: assessments } = trpcNext.map.listLandmarkAssessments.useQuery({
    userId: useMyId(),
    landmark: landmark.名称,
  });

  const [selectedAssessment, setSelectedAssessment] =
    useState<LandmarkAssessment>();
  return (
    <>
      <Table whiteSpace="nowrap">
        <Thead>
          <T>历史评估结果</T>
        </Thead>
        <Tr>
          <Th>
            <T>日期</T>
          </Th>
          <Th>
            <T>结果</T>
          </Th>
          <Th>
            <T>评估人</T>
          </Th>
          <Th>
            <T>详情</T>
          </Th>
        </Tr>
        <Tbody>
          {!assessments ? (
            <Loader />
          ) : (
            assessments
              .sort((a, b) => compareDate(b.createdAt, a.createdAt))
              .map((assessment, index) => (
                <Tr
                  key={index}
                  onClick={() => setSelectedAssessment(assessment)}
                  cursor="pointer"
                >
                  <Td>{getAssessmentDate(assessment)}</Td>
                  <Td>{assessment.score}</Td>
                  <Td>{getAssessorName(assessment)}</Td>
                  <Td>
                    <Text
                      isTruncated
                      maxWidth={{
                        base: mobileTextLimit,
                        [breakpoint]: desktopTextLimit,
                      }}
                    >
                      {assessment.markdown}
                    </Text>
                  </Td>
                </Tr>
              ))
          )}
        </Tbody>
      </Table>

      {selectedAssessment && (
        <AssessmentModal
          onClose={() => setSelectedAssessment(undefined)}
          assessment={selectedAssessment}
        />
      )}
    </>
  );
}

function AssessmentModal({
  onClose,
  assessment,
}: {
  onClose: () => void;
  assessment: LandmarkAssessment;
}) {
  return (
    <ModalWithBackdrop isCentered isOpen onClose={onClose}>
      <ModalContent>
        <ModalHeader>
          <T>历史评估结果</T>
        </ModalHeader>
        <ModalBody>
          <VStack gap={componentSpacing} align="left">
            <p>
              <b>
                <T>日期：</T>
              </b>
              {getAssessmentDate(assessment)}
            </p>
            <p>
              <b>
                <T>结果：</T>
              </b>
              {assessment.score}
            </p>
            <p>
              <b>
                <T>评估人：</T>
              </b>
              {getAssessorName(assessment)}
            </p>
            <p>
              <b>
                <T>详情：</T>
              </b>
              {assessment.markdown || "无"}
            </p>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>
            <T>关闭</T>
          </Button>
        </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>
  );
}
