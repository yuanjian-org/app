import {
  Button,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  HStack,
  Spacer,
  Text,
} from "@chakra-ui/react";
import ModalWithBackdrop from "./ModalWithBackdrop";
import { componentSpacing } from "theme/metrics";
import { accountPageTitle } from "pages/accounts/[userId]";
import T from "components/T";
import React from "react";

export function BaseInitialModal({
  title,
  bodyMainText,
  confirm,
  decline,
  loadingDecline,
  declineButtonText,
  confirmButtonText,
}: {
  title: string;
  bodyMainText: React.ReactNode;
  confirm: () => void;
  decline: () => void;
  loadingDecline?: boolean;
  declineButtonText: string;
  confirmButtonText: string;
}) {
  return (
    // Set onClose to undefined to prevent user from closing the modal without
    // entering name.
    <ModalWithBackdrop isOpen size="lg" onClose={() => undefined}>
      <ModalContent>
        <ModalHeader>
          <T>{title}</T>
        </ModalHeader>
        <ModalBody>
          {bodyMainText}
          <Text mt={componentSpacing}>
            <T>如果选择跳过，之后可以前往用户菜单的【</T>
            {accountPageTitle}
            <T>】页进行验证。</T>
          </Text>
        </ModalBody>
        <ModalFooter>
          <HStack spacing={componentSpacing} w="full">
            <Button onClick={decline} isLoading={loadingDecline}>
              <T>{declineButtonText}</T>
            </Button>
            <Spacer />
            <Button
              variant="brand"
              onClick={confirm}
              isDisabled={loadingDecline}
            >
              <T>{confirmButtonText}</T>
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>
  );
}
