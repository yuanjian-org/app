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
    Modal,
    ModalBody,
    ModalHeader,
    ModalCloseButton,
    ModalContent,
    ModalOverlay,
    useBreakpointValue,
  } from '@chakra-ui/react';
import { Landmark, LandmarkAssessment, LandmarkScore } from 'shared/Map';
import React, { useState } from 'react';
import { componentSpacing } from 'theme/metrics';
import MarkdownSupport from './MarkdownSupport';
import { trpcNext } from 'trpc';
import { prettifyDate } from 'shared/strings';
import { useUserContext } from 'UserContext';
import { sidebarBreakpoint } from './Navbars';

const desktopTextLimit = 30;
const mobileTextLimit = 8;

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
    <RadioGroup onChange={value => setScore(Number(value))} value={String(score)}>
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

function LandmarkAssessmentHistory({ landmark } : {
  landmark: Landmark;
}) {  
  const [user] = useUserContext();
  const { data: assessments } = trpcNext.map.listLandmarkAssessment.useQuery({
    userId: user.id,
    landmark: landmark.名称,
  });

  const [selectedAssessment, setSelectedAssessment] = useState<LandmarkAssessment>();
  const handleSelectAssessment = (assessment: {
    createdAt: string;
    score: number;
    markdown: string | null;
  }) => {
    const newAssessment: LandmarkAssessment = {
      ...assessment,
      createdAt: new Date(assessment.createdAt) 
    };
    setSelectedAssessment(newAssessment);
  };

  const maxChar = useBreakpointValue({ base: mobileTextLimit, 
    [sidebarBreakpoint]: desktopTextLimit }) || desktopTextLimit;

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
        <Tr key={index} onClick={() => handleSelectAssessment(assessment)} cursor="pointer">
          <Td>{prettifyDate(assessment.createdAt)}</Td>
          <Td>{assessment.score}</Td>
          <Td>假评估人</Td>
          <Td>
            <Text>
              {assessment.markdown && assessment?.markdown.length > maxChar 
              ? `${assessment.markdown.substring(0, maxChar)}...`
              : assessment.markdown}
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
  return <Modal isCentered isOpen onClose={onClose}>
  <ModalOverlay />
  <ModalContent>
    <ModalCloseButton /> 
    <ModalHeader>历史评估结果</ModalHeader>
    <ModalBody>
      <Flex direction="column" gap={componentSpacing} padding={componentSpacing}>
        <Text fontWeight="bold">日期：
          <span style={{ fontWeight: "normal" }}>
            {prettifyDate(assessment.createdAt)}
          </span>
        </Text>
        <Text fontWeight="bold">结果：
          <span style={{ fontWeight: "normal" }}>{assessment.score}</span>
        </Text>
        <Text fontWeight="bold">评估人：
          <span style={{ fontWeight: "normal" }}>假评估人</span>
        </Text>
        <Text fontWeight="bold">详情：
          <span style={{ fontWeight: "normal" }}>
            {assessment.markdown || "无"}
          </span>
        </Text>
      </Flex>
    </ModalBody> 
  </ModalContent>
</Modal>;
}
