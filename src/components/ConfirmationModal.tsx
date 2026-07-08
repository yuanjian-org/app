import {
  Button,
  ModalHeader,
  ModalContent,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  HStack,
} from "@chakra-ui/react";
import ModalWithBackdrop from "components/ModalWithBackdrop";
import { componentSpacing } from "theme/metrics";
import T from "components/T";

export type ConfirmationModelProps = {
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  confirmButtonText?: string;
  confirmButtonInRed?: boolean;
  hasCancelButton?: boolean;
};

export default function ConfirmationModal({
  message,
  onConfirm,
  onClose,
  confirmButtonText,
  confirmButtonInRed,
  hasCancelButton,
}: ConfirmationModelProps) {
  return (
    <ModalWithBackdrop isOpen onClose={onClose}>
      <ModalContent>
        <ModalHeader>
          <T>确认</T>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>{message}</ModalBody>
        <ModalFooter>
          <HStack spacing={componentSpacing}>
            {hasCancelButton && (
              <Button onClick={onClose}>
                <T>取消</T>
              </Button>
            )}
            <Button
              {...(confirmButtonInRed
                ? { colorScheme: "red" }
                : { variant: "brand" })}
              onClick={() => {
                onConfirm();
                onClose();
              }}
            >
              {confirmButtonText || "确认"}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>
  );
}
