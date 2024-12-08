import { useEffect, useRef, useState } from 'react';
import { Box, Spinner, VStack } from '@chakra-ui/react';
import { useRouter } from 'next/router';

declare global {
  interface Window {
    WxLogin: any;
  }
}

export default function WeChatQRLogin({ appid }: { appid: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // 获取当前路径作为回调URL
  const currentPath = typeof window !== 'undefined'
    ? window.location.pathname + window.location.search
    : '/';
  const callbackUrl = router.query.callbackUrl as string ||
    (currentPath !== '/auth/login' ? currentPath : '/');

  useEffect(() => {
    // 动态加载微信登录JS
    // https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html
    const script = document.createElement('script');
    script.src = 'https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js';
    script.async = true;

    script.onload = () => {
      setIsLoading(true);
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
    <Box position="relative" height="170px">
      {isLoading && (
        <Box
          position="absolute"
          top="0"
          left="0"
          width="100%"
          height="100%"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="white"
          zIndex="1"
        >
          <VStack spacing={3}>
            <Spinner
              thickness="4px"
              speed="0.65s"
              emptyColor="gray.200"
              color="blue.500"
              size="md"
            />
            <Box>二维码加载中...</Box>
          </VStack>
        </Box>
      )}
      <Box
        id="wechat-qr-container"
        ref={containerRef}
        height="100%"
      />
    </Box>
  );
}

