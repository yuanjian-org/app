import { Button, VStack, Text, OrderedList, ListItem, Input } from '@chakra-ui/react';
import PageBreadcrumb from 'components/PageBreadcrumb';
import { SmallGrayText } from 'components/SmallGrayText';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { sectionSpacing } from 'theme/metrics';
import trpc from 'trpc';

const title = "一对一匹配";

export default function Page() {
  const [working, setWorking] = useState(false);
  const [documentId, setDocumentId] = useState('');

  const exportInitialMatchData = async () => {
    setWorking(true);
    try {
      await trpc.match.exportInitialMatchData.mutate({ documentId });
      toast.success("导出成功");
    } finally {
      setWorking(false);
    }
  };

  return <>
    <PageBreadcrumb current={title} />

    <VStack align="start" spacing={sectionSpacing}>
      <Text>生成工作表的步骤：</Text>
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
        onClick={exportInitialMatchData}
        isLoading={working}
        isDisabled={working || !documentId}
      >生成一对一匹配工作表</Button>

      <SmallGrayText>
        如果学生数量比较多，导出时间会比较长。在此期间，可观察Spreadsheet的动态更新。
      </SmallGrayText>
    </VStack>
  </>;
}

Page.title = title;
