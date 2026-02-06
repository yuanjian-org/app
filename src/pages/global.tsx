import {
  VStack,
  FormControl,
  FormLabel,
  Input,
  Button,
  Checkbox,
} from "@chakra-ui/react";
import { toast } from "react-toastify";
import PageBreadcrumb from "components/PageBreadcrumb";
import { useState } from "react";
import { DateColumn } from "shared/DateColumn";
import { componentSpacing, maxTextWidth } from "theme/metrics";
import trpc, { trpcNext } from "trpc";
import moment from "moment-timezone";

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
        保存
      </Button>
    </VStack>
  );
}
