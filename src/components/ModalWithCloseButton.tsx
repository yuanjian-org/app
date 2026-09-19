import React from "react";
import {
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalCloseButton,
  Button,
  ModalContentProps,
} from "@chakra-ui/react";
import ModalWithBackdrop from "./ModalWithBackdrop";
import { ModalProps } from "@chakra-ui/react";
import T from "components/T";

export interface ModalWithCloseButtonProps extends Omit<ModalProps, "isOpen"> {
  title?: React.ReactNode;
  children: React.ReactNode;
  onClose: () => void;
  closeButtonText?: string;
  modalContentProps?: ModalContentProps;
  isOpen?: boolean;
}

export default function ModalWithCloseButton({
  title,
  children,
  onClose,
  closeButtonText = "关闭",
  modalContentProps,
  isOpen = true,
  ...rest
}: ModalWithCloseButtonProps) {
  return (
    <ModalWithBackdrop isOpen={isOpen} onClose={onClose} {...rest}>
      <ModalContent {...modalContentProps}>
        {title && <ModalHeader>{title}</ModalHeader>}
        <ModalCloseButton />
        <ModalBody>{children}</ModalBody>
        <ModalFooter>
          <Button onClick={onClose}>
            <T>{closeButtonText}</T>
          </Button>
        </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>
  );
}
