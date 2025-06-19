import {
  VStack,
  FormControl,
  FormLabel,
  Input,
  Button,
  Box,
  IconButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  HStack,
} from '@chakra-ui/react';
import { AddIcon } from '@chakra-ui/icons';
import { toast } from 'react-toastify';
import PageBreadcrumb from 'components/PageBreadcrumb';
import { useState, useEffect } from 'react';
import { DateColumn } from 'shared/DateColumn';
import { MeetingSlot } from 'shared/MeetingSlot';
import { componentSpacing, maxTextWidth } from 'theme/metrics';
import trpc, { trpcNext } from 'trpc';
import moment from 'moment-timezone';
import TrLink from 'components/TrLink';
import ModalWithBackdrop from 'components/ModalWithBackdrop';

export default function Page() {
  return (
    <VStack spacing={componentSpacing} width={maxTextWidth} align="start">
      <PageBreadcrumb current="全局配置" />
      <MatchFeedbackEditableUntil />
      <MeetingSlots />
    </VStack>
  );
}

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
  const query = trpcNext.meetings.listMeetingSlots.useQuery();
  const meetingSlots = query.data;
  const [selectedSlot, setSelectedSlot] = useState<MeetingSlot>();

  const handleCreateNew = () => {
    setSelectedSlot(null)
  };

  const handleEdit = (slot: MeetingSlot) => {
    setSelectedSlot(slot);
  };

  return (
    <>
      <HStack justify="space-between" width="100%" mb={4}>
        <Box fontSize="lg" fontWeight="bold">会议位置管理</Box>
        <IconButton
          aria-label="添加新会议位置"
          icon={<AddIcon />}
          colorScheme="blue"
          onClick={handleCreateNew}
        />
      </HStack>

      <TableContainer width="100%">
        <Table variant="simple" size="sm">
          <Thead>
            <Tr>
              <Th>tmUserId</Th>
              <Th>meetingId</Th>
              <Th>meetingLink</Th>
              <Th>groupId</Th>
            </Tr>
          </Thead>
          <Tbody>
            {meetingSlots?.sort((a, b) => (a.tmUserId || '').localeCompare(b.tmUserId || '')).map((slot) => (
              <TrLink 
                key={slot.id}
                onClick={() => handleEdit(slot)}
              >
                <Td>{slot.tmUserId}</Td>
                <Td>{slot.meetingId}</Td>
                <Td>{slot.meetingLink}</Td>
                <Td>{slot.groupId}</Td>
              </TrLink>
            ))}
          </Tbody>
        </Table>
      </TableContainer>

      {selectedSlot && (
        <MeetingSlotEditor
          onClose={() => setSelectedSlot(undefined)}
          slot={selectedSlot}
          onSuccess={query.refetch}
        />
      )}
    </>
  );
}

function MeetingSlotEditor({
  onClose,
  slot,
  onSuccess
}: {
  onClose: () => void;
  slot: MeetingSlot;
  onSuccess: () => void;
}) {
  const [formValues, setFormValues] = useState({
    tmUserId: '',
    meetingId: '',
    meetingLink: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  
  const isEditing = !!slot.id;
  
  useEffect(() => {
    setFormValues({
      tmUserId: slot?.tmUserId || '',
      meetingId: slot?.meetingId || '',
      meetingLink: slot?.meetingLink || ''
    });
  }, [slot]);

  const handleSave = async () => {
    setIsSaving(true);
    const payload = {
      tmUserId: formValues.tmUserId,
      meetingId: formValues.meetingId,
      meetingLink: formValues.meetingLink,
      ...(slot.id && { id: slot.id }),
    };
    
    try {
      await trpc.meetings.createOrUpdateMeetingSlot.mutate(payload);
      const action = isEditing ? '更新' : '创建';
      toast.success(`会议位置${action}成功`);
      onSuccess();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof typeof formValues, value: string) => {
    setFormValues(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = formValues.tmUserId.trim() && formValues.meetingId.trim() && formValues.meetingLink.trim();

  return (
    <ModalWithBackdrop isOpen onClose={onClose} size="lg">
      <ModalContent>
        <ModalHeader>
          {isEditing ? '编辑' : '创建'}会议账号
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>腾讯会议用户ID</FormLabel>
              <Input
                value={formValues.tmUserId}
                onChange={(e) => handleInputChange('tmUserId', e.target.value)}
                isReadOnly={isEditing}
                bg={isEditing ? 'gray.100' : 'white'}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>会议ID</FormLabel>
              <Input
                value={formValues.meetingId}
                onChange={(e) => handleInputChange('meetingId', e.target.value)}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>会议链接</FormLabel>
              <Input
                value={formValues.meetingLink}
                onChange={(e) => handleInputChange('meetingLink', e.target.value)}
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            取消
          </Button>
          <Button
            variant="brand"
            onClick={handleSave}
            isLoading={isSaving}
            isDisabled={!isFormValid}
          >
            {isEditing ? '更新' : '创建'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>
  );
}
