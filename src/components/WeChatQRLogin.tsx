import { useEffect, useRef, useState } from 'react';
import { Box, Spinner } from '@chakra-ui/react';

declare global {
  interface Window {
    WxLogin: any;
  }
}

interface WeChatQRLoginProps {
  appid: string;
  callbackUrl: string;
}

export default function WeChatQRLogin({ appid, callbackUrl }: WeChatQRLoginProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 动态加载微信登录JS
    // https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html
    const script = document.createElement('script');
    script.src = 'https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js';
    script.async = true;
    script.onload = () => {
      if (containerRef.current && window.WxLogin) {
        const redirectUri = new URL(`${window.location.origin}/api/auth/callback/wechat-qr`);
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
        });

        // 添加监听二维码 iframe 加载完成的逻辑
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
              const iframe = containerRef.current?.querySelector('iframe');
              if (iframe) {
                iframe.onload = () => {
                  console.log('WeChat QR Code loaded');
                  setIsLoading(false);
                };
                observer.disconnect();
              }
            }
          });
        });

        observer.observe(containerRef.current, {
          childList: true,
          subtree: true
        });
      }
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
        <Spinner 
          thickness="4px"
          speed="0.65s"
          emptyColor="gray.200"
          color="blue.500"
          size="md"
          mr={3}
        />
        <Box 
          display="inline-block" 
          whiteSpace="nowrap"  // 防止文字换行
        >
          二维码加载中...
        </Box>
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

