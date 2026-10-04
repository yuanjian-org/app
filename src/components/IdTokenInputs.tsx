import {
  Button,
  FormControl,
  Input,
  InputGroup,
  InputRightElement,
} from "@chakra-ui/react";
import { useState } from "react";
import trpc from "../trpc";
import { isValidEmail } from "shared/strings/isValidEmail";
import { isValidPhone } from "shared/strings/isValidPhone";
import { tokenMinSendIntervalInSeconds, tokenLength } from "shared/token";
import PhoneInput from "./PhoneInput";
import { toast } from "react-toastify";
import { IdType } from "shared/IdType";
import { EmailInput } from "pages/auth/login";
import { useTranslation } from "next-i18next/pages";

export type IdTokenInputsState = {
  id: string;
  token: string;
  isValid: boolean;
};

export default function IdTokenInputs({
  idType,
  onStateChange,
  buttonWidth = "120px",
}: {
  idType: IdType;
  onStateChange: (state: IdTokenInputsState) => void;
  buttonWidth?: string;
}) {
  const { t } = useTranslation("common");
  const [id, setId] = useState("");
  const [token, setToken] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);

  const sendToken = async () => {
    setLoading(true);
    try {
      await trpc.idTokens.send.mutate({ idType, id });
      toast.success("验证码已发送，请注意查收。");

      setCountdown(tokenMinSendIntervalInSeconds);

      // Start countdown timer
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  const isValidId = (id: string) =>
    idType === "phone" ? isValidPhone(id) : isValidEmail(id);
  const isValidState = (id: string, token: string) =>
    isValidId(id) && token.length === tokenLength;

  // Handle updates to ID state (phone or email)
  const handleIdChange = (v: string) => {
    const nextId = v.trim();
    setId(nextId);
    onStateChange({
      id: nextId,
      token,
      isValid: isValidState(nextId, token),
    });
  };

  // Handle updates to verification token state
  const handleTokenChange = (v: string) => {
    const nextToken = v.trim();
    setToken(nextToken);
    onStateChange({
      id,
      token: nextToken,
      isValid: isValidState(id, nextToken),
    });
  };

  // Dynamically choose input component based on idType
  const IdInputComponent = idType === "phone" ? PhoneInput : EmailInput;

  return (
    <>
      <FormControl>
        <IdInputComponent value={id} onChange={handleIdChange} />
      </FormControl>
      <FormControl>
        <InputGroup>
          <Input
            isRequired={true}
            value={token}
            placeholder={t("验证码")}
            type="text"
            isDisabled={!isValidId(id)}
            onChange={(e) => handleTokenChange(e.target.value)}
          />
          <InputRightElement w={buttonWidth}>
            <Button
              w={buttonWidth}
              isDisabled={!isValidId(id) || countdown > 0}
              onClick={sendToken}
              isLoading={loading}
            >
              {countdown > 0 ? `${countdown}秒后重发` : "发送验证码"}
            </Button>
          </InputRightElement>
        </InputGroup>
      </FormControl>
    </>
  );
}
