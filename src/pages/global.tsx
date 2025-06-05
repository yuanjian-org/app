import { VStack, FormControl, FormLabel, Input, Button, Box, IconButton } from '@chakra-ui/react';
import { EditIcon, CheckIcon, CloseIcon } from '@chakra-ui/icons';
import { toast } from 'react-toastify';
import PageBreadcrumb from 'components/PageBreadcrumb';
import { useState } from 'react';
import { DateColumn } from 'shared/DateColumn';
import { MeetingSlot } from 'shared/MeetingSlot';
import { componentSpacing, maxTextWidth } from 'theme/metrics';
import trpc, { trpcNext } from 'trpc';
import moment from 'moment-timezone';

function MatchFeedbackEditableUntilComponent() {
  const { data } = trpcNext.globalConfigs.get.useQuery();
  const [matchFeedbackEditableUntil, setMatchFeedbackEditableUntil] =
    useState<DateColumn>();
  const [saving, setSaving] = useState(false);

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
    <>
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
    </>
  );
}

function MeetingSlotsComponent() {
  const meetingSlotQuery = trpcNext.meetings.listMeetingSlots.useQuery();
  const meetingSlots = meetingSlotQuery.data as MeetingSlot[] | undefined;
  
  // State for inline editing
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{
    meetingId: string;
    meetingLink: string;
  }>({ meetingId: '', meetingLink: '' });
  const [updatingSlot, setUpdatingSlot] = useState(false);

  const updateMeetingSlotMutation = trpcNext.meetings.updateMeetingSlot.useMutation({
    onSuccess: () => {
      toast.success('会议信息更新成功');
      void meetingSlotQuery.refetch();
      setEditingSlot(null);
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
    onSettled: () => {
      setUpdatingSlot(false);
    }
  });

  const startEditing = (slot: MeetingSlot) => {
    setEditingSlot(slot.id);
    setEditValues({
      meetingId: slot.meetingId,
      meetingLink: slot.meetingLink
    });
  };

  const cancelEditing = () => {
    setEditingSlot(null);
    setEditValues({ meetingId: '', meetingLink: '' });
  };

  const saveSlotChanges = async () => {
    if (!editingSlot) return;
    
    // Basic validation
    if (!editValues.meetingId.trim()) {
      toast.error('会议ID不能为空');
      return;
    }
    
    if (!editValues.meetingLink.trim()) {
      toast.error('会议链接不能为空');
      return;
    }

    // Basic URL validation
    try {
      new URL(editValues.meetingLink);
    } catch {
      toast.error('会议链接格式不正确');
      return;
    }

    setUpdatingSlot(true);
    try {
      await updateMeetingSlotMutation.mutateAsync({
        id: editingSlot,
        meetingId: editValues.meetingId,
        meetingLink: editValues.meetingLink
      });
    } catch (error) {
      console.error('Failed to update meeting slot:', error);
    }
  };

  return (
    <>
      {meetingSlots?.map((slot) => (
        <Box key={slot.id} border="1px solid #ccc" padding="10px" width="100%" borderRadius="4px">
          <div><strong>tmUserId:</strong> {slot.tmUserId}</div>
          
          {/* Editable meetingId */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <strong>meetingId:</strong>
            {editingSlot === slot.id ? (
              <Input
                size="sm"
                value={editValues.meetingId}
                onChange={(e) => setEditValues(prev => ({ ...prev, meetingId: e.target.value }))}
                width="200px"
              />
            ) : (
              <span onClick={() => startEditing(slot)} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                {slot.meetingId}
              </span>
            )}
          </div>

          {/* Editable meetingLink */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <strong>meetingLink:</strong>
            {editingSlot === slot.id ? (
              <Input
                size="sm"
                value={editValues.meetingLink}
                onChange={(e) => setEditValues(prev => ({ ...prev, meetingLink: e.target.value }))}
                width="300px"
              />
            ) : (
              <a 
                href={slot.meetingLink} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.preventDefault();
                  startEditing(slot);
                }}
                style={{ cursor: 'pointer', textDecoration: 'underline' }}
              >
                {slot.meetingLink}
              </a>
            )}
          </div>

          <div><strong>groupId:</strong> {slot.groupId ?? '空闲'}</div>
          
          {/* Edit controls */}
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
            {editingSlot === slot.id ? (
              <>
                <IconButton
                  aria-label="保存"
                  icon={<CheckIcon />}
                  size="sm"
                  colorScheme="green"
                  onClick={saveSlotChanges}
                  isLoading={updatingSlot}
                />
                <IconButton
                  aria-label="取消"
                  icon={<CloseIcon />}
                  size="sm"
                  colorScheme="red"
                  onClick={cancelEditing}
                  isDisabled={updatingSlot}
                />
              </>
            ) : (
              <IconButton
                aria-label="编辑"
                icon={<EditIcon />}
                size="sm"
                onClick={() => startEditing(slot)}
              />
            )}
          </div>
        </Box>
      ))}
    </>
  );
}

export default function Page() {
  return (
    <VStack spacing={componentSpacing} width={maxTextWidth} align="start">
      <PageBreadcrumb current="全局配置" />
      
      <MatchFeedbackEditableUntilComponent />
      
      <MeetingSlotsComponent />
    </VStack>
  );
}
