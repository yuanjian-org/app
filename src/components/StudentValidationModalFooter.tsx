import { ModalFooter, HStack, Spacer, Button } from "@chakra-ui/react";
import ContactCustomerService from "./ContactCustomerService";
import { componentSpacing } from "theme/metrics";
import T from "components/T";

interface StudentValidationModalFooterProps {
  cancelLabel: string;
  cancel: () => void;
  submit: () => void;
  isInputValid: boolean;
  loadingSubmit: boolean;
}

/**
 * Shared modal footer for student identity validation modals.
 */
export default function StudentValidationModalFooter({
  cancelLabel,
  cancel,
  submit,
  isInputValid,
  loadingSubmit,
}: StudentValidationModalFooterProps) {
  return (
    <ModalFooter>
      <HStack spacing={componentSpacing} w="full">
        <ContactCustomerService />

        <Spacer />
        <Button onClick={cancel} isDisabled={loadingSubmit}>
          {cancelLabel}
        </Button>
        <Button
          onClick={submit}
          variant="brand"
          isDisabled={!isInputValid}
          isLoading={loadingSubmit}
        >
          <T>提交</T>
        </Button>
      </HStack>
    </ModalFooter>
  );
}
