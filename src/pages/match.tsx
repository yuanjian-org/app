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
  Alert, AlertDescription
} from '@chakra-ui/react';
import { SmallGrayText } from 'components/SmallGrayText';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { MatchSolution, CsvFormats } from 'shared/MatchSolution';
import { compareChinese, formatUserName } from 'shared/strings';
import { sectionSpacing } from 'theme/metrics';
import trpc from 'trpc';

export default function Page() {
  const [working, setWorking] = useState(false);
  const [documentId, setDocumentId] = useState('');
  const [rawSolution, setRawSolution] = useState<string>('');
  const [appliedSolution, setAppliedSolution] = useState<MatchSolution>();

  const [initialSolverInput, setInitialSolverInput] = useState<{
    capacities: CsvFormats;
    scores: CsvFormats;
  }>();
  const [finalSolverInput, setFinalSolverInput] = useState<{
    capacities: CsvFormats;
    scores: CsvFormats;
  }>();

  const exportSpreadsheet = async () => {
    setWorking(true);
    try {
      await trpc.match.exportSpreadsheet.mutate({ documentId });
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

  const generateFinalSolverInput = async () => {
    setWorking(true);
    try {
      setFinalSolverInput(await trpc.match.generateFinalSolverInput.query());
    } finally {
      setWorking(false);
    }
  };

  const applyInitialSolverOutput = async (dryrun: boolean) => {
    setWorking(true);
    try {
      const ret = await trpc.match.applyInitialSolverOutput.mutate({
        solution: rawSolution,
        dryrun,
      });
      setAppliedSolution(ret);
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
        onClick={exportSpreadsheet}
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
        把输出数据中格式为 ”mentee,mentor1,mentor2...“ 的部分拷贝如下
      </Text>

      <Textarea
        placeholder="输入算法输出"
        value={rawSolution}
        onChange={(e) => setRawSolution(e.target.value)}
      />

      <Button
        variant="brand"
        onClick={() => applyInitialSolverOutput(true)}
        isLoading={working}
        isDisabled={working || !rawSolution}
      >打印匹配结果</Button>

      {appliedSolution && (
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
              {appliedSolution
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
        isDisabled={working || !rawSolution || !appliedSolution}
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
        把输出数据中格式为 ”mentee,mentor1,mentor2...“ 的部分拷贝如下
      </Text>
      
      <StepHeading>J. 在工作表中对定配结果进行核对与手动微调</StepHeading>

      <StepHeading>K. 应用定配结果</StepHeading>

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
