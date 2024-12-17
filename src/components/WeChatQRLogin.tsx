import { useEffect, useRef, useState } from 'react';
import { Box } from '@chakra-ui/react';
import Loader from './Loader';
import { getCsrfToken } from "next-auth/react";

declare global {
  interface Window {
    WxLogin: any;
  }
}

export default function WeChatQRLogin({ appid, callbackUrl }: {
  appid: string;
  callbackUrl: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 动态加载微信登录JS
    // https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html
    const script = document.createElement('script');
    script.src = 'https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js';
    script.async = true;
    script.onload = async () => {
      if (containerRef.current && window.WxLogin) {
        const redirectUri =
          new URL(`${window.location.origin}/api/auth/callback/wechat-iframe-qr`);
        redirectUri.searchParams.append('callbackUrl', callbackUrl);

        new window.WxLogin({
          id: "wechat-qr-container",
          appid,
          scope: "snsapi_login",
          redirect_uri: encodeURIComponent(redirectUri.toString()),
          style: "black",
          href: "", // 可以添加自定义CSS
          self_redirect: false,
          stylelite: 1,
          state: await getCsrfToken(),
        });

        const iframe = containerRef.current?.querySelector('iframe');
        if (iframe) {
          console.log('iframe found');
          iframe.onload = () => {
            console.log('iframe loaded');
            setIsLoading(false);
          };
        }
      }
    };

    script.onerror = (error) => {
      console.error('Script loading failed:', error);
    };

    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, [callbackUrl, appid]);

  return (
    <Box position="relative" height="170px" width="300px">
      <Box
        position="absolute"
        display="flex"
        flexDirection="row"
        alignItems="center"
        justifyContent="center"
        opacity={isLoading ? 1 : 0}
        transition="opacity 0.3s"
        pointerEvents={isLoading ? "auto" : "none"}
        style={{ minWidth: "300px", minHeight: "170px" }}
      >
        <Loader loadingText="二维码加载中..." />
      </Box>
      <Box
        id="wechat-qr-container"
        ref={containerRef}
        height="100%"
        opacity={isLoading ? 0 : 1}
        transition="opacity 0.3s"
      />
    </Box>
  );
}

