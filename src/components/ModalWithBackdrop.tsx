import { Modal, ModalOverlay, ModalProps } from "@chakra-ui/react";

export default function ModalWithBackdrop(props: ModalProps) {
  return (
    <Modal scrollBehavior="inside" {...props}>
      <ModalOverlay backdropFilter="blur(8px)" />
      {props.children}
    </Modal>
  );
}
