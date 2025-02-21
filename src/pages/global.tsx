import { VStack, FormControl, FormLabel, Input, Button } from '@chakra-ui/react';
import { toast } from 'react-toastify';
import PageBreadcrumb from 'components/PageBreadcrumb';
import { useState } from 'react';
import { DateColumn } from 'shared/DateColumn';
import { componentSpacing, maxTextWidth } from 'theme/metrics';
import trpc, { trpcNext } from 'trpc';
import moment from 'moment-timezone';

export default function Page() {
  const { data } = trpcNext.globalConfigs.get.useQuery();
  const [matchFeedbackEndsAt, setMatchFeedbackEndsAt] = useState<DateColumn>();
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!moment(matchFeedbackEndsAt).isValid()) {
      toast.error('初次交流反馈表结束时间格式错误');
      return;
    }

    setSaving(true);
    try {
      await trpc.globalConfigs.update.mutate({ 
        ...matchFeedbackEndsAt && {
          matchFeedbackEndsAt,
        },
      });
      toast.success('保存成功');
    } finally {
      setSaving(false);
    }
  };

  return (
    <VStack spacing={componentSpacing} width={maxTextWidth} align="start">
      <PageBreadcrumb current="全局配置" />

      <FormControl>
        <FormLabel>初次交流反馈表结束时间, 格式: 2022-02-02T01:01:01+08:00</FormLabel>
        <Input
          defaultValue={data?.matchFeedbackEndsAt}
          onChange={(e) => setMatchFeedbackEndsAt(e.target.value)}
        />
      </FormControl>

      <Button
        variant="brand"
        onClick={save}
        isLoading={saving}
      >
        保存
      </Button>
    </VStack>
  );
}
