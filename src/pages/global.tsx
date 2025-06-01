import { VStack, FormControl, FormLabel, Input, Button } from '@chakra-ui/react';
import { toast } from 'react-toastify';
import PageBreadcrumb from 'components/PageBreadcrumb';
import { useState } from 'react';
import { DateColumn } from 'shared/DateColumn';
import { componentSpacing, maxTextWidth } from 'theme/metrics';
import trpc, { trpcNext } from 'trpc';
import moment from 'moment-timezone';

type MeetingSlot = {
  id: number;
  tmUserId: string;
  meetingId: string;
  meetingLink: string;
  groupId: string | null;
  updatedAt: string;
};
export default function Page() {
  const { data } = trpcNext.globalConfigs.get.useQuery();
  const [matchFeedbackEditableUntil, setMatchFeedbackEditableUntil] =
    useState<DateColumn>();
  const [saving, setSaving] = useState(false);
  const meetingSlotQuery = trpcNext.meetingSlot.list.useQuery();
  const meetingSlot = meetingSlotQuery.data as MeetingSlot[] | undefined;
  const save = async () => {
    if (!moment(matchFeedbackEditableUntil).isValid()) {
      toast.error('初次交流反馈表截止时间格式错误');
      return;
    }

    setSaving(true);
    try {
      await trpc.globalConfigs.update.mutate({ 
        ...matchFeedbackEditableUntil && {
          matchFeedbackEditableUntil,
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
        <FormLabel>初次交流反馈表截止时间，格式: 2022-02-02T01:01:01+08:00</FormLabel>
        <Input
          defaultValue={data?.matchFeedbackEditableUntil}
          onChange={(e) => setMatchFeedbackEditableUntil(e.target.value)}
        />
      </FormControl>

      <Button
        variant="brand"
        onClick={save}
        isLoading={saving}
      >
        保存
      </Button>
      {meetingSlot?.map((slot) => (
        <div key={slot.id} style={{ border: '1px solid #ccc', padding: '10px', width: '100%', borderRadius: '4px' }}>
          <div><strong>tmUserId:</strong> {slot.tmUserId}</div>
          <div><strong>meetingId:</strong> {slot.meetingId}</div>
          <div>
            <strong>meetingLink:</strong>{' '}
            <a href={slot.meetingLink} target="_blank" rel="noopener noreferrer">
              {slot.meetingLink}
            </a>
          </div>
          <div><strong>groupId:</strong> {slot.groupId ?? '空闲'}</div>
          <div><strong>updatedAt:</strong> {moment(slot.updatedAt).format('YYYY-MM-DD HH:mm:ss')}</div>
        </div>
      ))}
    </VStack>
  );
}
