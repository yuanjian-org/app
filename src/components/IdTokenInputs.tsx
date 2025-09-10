import {
  Button,
  FormControl,
  Input,
  InputGroup,
  InputRightElement,
} from "@chakra-ui/react";
import { useState } from "react";
import trpc from "../trpc";
import { isValidEmail, isValidPhone } from "shared/strings";
import { tokenMinSendIntervalInSeconds, tokenLength } from "shared/token";
import PhoneInput from "./PhoneInput";
import { toast } from "react-toastify";
import { IdType } from "shared/IdType";
import { EmailInput } from "pages/auth/login";

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

  return (
    <>
      <FormControl>
        {idType === "phone" ? (
          <PhoneInput
            value={id}
            onChange={(v) => {
              const id = v.trim();
              setId(id);
              onStateChange({
                id,
                token,
                isValid: isValidState(id, token),
              });
            }}
          />
        ) : (
          <EmailInput
            value={id}
            onChange={(v) => {
              const id = v.trim();
              setId(id);
              onStateChange({
                id,
                token,
                isValid: isValidState(id, token),
              });
            }}
          />
        )}
      </FormControl>
      <FormControl>
        <InputGroup>
          <Input
            isRequired={true}
            value={token}
            isDisabled={!isValidId}
            onChange={(e) => {
              const token = e.target.value.trim();
              setToken(token);
              onStateChange({
                id,
                token,
                isValid: isValidState(id, token),
              });
            }}
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
