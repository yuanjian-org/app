import {
  Modal,
  ModalOverlay,
} from '@chakra-ui/react';

export default function ModalWithBackdrop(props: any) {
  return <Modal {...props}>
    <ModalOverlay backdropFilter='blur(8px)' />
    {props.children}
  </Modal>;
}