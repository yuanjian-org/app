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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
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
  const { onOpen, onClose } = useDisclosure();
  const [selectedSlot, setSelectedSlot] = useState<MeetingSlot | null>(null);

  const handleCreateNew = () => {
    setSelectedSlot(null);
    onOpen();
  };

  const handleEdit = (slot: MeetingSlot) => {
    setSelectedSlot(slot);
    onOpen();
  };

  const handleCloseModal = () => {
    onClose();
    setSelectedSlot(null);
  };

  const handleModalSuccess = () => {
    void query.refetch();
    handleCloseModal();
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

      <MeetingSlotModal
        onClose={handleCloseModal}
        slot={selectedSlot}
        onSuccess={handleModalSuccess}
      />
    </>
  );
}

function MeetingSlotModal({
  onClose,
  slot,
  onSuccess
}: {
  onClose: () => void;
  slot: MeetingSlot | null;
  onSuccess: () => void;
}) {
  const [formValues, setFormValues] = useState({
    tmUserId: '',
    meetingId: '',
    meetingLink: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  
  const isOpen = slot !== null;
  
  useEffect(() => {
    if (isOpen) {
      setFormValues({
        tmUserId: slot?.tmUserId || '',
        meetingId: slot?.meetingId || '',
        meetingLink: slot?.meetingLink || ''
      });
    }
  }, [isOpen, slot]);

  const handleCloseModal = () => {
    onClose();
    setFormValues({ tmUserId: '', meetingId: '', meetingLink: '' });
  };

  const handleSave = async () => {
    setIsSaving(true);
    const payload = {
      tmUserId: formValues.tmUserId,
      meetingId: formValues.meetingId,
      meetingLink: formValues.meetingLink,
      ...(slot && { id: slot.id }),
    };
    
    try {
      await trpc.meetings.createOrUpdateMeetingSlot.mutate(payload);
      const action = slot ? '更新' : '创建';
      toast.success(`会议位置${action}成功`);
      onSuccess();
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof typeof formValues, value: string) => {
    setFormValues(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCloseModal} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {slot ? '编辑会议位置' : '创建新会议位置'}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>tmUserId</FormLabel>
              <Input
                value={formValues.tmUserId}
                onChange={(e) => handleInputChange('tmUserId', e.target.value)}
                placeholder="输入腾讯会议用户ID"
                isReadOnly={!!slot}
                bg={slot ? 'gray.100' : 'white'}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>meetingId</FormLabel>
              <Input
                value={formValues.meetingId}
                onChange={(e) => handleInputChange('meetingId', e.target.value)}
                placeholder="输入会议ID"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>meetingLink</FormLabel>
              <Input
                value={formValues.meetingLink}
                onChange={(e) => handleInputChange('meetingLink', e.target.value)}
                placeholder="输入会议链接"
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleCloseModal}>
            取消
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSave}
            isLoading={isSaving}
          >
            {slot ? '更新' : '创建'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
