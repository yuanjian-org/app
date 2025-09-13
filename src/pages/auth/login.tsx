import {
  Button,
  InputGroup,
  InputLeftElement,
  Input,
  VStack,
  TabList,
  Tab,
  Tabs,
  TabPanels,
  TabPanel,
  Text,
  Link,
  InputGroupProps,
  HStack,
  UnorderedList,
  ListItem,
} from "@chakra-ui/react";
import { EmailIcon, LockIcon } from "@chakra-ui/icons";
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  isValidEmail,
  isValidPassword,
  isValidPhone,
  parseQueryString,
  passwordMinLength,
} from "shared/strings";
import { toast } from "react-toastify";
import EmbeddedWeChatQRLogin from "components/EmbeddedWeChatQRLogin";
import { componentSpacing, sectionSpacing } from "theme/metrics";
import PageBreadcrumb from "components/PageBreadcrumb";
import { staticUrlPrefix } from "static";
import { IoLogoWechat } from "react-icons/io5";
import { SmallGrayText } from "components/SmallGrayText";
import invariant from "shared/invariant";
import { RiCustomerServiceFill } from "react-icons/ri";
import IdTokenInputs, { IdTokenInputsState } from "components/IdTokenInputs";
import { IdType } from "shared/IdType";
import PhoneInput from "components/PhoneInput";
import trpc from "trpc";

export function loginUrl(callbackUrl?: string) {
  return `/auth/login?${callbackUrlParam(callbackUrl)}`;
}

const callbackUrlKey = "callbackUrl";

function callbackUrlParam(url: string | undefined) {
  return url ? `${callbackUrlKey}=${encodeURIComponent(url)}` : "";
}

function useCallbackUrl() {
  const router = useRouter();
  return parseQueryString(router, callbackUrlKey) ?? "/";
}

type ServerSideProps = {
  wechatQRAppId: string;
};

/**
 * Use `?callbackUrl=...` in the URL to specify the URL to redirect to after
 * logging in.
 */
export default function Page({ wechatQRAppId }: ServerSideProps) {
  const router = useRouter();

  // Show the error passed in by next-auth.js if any.
  useEffect(() => {
    const err = parseQueryString(router, "error");
    // See https://next-auth.js.org/configuration/pages#error-page
    if (err) handleSignInException(err);
  }, [router]);

  // https://lzl124631x.github.io/2016/04/08/check-wechat-user-agent.html
  const isMobileBrowser = /Mobile/i.test(navigator.userAgent);
  const isWechatBrowser = /MicroMessenger/i.test(navigator.userAgent);

  return (
    // See AuthPageContainer.tsx for the parent container
    <>
      <PageBreadcrumb
        current="登录"
        parents={[{ name: "远图", link: staticUrlPrefix }]}
      />

      <Tabs
        isFitted
        isLazy
        // size="sm"
        // If the user is on mobile and not using WeChat browser, show the
        // verification code tab as default, because the only WeChat option on
        // non-WeChat mobile browser is QR code which is often impossible to scan.
        defaultIndex={isMobileBrowser && !isWechatBrowser ? 1 : 0}
      >
        <TabList>
          <Tab>微信</Tab>
          <Tab>手机</Tab>
          <Tab>邮箱</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            {/* Only WeChat browser supports logging in with WeChat accounts. See
              docs/WeChat.md for more information. */}
            {isWechatBrowser ? (
              <WechatAccountPanel />
            ) : (
              <WechatQRPanel wechatQRAppId={wechatQRAppId} />
            )}
          </TabPanel>
          <TabPanel px={0}>
            <PhonePanel />
          </TabPanel>
          <TabPanel px={0}>
            <EmailPanel />
          </TabPanel>
        </TabPanels>
      </Tabs>

      <HStack justify="center" spacing={2}>
        <SmallGrayText>
          若登录遇到问题，
          <Link
            href="https://work.weixin.qq.com/kfid/kfcd32727f0d352531e"
            target="_blank"
          >
            联系客服
          </Link>
        </SmallGrayText>
        <RiCustomerServiceFill color="gray" />
      </HStack>
    </>
  );
}

function EmailPanel() {
  return (
    <Tabs variant="enclosed-colored" isFitted isLazy size="sm">
      <TabList mt={componentSpacing}>
        <Tab>验证码</Tab>
        <Tab>密码</Tab>
      </TabList>
      <TabPanels>
        <TabPanel>
          <IdTokenPanel idType="email" />
        </TabPanel>
        <TabPanel>
          <IdPasswordPanel idType="email" />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}

function PhonePanel() {
  return (
    <Tabs variant="enclosed-colored" isFitted isLazy size="sm">
      <TabList mt={componentSpacing}>
        <Tab>验证码</Tab>
        <Tab>密码</Tab>
      </TabList>
      <TabPanels>
        <TabPanel>
          <IdTokenPanel idType="phone" />
        </TabPanel>
        <TabPanel>
          <IdPasswordPanel idType="phone" />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}

function WechatQRPanel({ wechatQRAppId }: { wechatQRAppId: string }) {
  const callbackUrl = useCallbackUrl();
  return (
    <VStack spacing={componentSpacing}>
      <Text fontSize="sm" color="gray">
        若二维码无法加载，
        <Link onClick={() => signIn("wechat-qr", { callbackUrl })}>
          点击此处
        </Link>
      </Text>
      <EmbeddedWeChatQRLogin appid={wechatQRAppId} callbackUrl={callbackUrl} />
    </VStack>
  );
}

function WechatAccountPanel() {
  const callbackUrl = useCallbackUrl();

  return (
    <VStack spacing={componentSpacing}>
      <Button
        width="full"
        mt={sectionSpacing}
        leftIcon={<IoLogoWechat />}
        onClick={() => signIn("wechat", { callbackUrl })}
        bg="#07C160"
        color="white"
        _hover={{ bg: "#06AE56" }}
      >
        微信登录
      </Button>
    </VStack>
  );
}

function IdPasswordPanel({ idType }: { idType: IdType }) {
  const callbackUrl = useCallbackUrl();

  const [id, setId] = useState<string>("");
  const [reset, setReset] = useState<boolean>(false);
  const [resetState, setResetState] = useState<IdTokenInputsState>();
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const isValidInput =
    isValidPassword(password) &&
    (reset
      ? !!resetState?.isValid
      : idType === "email"
        ? isValidEmail(id)
        : isValidPhone(id));

  const submit = async () => {
    setIsLoading(true);
    try {
      if (reset) await doReset();
      else await doSignIn();
    } finally {
      setIsLoading(false);
    }
  };

  const doReset = async () => {
    invariant(resetState?.isValid, "resetState is invalid");
    await trpc.idTokens.resetPassword.mutate({
      idType,
      id: resetState.id,
      token: resetState.token,
      password,
    });
    setReset(false);
    setPassword("");
    toast.success("密码重置成功，请使用新密码登录。");
  };

  const doSignIn = async () => {
    try {
      const res = await signIn("id-password", {
        idType,
        id,
        password,
        callbackUrl,
        // Display errors on the same page
        redirect: false,
      });
      if (!res || res.error) {
        console.log("Login failed. res:", res);
        if (res?.error === "CredentialsSignin") {
          toast.error("登录失败，请检查邮箱和密码。");
        } else {
          handleSignInException(res?.error);
        }
      } else {
        // Redirect manually as we disabled next-auth redirect above.
        if (callbackUrl !== "/") window.location.href = callbackUrl;
      }
    } catch (err) {
      handleSignInException(err);
    }
  };

  return (
    <VStack spacing={sectionSpacing} my={sectionSpacing}>
      {reset ? (
        <IdTokenInputs idType={idType} onStateChange={setResetState} />
      ) : idType === "email" ? (
        <EmailInput value={id} onChange={setId} />
      ) : (
        <PhoneInput value={id} onChange={setId} />
      )}

      {reset && (
        <SmallGrayText>
          密码长度至少{passwordMinLength}位。强烈建议：
          <UnorderedList>
            <ListItem>不要重复使用其他网站或应用的密码。</ListItem>
            <ListItem>使用密码工具生成并保存密码。不要试图记忆。</ListItem>
          </UnorderedList>
        </SmallGrayText>
      )}

      <PasswordInput
        placeholder={reset ? "设置密码" : "密码"}
        password={password}
        setPassword={setPassword}
        isValidInput={isValidInput}
        submit={submit}
      />

      <HStack w="full" spacing={4}>
        <Link
          w="50%"
          onClick={() => {
            setReset(!reset);
            setPassword("");
          }}
        >
          {reset ? "‹ 返回" : "注册或重置密码"}
        </Link>
        <Button
          w="50%"
          variant="brand"
          isDisabled={!isValidInput}
          isLoading={isLoading}
          onClick={submit}
        >
          {reset ? "确认" : "登录"}
        </Button>
      </HStack>
    </VStack>
  );
}

function handleSignInException(err: any) {
  const msg = `糟糕，系统错误，请联系客服：${err}`;
  toast.error(msg);
}

export function EmailInput({
  value,
  onChange,
  submit,
  isDisabled,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  submit?: () => any;
  isDisabled?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <InputGroup>
      <InputLeftElement pointerEvents="none">
        <EmailIcon color={inputIconColor} />
      </InputLeftElement>
      <Input
        type="email"
        name="email"
        placeholder={"邮箱"}
        isDisabled={isDisabled}
        autoFocus={autoFocus}
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
        onKeyDown={async (ev) => {
          if (submit && ev.key == "Enter" && isValidEmail(value)) {
            await submit();
          }
        }}
      />
    </InputGroup>
  );
}

export function PasswordInput({
  password,
  setPassword,
  isValidInput,
  submit,
  autoFocus,
  placeholder,
  ...inputGroupProps
}: {
  password: string;
  setPassword: (password: string) => void;
  isValidInput: boolean;
  submit: () => any;
  autoFocus?: boolean;
  placeholder?: string;
} & InputGroupProps) {
  return (
    <InputGroup {...inputGroupProps}>
      <InputLeftElement pointerEvents="none">
        <LockIcon color={inputIconColor} />
      </InputLeftElement>
      <Input
        type="password"
        name="password"
        placeholder={placeholder ?? "密码"}
        autoFocus={autoFocus}
        value={password}
        onChange={(ev) => setPassword(ev.target.value)}
        onKeyDown={async (ev) => {
          if (ev.key == "Enter" && isValidInput) await submit();
        }}
      />
    </InputGroup>
  );
}

const inputIconColor = "gray.400";

function IdTokenPanel({ idType }: { idType: IdType }) {
  const callbackUrl = useCallbackUrl();

  const [state, setState] = useState<IdTokenInputsState>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const submit = async () => {
    invariant(state?.isValid, "state is invalid");
    setIsLoading(true);
    try {
      const res = await signIn("id-token", {
        idType,
        id: state.id,
        token: state.token,
        callbackUrl,
        // Display errors on the same page
        redirect: false,
      });
      if (!res || res.error) {
        console.log("Login failed. res:", res);
        if (res?.error === "CredentialsSignin") {
          toast.error(
            `登录失败，请检查${idType === "phone" ? "手机号" : "邮箱"}和验证码。`,
          );
        } else {
          handleSignInException(res?.error);
        }
      } else {
        // Redirect manually as we disabled next-auth redirect above.
        if (callbackUrl !== "/") window.location.href = callbackUrl;
      }
    } catch (err) {
      handleSignInException(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <VStack spacing={sectionSpacing} my={sectionSpacing}>
        <IdTokenInputs idType={idType} onStateChange={setState} />
        <Button
          variant="brand"
          width="full"
          isDisabled={!state?.isValid}
          isLoading={isLoading}
          onClick={submit}
        >
          登录 / 注册
        </Button>
      </VStack>
    </>
  );
}

export function getServerSideProps(): { props: ServerSideProps } {
  return {
    props: {
      wechatQRAppId: process.env.AUTH_WECHAT_QR_APP_ID ?? "",
    },
  };
}
