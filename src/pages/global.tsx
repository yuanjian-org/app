import {
  VStack,
  FormControl,
  FormLabel,
  Input,
  Button,
  Checkbox,
  Textarea,
  Text,
  Heading,
  Code,
  Link,
} from "@chakra-ui/react";
import { toast } from "react-toastify";
import PageBreadcrumb from "components/PageBreadcrumb";
import { useState } from "react";
import { DateColumn } from "shared/DateColumn";
import { componentSpacing, maxTextWidth } from "theme/metrics";
import trpc, { trpcNext } from "trpc";
import moment from "moment-timezone";
import { useFeatures } from "components/useStaticConfigs";
import { whiteLabel } from "shared/WhiteLabel";
import { zFeatures, Features } from "shared/Features";

export default function Page() {
  const { data } = trpcNext.globalConfigs.get.useQuery();
  const [matchFeedbackEditableUntil, setMatchFeedbackEditableUntil] =
    useState<DateColumn>();
  const [showEditMessageTimeButton, setShowEditMessageTimeButton] = useState<
    boolean | undefined
  >(undefined);
  const [saving, setSaving] = useState(false);
  const features = useFeatures();

  const save = async () => {
    if (
      matchFeedbackEditableUntil &&
      !moment(matchFeedbackEditableUntil).isValid()
    ) {
      toast.error("初次交流反馈表截止时间格式错误");
      return;
    }

    setSaving(true);
    try {
      await trpc.globalConfigs.update.mutate({
        ...(matchFeedbackEditableUntil && {
          matchFeedbackEditableUntil,
        }),
        ...(showEditMessageTimeButton !== undefined && {
          showEditMessageTimeButton,
        }),
      });
      toast.success("保存成功");
    } finally {
      setSaving(false);
    }
  };

  return (
    <VStack spacing={componentSpacing} width={maxTextWidth} align="start">
      <PageBreadcrumb current="全局配置" />

      <FormControl>
        <FormLabel>
          初次交流反馈表截止时间，格式: 2022-02-02T01:01:01+08:00
        </FormLabel>
        <Input
          defaultValue={data?.matchFeedbackEditableUntil}
          onChange={(e) => setMatchFeedbackEditableUntil(e.target.value)}
        />
      </FormControl>

      <FormControl>
        <Checkbox
          defaultChecked={data?.showEditMessageTimeButton}
          onChange={(e) => setShowEditMessageTimeButton(e.target.checked)}
        >
          显示 &quot;编辑消息创建时间&quot; 按钮
        </Checkbox>
      </FormControl>

      <Button variant="brand" onClick={save} isLoading={saving}>
        保存
      </Button>

      <Heading size="md" mt={componentSpacing}>
        功能模块开关
      </Heading>
      <VStack align="start" spacing={2}>
        {Object.keys(zFeatures.shape).map((flag) => (
          <Text key={flag}>
            <Text as="span" fontFamily="monospace">
              {flag}
            </Text>
            ：
            {features[flag as keyof Features] ? (
              <Text as="span" color="green.500" fontWeight="bold">
                开启
              </Text>
            ) : (
              <Text as="span" color="gray.500">
                关闭
              </Text>
            )}
          </Text>
        ))}
      </VStack>
      <Text>
        <Link
          href="https://yuanjian.notion.site/37136363e90780319372ee9e580b20a3?pvs=74"
          isExternal
        >
          查看文档
        </Link>
      </Text>

      {whiteLabel == "xhef" && <UploadPearlStudentsForm />}
    </VStack>
  );
}

function UploadPearlStudentsForm() {
  const [csvData, setCsvData] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!csvData.trim()) {
      toast.error("请输入CSV数据");
      return;
    }

    setUploading(true);
    try {
      const result = await trpc.pearlStudents.upload.mutate({ csvData });
      toast.success(
        `成功处理 ${result.total} 条记录：更新 ${result.updated} 条，` +
          `新增 ${result.inserted} 条`,
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Heading size="md" mt={componentSpacing}>
        珍珠生数据上传
      </Heading>

      <Text>
        请将以下格式的珍珠生数据粘贴到下面的文本框中：
        <br />
        <br />
        <Code>姓名,珍珠生编号,身份证号最后四位</Code>
        <br />
        <br />• 身份证号最后四位可以为空
        <br />• 系统将更新现有记录或插入新记录（基于珍珠生编号）
      </Text>

      <FormControl>
        <Textarea
          value={csvData}
          onChange={(e) => setCsvData(e.target.value)}
          rows={10}
          bg="white"
        />
      </FormControl>

      <Button
        variant="brand"
        onClick={handleUpload}
        isLoading={uploading}
        isDisabled={!csvData.trim()}
      >
        上传珍珠生数据
      </Button>
    </>
  );
}
