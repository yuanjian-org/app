import {
  VStack,
  FormControl,
  FormLabel,
  Input,
  Button,
  Checkbox,
  Text,
  Heading,
  Link,
} from "@chakra-ui/react";
import { toast } from "react-toastify";
import PageBreadcrumb from "components/PageBreadcrumb";
import { useState } from "react";
import { DateColumn } from "shared/DateColumn";
import { componentSpacing, maxTextWidth } from "theme/metrics";
import trpc, { trpcNext } from "trpc";
import moment from "moment-timezone";
import { features } from "shared/Features";
import { zFeatures, Features } from "shared/Features";
import T from "components/T";
import getI18nProps from "components/getI18nProps";

export default function Page() {
  const { data } = trpcNext.globalConfigs.get.useQuery();
  const [matchFeedbackEditableUntil, setMatchFeedbackEditableUntil] =
    useState<DateColumn>();
  const [showEditMessageTimeButton, setShowEditMessageTimeButton] = useState<
    boolean | undefined
  >(undefined);
  const [saving, setSaving] = useState(false);

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
        <T>保存</T>
      </Button>

      <Heading size="md" mt={componentSpacing}>
        <T>功能模块开关</T>
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
                <T>开启</T>
              </Text>
            ) : (
              <Text as="span" color="gray.500">
                <T>关闭</T>
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
          <T>查看功能模块文档</T>
        </Link>
      </Text>
    </VStack>
  );
}
export const getStaticProps = getI18nProps;
