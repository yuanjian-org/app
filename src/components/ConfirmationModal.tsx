import {
  Button,
  ModalHeader,
  ModalContent,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  HStack
} from '@chakra-ui/react';
import React from 'react';
import ModalWithBackdrop from 'components/ModalWithBackdrop';
import { componentSpacing } from 'theme/metrics';

export default function ConfirmationModal({ message, confirm, close, red }: {
  message: string,
  confirm: () => void,
  close: () => void,
  red?: boolean
}) {
  return <ModalWithBackdrop isOpen onClose={close}>
    <ModalContent>
      <ModalHeader>确认</ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        {message}
      </ModalBody>
      <ModalFooter>
        <HStack spacing={componentSpacing}>
          <Button onClick={close}>取消</Button>
          <Button
            {...red ? { colorScheme: 'red' } : { variant: 'brand' }}
            onClick={() => { confirm(); close(); }}
          >
            确认
          </Button>
        </HStack>
      </ModalFooter>
    </ModalContent>
  </ModalWithBackdrop>;
}
