import {
  Textarea,
  Button,
  VStack,
  OrderedList,
  ListItem,
  Input,
  Heading,
  Table,
  TableContainer,
  Text,
  Th,
  Tr,
  Thead,
  Tbody,
  Td,
  Link,
  AlertIcon,
  Alert, AlertDescription,
  UnorderedList
} from '@chakra-ui/react';
import { SmallGrayText } from 'components/SmallGrayText';
import { useState } from 'react';
import { toast } from 'react-toastify';
import {
  InitialMatchSolution,
  FinalMatchSolution,
  CsvFormats
} from 'shared/match';
import { compareChinese, formatUserName } from 'shared/strings';
import { sectionSpacing } from 'theme/metrics';
import trpc from 'trpc';

export default function Page() {
  const [working, setWorking] = useState(false);
  const [documentId, setDocumentId] = useState('');

  const [initialSolverInput, setInitialSolverInput] = useState<{
    capacities: CsvFormats;
    scores: CsvFormats;
  }>();
  const [initialSolverOutput, setInitialSolverOutput] = useState<string>('');
  const [initialSolution, setInitialSolution] = useState<InitialMatchSolution>();

  const [finalSolverInput, setFinalSolverInput] = useState<{
    capacities: CsvFormats;
    scores: CsvFormats;
  }>();
  const [finalSolverOutput, setFinalSolverOutput] = useState<string>('');
  const [finalSolution, setFinalSolution] = useState<FinalMatchSolution>();

  const exportInitialSpreadsheet = async () => {
    setWorking(true);
    try {
      await trpc.match.exportInitialSpreadsheet.mutate({ documentId });
      toast.success("导出成功");
    } finally {
      setWorking(false);
    }
  };

  const generateInitialSolverInput = async () => {
    setWorking(true);
    try {
      setInitialSolverInput(
        await trpc.match.generateInitialSolverInput.query({ documentId }));
    } finally {
      setWorking(false);
    }
  };

  const applyInitialSolverOutput = async (dryrun: boolean) => {
    setWorking(true);
    try {
      const ret = await trpc.match.applyInitialSolverOutput.mutate({
        output: initialSolverOutput,
        dryrun,
      });
      setInitialSolution(ret);
    } finally {
      setWorking(false);
    }
  };

  const generateFinalSolverInput = async () => {
    setWorking(true);
    try {
      setFinalSolverInput(await trpc.match.generateFinalSolverInput.query());
    } finally {
      setWorking(false);
    }
  };

  const exportFinalSpreadsheet = async () => {
    setWorking(true);
    try {
      await trpc.match.exportFinalSpreadsheet.mutate({
        documentId,
        finalSolverOutput,
      });
      toast.success("导出成功");
    } finally {
      setWorking(false);
    }
  };

  const applyFinalSolution = async (dryrun: boolean) => {
    setWorking(true);
    try {
      const ret = await trpc.match.applyFinalSolution.mutate({
        documentId,
        dryrun,
      });
      setFinalSolution(ret.sort((a, b) =>
        compareChinese(a.mentor.name, b.mentor.name)));
    } finally {
      setWorking(false);
    }
  };

  return <>
    <VStack align="start" spacing={sectionSpacing}>
      <Text>
        请根据《师生匹配流程》文档使用本页面的功能。
      </Text>

      <StepHeading>A. 导出匹配工作表</StepHeading>

      <OrderedList>
        <ListItem>
          结束所有需要换导师的学生的一对一导师关系。
        </ListItem>
        <ListItem>
          新建一个Google Spreadsheet，命名为“X届一对一匹配工作表”。
        </ListItem>
        <ListItem>
          把后台环境变量 GOOGLE_SHEETS_CLIENT_EMAIL 的值设置为该文档的编辑者，例如
          &quot;role1@project1.iam.gserviceaccount.com&quot;。
        </ListItem>
        <ListItem>
          把该文档URL中的文档ID复制到下面的输入框中：
        </ListItem>
      </OrderedList>

      <Input
        placeholder="输入Google Spreadsheet 的文档ID"
        value={documentId}
        onChange={(e) => setDocumentId(e.target.value)}
      />

      <Button
        variant="brand"
        onClick={exportInitialSpreadsheet}
        isLoading={working}
        isDisabled={working || !documentId}
      >导出工作表</Button>

      <SmallGrayText>
        如果学生数量比较多，导出时间会比较长。在此期间，可观察工作表文件的动态更新。
      </SmallGrayText>

      <StepHeading>B. 在工作表中打分</StepHeading>

      <Text>
        根据工作表中的说明打分。多位匹配负责人可按评分维度分工，并行完成工作。
      </Text>

      <StepHeading>C. 生成初配求解算法输入</StepHeading>

      <Button
        variant="brand"
        onClick={generateInitialSolverInput}
        isLoading={working}
        isDisabled={working || !documentId}
      >生成CSV文件</Button>

      <SmallGrayText>
        如果学生数量比较多，生成时间会比较长。请耐心等待。
      </SmallGrayText>

      <CapacityAndScoreTable
        capacitiesCsv={initialSolverInput?.capacities}
        scoresCsv={initialSolverInput?.scores}
      />

      <StepHeading>D. 运行初配求解算法</StepHeading>

      <OrderedList>
        <ListItem>
          把两个CSV文件上传到下面的求解算法页面。
        </ListItem>
        <ListItem>
          把求解算法代码中的 INIITIAL_MATCH 的值设成 True。
        </ListItem>
        <ListItem>
          运行求解算法。
        </ListItem>
      </OrderedList>

      <SolverButton />

      <StepHeading>E. 核对初配结果</StepHeading>

      <Text>
        把上一步输出中 ”Mentee,Mentor...  (machine friendly)“ 一节的内容拷贝如下：
      </Text>

      <Textarea
        placeholder="输入算法输出"
        value={initialSolverOutput}
        onChange={(e) => setInitialSolverOutput(e.target.value)}
      />

      <Button
        variant="brand"
        onClick={() => applyInitialSolverOutput(true)}
        isLoading={working}
        isDisabled={working || !initialSolverOutput}
      >打印初配结果</Button>

      {initialSolution && (
        <TableContainer>
          <Table>
            <Thead>
              <Tr>
                <Th>联络人</Th>
                <Th>生源</Th>
                <Th>学生</Th>
                <Th>匹配的导师 ∩ 学生选择的导师</Th>
                <Th>匹配的导师 - 学生选择的导师</Th>
                <Th>学生选择的导师 - 匹配的导师</Th>
              </Tr>
            </Thead>
            <Tbody>
              {initialSolution
              .sort((a, b) => {
                const comp = compareChinese(a.pointOfContact?.name ?? "",
                  b.pointOfContact?.name ?? "");
                if (comp !== 0) return comp;
                return compareChinese(a.source ?? "", b.source ?? "");
              }).map(({
                pointOfContact,
                source,
                mentee,
                preferredMentors,
                nonPreferredMentors,
                excludedPreferredMentors,
              }) => (
                <Tr key={mentee.id}>
                  <Td>{pointOfContact ? formatUserName(pointOfContact.name) : "-"}</Td>
                  <Td>{source ?? "-"}</Td>
                  <Td>{formatUserName(mentee.name)}</Td>
                  <Td>{preferredMentors.map(m => formatUserName(m.name)).join(", ")}</Td>
                  <Td>{nonPreferredMentors.map(m => formatUserName(m.name)).join(", ")}</Td>
                  <Td><s>
                    {excludedPreferredMentors.map(m => formatUserName(m.name)).join(", ")}
                  </s></Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}

      <StepHeading>F. 应用初配结果</StepHeading>

      <Text>
        系统会自动创建相应的不定期导师关系（或重启已有的不定期导师关系）以及交流反馈表。
      </Text>

      <Alert status="warning" mb={4}>
        <AlertIcon />
        <AlertDescription>
          多次应用匹配结果会生成重复的反馈表。用户只能在最新的反馈表中输入数据，之前的反馈表{
          }自动变成只读。如不慎生成了多余数据，请手动删除 MatchFeedback 数据表的内容。
        </AlertDescription>
      </Alert>

      <Button
        colorScheme="red"
        onClick={() => applyInitialSolverOutput(false)}
        isLoading={working}
        isDisabled={working || !initialSolverOutput || !initialSolution}
      >应用初配结果</Button>

      <StepHeading>师生初次沟通</StepHeading>

      <Text>具体步骤见《师生匹配流程》文档。</Text>

      <StepHeading>G. 生成定配求解算法输入</StepHeading>

      <Button
        variant="brand"
        onClick={generateFinalSolverInput}
        isLoading={working}
        isDisabled={working}
      >生成CSV文件</Button>

      <CapacityAndScoreTable
        capacitiesCsv={finalSolverInput?.capacities}
        scoresCsv={finalSolverInput?.scores}
      />

      <StepHeading>H. 运行定配求解算法</StepHeading>

      <OrderedList>
        <ListItem>
          把两个CSV文件上传到下面的求解算法页面。
        </ListItem>
        <ListItem>
          把求解算法代码中的 INIITIAL_MATCH 的值设成 False。
        </ListItem>
        <ListItem>
          运行求解算法。
        </ListItem>
      </OrderedList>

      <SolverButton />

      <StepHeading>I. 把定配结果导出到工作表</StepHeading>

      <Text>
        把上一步输出中 ”Mentee,Mentor...  (machine friendly)“ 一节的内容拷贝如下：
      </Text>

      <Textarea
        placeholder="输入算法输出"
        value={finalSolverOutput}
        onChange={(e) => setFinalSolverOutput(e.target.value)}
      />

      <Button
        variant="brand"
        onClick={exportFinalSpreadsheet}
        isLoading={working}
        isDisabled={working || !documentId || !finalSolverOutput}
      >导出工作表</Button>

      <StepHeading>J. 核对工作表中【定配】页的数据并手动微调</StepHeading>

      <Text>
        单元格中的数字是匹配分数，数字越大，匹配度越高。计算方法如下，具体设计依据请参见
        <code>computeFinalMatchScore</code>函数的注释。
      </Text>
      <UnorderedList>
        <ListItem>
          如果导师选择 “希望避免” 或者学生选择 1，则设分数为 -10 并停止计算。
        </ListItem>
        <ListItem>
          设分数为学生选择的数值，范围是2到5。          
        </ListItem>
        <ListItem>
          如果导师选择 “特别喜欢”，则加 10 分。
        </ListItem>
      </UnorderedList>

      <Text>
        单元格中的 “M” 是机器自动求解的结果。如需手动微调，请用 “m” 表示匹配，并删除 “M”。
      </Text>

      <StepHeading>K. 核对定配结果</StepHeading>
      
      <Button
        variant="brand"
        onClick={() => applyFinalSolution(true)}
        isLoading={working}
        isDisabled={working || !documentId}
      >打印定配结果</Button>

      {finalSolution && <>
        <Text>
          将以下导师列表拷贝到发给导师群的消息模板：
        </Text>
        
        <Text>
          {finalSolution.map(({ mentor }) => formatUserName(mentor.name))
            .join("、")}
        </Text>

        <TableContainer>
          <Table>
            <Thead>
              <Tr>
                <Th>导师</Th>
                <Th>学生</Th>
              </Tr>
            </Thead>
            <Tbody>
              {finalSolution.map(({ mentor, mentees }) => (
                <Tr key={mentor.id}>
                  <Td>{formatUserName(mentor.name)}</Td>
                  <Td>{mentees.map(m => formatUserName(m.name)).join(", ")}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      </>}

      <StepHeading>L. 应用定配结果</StepHeading>

      <Text>
        系统会自动创建或更新相应的一对一导师关系。
      </Text>

      <Button
        colorScheme="red"
        onClick={() => applyFinalSolution(false)}
        isLoading={working}
        isDisabled={working || !finalSolution}
      >应用定配结果</Button>

    </VStack>
  </>;
}

Page.title = "一对一匹配";

function StepHeading({ children }: { children: React.ReactNode }) {
  return <Heading size="md" mt={sectionSpacing}>{children}</Heading>;
}

function SolverButton() {
  return <Button
    variant="brand"
    as={Link}
    href="https://colab.research.google.com/github/yuanjian-org/app/blob/main/tools/match.ipynb"
    isExternal
  >打开求解算法页面</Button>;
}

function CapacityAndScoreTable({ capacitiesCsv, scoresCsv }: {
  capacitiesCsv: CsvFormats | undefined;
  scoresCsv: CsvFormats | undefined;
}) {
  return <TableContainer>
    <Table>
      <Thead>
        <Tr>
          <Th>mentor_capacities_with_dummy.csv</Th>
          <Th>matching_scores_with_dummy.csv</Th>
        </Tr>
      </Thead>
      <Tbody>
        <Tr>
          <Td verticalAlign="top">
            {capacitiesCsv ? <pre>{capacitiesCsv.ids}</pre> : "待生成"}
          </Td>
          <Td verticalAlign="top">
            {scoresCsv ? <pre>{scoresCsv.ids}</pre> : "待生成"}
          </Td>
        </Tr>
        <Tr>
          <Td verticalAlign="top">
            <Text>以下数据仅用于人工核对，请勿用做求解算法的输入：</Text>
          </Td>
          <Td verticalAlign="top">
            <Text>以下数据仅用于人工核对，请勿用做求解算法的输入：</Text>
          </Td>
        </Tr>
        <Tr>
          <Td verticalAlign="top">
            {capacitiesCsv ? <pre>{capacitiesCsv.names}</pre> : "待生成"}
          </Td>
          <Td verticalAlign="top">
            {scoresCsv ? <pre>{scoresCsv.names}</pre> : "待生成"}
          </Td>
        </Tr>
      </Tbody>
    </Table>
  </TableContainer>;
}
