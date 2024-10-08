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
} from '@chakra-ui/react';
import { Landmark, LandmarkAssessment, LandmarkScore } from 'shared/Map';
import React, { useState } from 'react';
import { componentSpacing } from 'theme/metrics';
import MarkdownSupport from './MarkdownSupport';
import { trpcNext } from 'trpc';
import { prettifyDate } from 'shared/strings';
import { useUserContext } from 'UserContext';
import { sidebarBreakpoint } from './Navbars';
import ModalWithBackdrop from './ModalWithBackdrop';
import { formatUserName } from 'shared/strings';

const desktopTextLimit = 60;
const mobileTextLimit = 20;

export default function LandmarkDrawer ({ onClose, landmark }: { 
  onClose: () => void; 
  landmark: Landmark
}) {          
  return <Drawer size="lg" isOpen onClose={onClose}>
    <DrawerOverlay />
    <DrawerContent>
      <DrawerCloseButton /> 
      <DrawerHeader>{landmark.名称}</DrawerHeader>
      <DrawerBody>
        <Flex flexDirection="column" gap={componentSpacing}>
          <LandmarkDefinition definition={landmark.定义} />
          <LandmarkAssessment landmark={landmark} />
          <LandmarkAssessmentHistory landmark={landmark}/>
        </Flex>
      </DrawerBody> 
    </DrawerContent>
  </Drawer>;
}

function LandmarkDefinition ({ definition }: { definition: string })  {
return <Text>{definition}</Text>;
}

function LandmarkAssessment ({ landmark }: {
landmark: Landmark;
}) {
const [score, setScore] = useState<LandmarkScore | undefined>();

return <>
  <Text>你认为你的{landmark.名称}处于以下哪个阶段？（单选）</Text>
  <RadioGroup onChange={value => setScore(Number(value))} 
    value={String(score)}>
    <Stack direction="column">
      {landmark.层级.map((level, index) => 
        <Radio key={index} value={String(index)}>{level}</Radio>
      )}
    </Stack>
  </RadioGroup>
  <Editor />
  <Button variant="brand" alignSelf="center">提交</Button> 
</>;
}

function Editor() {
const [markdown, setMarkdown] = useState<string>("");
return <>
  <Textarea value={markdown} onChange={e => setMarkdown(e.target.value)} 
  autoFocus />
  <Flex justifyContent="flex-end">
    <MarkdownSupport />
  </Flex>
</>;
}

function getAssessorName(assessment: LandmarkAssessment) {
  return assessment.assessor ? formatUserName(assessment.assessor.name) : "我";
}

function getAssessmentDate(assessment: LandmarkAssessment) {
  return assessment.createdAt && prettifyDate(assessment.createdAt);
}

function LandmarkAssessmentHistory({ landmark } : {
landmark: Landmark;
}) {  
const [user] = useUserContext();
const { data: assessments } = trpcNext.map.listLandmarkAssessment.useQuery({
  userId: user.id,
  landmark: landmark.名称,
});

const [selectedAssessment, setSelectedAssessment] 
  = useState<LandmarkAssessment>();

return <>
<Table whiteSpace="nowrap">
  <Thead>历史评估结果</Thead>
  <Tr>
    <Th>日期</Th>
    <Th>结果</Th>
    <Th>评估人</Th>
    <Th>详情</Th>
  </Tr>
  <Tbody>
    {assessments?.map((assessment, index) => (
      <Tr key={index} 
        onClick={() => setSelectedAssessment(assessment)} cursor="pointer">
        <Td>{getAssessmentDate(assessment)}</Td>
        <Td>{assessment.score}</Td>
        <Td>{getAssessorName(assessment)}</Td>
        <Td>
          <Text 
            isTruncated 
            maxWidth={{ 
              base: mobileTextLimit, 
              [sidebarBreakpoint]: desktopTextLimit 
            }}
          >
            {assessment.markdown}
          </Text>      
        </Td>
      </Tr>
    ))}
  </Tbody>
</Table>
{selectedAssessment && 
    <AssessmentModal 
      onClose={() => setSelectedAssessment(undefined)} 
      assessment={selectedAssessment} />}
</>;
}

function AssessmentModal ({ onClose, assessment }: { 
onClose: () => void; 
assessment: LandmarkAssessment
}) {          
return <ModalWithBackdrop isCentered isOpen onClose={onClose}>
<ModalContent>
  <ModalHeader>历史评估结果</ModalHeader>
  <ModalBody>
    <VStack gap={componentSpacing} align="left">
      <p><b>日期：</b>{getAssessmentDate(assessment)}</p>
      <p><b>结果：</b>{assessment.score}</p>
      <p><b>评估人：</b>{getAssessorName(assessment)}</p>
      <p><b>详情：</b>{assessment.markdown || "无"}</p>
    </VStack>
  </ModalBody>
  <ModalFooter>
    <Button onClick={onClose}>关闭</Button>
  </ModalFooter>
</ModalContent>
</ModalWithBackdrop>;
}
