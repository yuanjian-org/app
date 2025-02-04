import {
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
  Link
} from '@chakra-ui/react';
import { SmallGrayText } from 'components/SmallGrayText';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { sectionSpacing } from 'theme/metrics';
import trpc from 'trpc';

export default function Page() {
  const [working, setWorking] = useState(false);
  const [documentId, setDocumentId] = useState('');
  const [capacitiesCsv, setCapacitiesCsv] = useState<{ ids: string; names: string }>();
  const [scoresCsv, setScoresCsv] = useState<{ ids: string; names: string }>();


  const exportSpreadsheet = async () => {
    setWorking(true);
    try {
      await trpc.match.exportSpreadsheet.mutate({ documentId });
      toast.success("导出成功");
    } finally {
      setWorking(false);
    }
  };

  const generateCSVs = async () => {
    setWorking(true);
    try {
      const ret = await trpc.match.generateCSVs.mutate({ documentId });
      setCapacitiesCsv(ret.capacities);
      setScoresCsv(ret.scores);
    } finally {
      setWorking(false);
    }
  };

  return <>
    <VStack align="start" spacing={sectionSpacing}>
      <Heading size="md">第一步，导出匹配工作表</Heading>

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

      <Heading size="md" mt={sectionSpacing}>第二步，在工作表中打分</Heading>

      <Text>
        多位匹配负责人可按评分维度分工，并行完成工作。
      </Text>

      <Heading size="md" mt={sectionSpacing}>第三步，生成CSV文件</Heading>

      <Button
        variant="brand"
        onClick={generateCSVs}
        isLoading={working}
        isDisabled={working || !documentId}
      >生成CSV文件</Button>

      <SmallGrayText>
        如果学生数量比较多，生成时间会比较长。请耐心等待。
      </SmallGrayText>

      <TableContainer>
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
      </TableContainer>


      <Heading size="md" mt={sectionSpacing}>第四步，运行自动求解算法</Heading>

      <Text>
        把两个CSV文件上传到下面的求解算法页面，并运行。
      </Text>

      <Button
        variant="brand"
        as={Link}
        href="https://colab.research.google.com/github/yuanjian-org/app/blob/main/tools/match.ipynb"
        isExternal
      >打开求解算法页面</Button>

    </VStack>
  </>;
}

Page.title = "一对一匹配";
