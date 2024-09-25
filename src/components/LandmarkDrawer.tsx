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
    Link,
    Textarea,
    HStack,
    Icon,
  } from '@chakra-ui/react';
import { Landmark, LandmarkScore } from 'shared/Map';
import React, { useState } from 'react';
import { componentSpacing } from 'theme/metrics';
import { ExternalLinkIcon } from '@chakra-ui/icons';

export default function LandmarkDrawer ({ onClose, landmark }: { 
    onClose: () => void; 
    landmark: Landmark
  }) {      
    const [value, setValue] = useState<LandmarkScore | undefined>();
    
    return <Drawer size="lg" isOpen onClose={onClose}>
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton /> 
        <DrawerHeader>{landmark.名称}</DrawerHeader>
        <DrawerBody>
          <Flex flexDirection="column" gap={componentSpacing}>
            <LandmarkDefinition definition={landmark.定义} />
            <LanmarkAssessment 
              landmark={landmark} 
              value={value} 
              setValue={setValue}
            />
            <LandmarkHistoryTable />
          </Flex>
        </DrawerBody> 
      </DrawerContent>
    </Drawer>;
  }

function LandmarkDefinition ({ definition }: { definition: string })  {
  return <Text>{definition}</Text>;
}

function LanmarkAssessment ({ landmark, value, setValue }: {
  landmark: Landmark;
  value: LandmarkScore | undefined;
  setValue: (value: LandmarkScore) => void;
}) {
  return <>
    <Text>你认为你的{landmark.名称}处于以下哪个阶段？（单选）</Text>
    <RadioGroup onChange={value => setValue(Number(value))} value={String(value)}>
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
      autoFocus background="white" height={200} 
    />
    <Flex justifyContent="flex-end">
      <MarkdownSupport />
    </Flex>
  </>;
}

function MarkdownSupport() {
  return <Link target="_blank" 
    href="https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax" 
    >
    <HStack>
      <Text>支持 Markdown 格式</Text><Icon as={ExternalLinkIcon} />
    </HStack>
  </Link>;
}

function LandmarkHistoryTable() {
  return <Table>
    <Thead>历史评估结果</Thead>
    <Tr>
      <Th>日期</Th>
      <Th>结果</Th>
      <Th>评估人</Th>
      <Th>详情</Th>
    </Tr>
    <Tbody> 
    <Tr>
      <Td>fake date</Td>
      <Td>fake score</Td>  
      <Td>fake accessor</Td>        
      <Td><Link href="#">fake url</Link></Td>      
    </Tr>   
    </Tbody>
  </Table>;
}
