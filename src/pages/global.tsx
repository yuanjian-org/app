import {
  VStack,
  FormControl,
  FormLabel,
  Input,
  Button,
  Box,
  IconButton
} from '@chakra-ui/react';
import { EditIcon, CheckIcon, CloseIcon, AddIcon } from '@chakra-ui/icons';
import { toast } from 'react-toastify';
import PageBreadcrumb from 'components/PageBreadcrumb';
import { useState } from 'react';
import { DateColumn } from 'shared/DateColumn';
import { MeetingSlot } from 'shared/MeetingSlot';
import { componentSpacing, maxTextWidth } from 'theme/metrics';
import trpc, { trpcNext } from 'trpc';
import moment from 'moment-timezone';

function MatchFeedbackEditableUntil() {
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

function MeetingSlots() {
  const meetingSlotQuery = trpcNext.meetings.listMeetingSlots.useQuery();
  const meetingSlots = meetingSlotQuery.data as MeetingSlot[] | undefined;

  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [editValues, setEditValues] = useState({
    meetingId: '',
    meetingLink: ''
  });
  const [creatingNew, setCreatingNew] = useState(false);
  const [createValues, setCreateValues] = useState({
    tmUserId: '',
    meetingId: '',
    meetingLink: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const updateMeetingSlotMutation = trpcNext.meetings.updateMeetingSlot.useMutation({
    onSuccess: () => {
      toast.success('会议信息更新成功');
      void meetingSlotQuery.refetch();
      setEditingSlot(null);
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
    onSettled: () => setIsSaving(false)
  });

  const createMeetingSlotMutation = trpcNext.meetings.createMeetingSlot.useMutation({
    onSuccess: () => {
      toast.success('会议位置创建成功');
      void meetingSlotQuery.refetch();
      setCreatingNew(false);
      setCreateValues({ tmUserId: '', meetingId: '', meetingLink: '' });
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
    onSettled: () => setIsSaving(false)
  });

  const startEditing = (slot: MeetingSlot) => {
    setEditingSlot(slot.id);
    setEditValues({ meetingId: slot.meetingId, meetingLink: slot.meetingLink });
  };

  const cancelEditing = () => {
    setEditingSlot(null);
    setEditValues({ meetingId: '', meetingLink: '' });
  };

  const startCreating = () => {
    setCreatingNew(true);
    setCreateValues({ tmUserId: '', meetingId: '', meetingLink: '' });
  };

  const cancelCreating = () => {
    setCreatingNew(false);
    setCreateValues({ tmUserId: '', meetingId: '', meetingLink: '' });
  };

  const saveSlotChanges = async () => {
    if (!editingSlot) return;

    setIsSaving(true);
    await updateMeetingSlotMutation.mutateAsync({
      id: editingSlot,
      meetingId: editValues.meetingId,
      meetingLink: editValues.meetingLink
    });
  };

  const saveNewSlot = async () => {
    setIsSaving(true);
    await createMeetingSlotMutation.mutateAsync(createValues);
  };

  return (
    <>
      {/* Create new slot */}
      {creatingNew && (
        <Box border="1px solid #ccc" padding="10px" borderRadius="4px" backgroundColor="#f8f9fa">
          <div><strong>创建新会议位置</strong></div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <strong>tmUserId:</strong>
            <Input
              size="sm"
              value={createValues.tmUserId}
              onChange={(e) => setCreateValues(prev => ({ ...prev, tmUserId: e.target.value }))}
              width="200px"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <strong>meetingId:</strong>
            <Input
              size="sm"
              value={createValues.meetingId}
              onChange={(e) => setCreateValues(prev => ({ ...prev, meetingId: e.target.value }))}
              width="200px"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <strong>meetingLink:</strong>
            <Input
              size="sm"
              value={createValues.meetingLink}
              onChange={(e) => setCreateValues(prev => ({ ...prev, meetingLink: e.target.value }))}
              width="300px"
            />
          </div>

          <div><strong>groupId:</strong> 空闲</div>

          <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
            <IconButton aria-label="保存" icon={<CheckIcon />} size="sm" colorScheme="green" onClick={saveNewSlot} isLoading={isSaving} />
            <IconButton aria-label="取消" icon={<CloseIcon />} size="sm" colorScheme="red" onClick={cancelCreating} isDisabled={isSaving} />
          </div>
        </Box>
      )}

      {!creatingNew && (
        <div style={{ marginBottom: '16px' }}>
          <IconButton
            aria-label="添加新会议位置"
            icon={<AddIcon />}
            size="sm"
            colorScheme="blue"
            onClick={startCreating}
          />
        </div>
      )}

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
                <IconButton aria-label="保存" icon={<CheckIcon />} size="sm" colorScheme="green" onClick={saveSlotChanges} isLoading={isSaving} />
                <IconButton aria-label="取消" icon={<CloseIcon />} size="sm" colorScheme="red" onClick={cancelEditing} isDisabled={isSaving} />
              </>
            ) : (
              <IconButton aria-label="编辑" icon={<EditIcon />} size="sm" onClick={() => startEditing(slot)} />
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
      <MatchFeedbackEditableUntil />
      <MeetingSlots />
    </VStack>
  );
}