import {
  Button,
  FormControl,
  Input,
  InputGroup,
  InputRightElement,
} from "@chakra-ui/react";
import { useState } from "react";
import trpc from "../trpc";
import { isValidPhoneNumber } from "shared/strings";
import {
  phoneTokenMinSendIntervalInSeconds,
  shortLivedTokenLength,
} from "shared/token";
import PhoneNumberInput from "./PhoneNumberInput";
import { toast } from "react-toastify";

export type PhoneVerificationControlsState = {
  phone: string;
  token: string;
  isValid: boolean;
};

export default function PhoneVerificationControls({
  onStateChange,
  buttonWidth = "120px",
}: {
  onStateChange: (state: PhoneVerificationControlsState) => void;
  buttonWidth?: string;
}) {
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);

  const sendToken = async () => {
    setLoading(true);
    try {
      await trpc.phones.sendToken.mutate({ phone });
      toast.success("验证码已发送，请注意查收。");

      setCountdown(phoneTokenMinSendIntervalInSeconds);

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

  const isValidPhone = isValidPhoneNumber(phone);
  const isValidState = (phone: string, token: string) =>
    isValidPhoneNumber(phone) && token.length === shortLivedTokenLength;

  return (
    <>
      <FormControl>
        <PhoneNumberInput
          value={phone}
          onChange={(v) => {
            const phone = v.trim();
            setPhone(phone);
            onStateChange({
              phone,
              token,
              isValid: isValidState(phone, token),
            });
          }}
        />
      </FormControl>
      <FormControl>
        <InputGroup>
          <Input
            isRequired={true}
            value={token}
            isDisabled={!isValidPhone}
            onChange={(e) => {
              const token = e.target.value.trim();
              setToken(token);
              onStateChange({
                phone,
                token,
                isValid: isValidState(phone, token),
              });
            }}
          />
          <InputRightElement w={buttonWidth}>
            <Button
              w={buttonWidth}
              isDisabled={!isValidPhone || countdown > 0}
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
