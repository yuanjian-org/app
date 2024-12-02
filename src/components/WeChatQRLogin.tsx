import { useEffect, useRef } from 'react';
import { Box } from '@chakra-ui/react';
import { useRouter } from 'next/router';

declare global {
  interface Window {
    WxLogin: any;
  }
}

export default function WeChatQRLogin() {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const callbackUrl = router.query.callbackUrl as string || '/';

  useEffect(() => {
    // 动态加载微信登录JS
    // https://developers.weixin.qq.com/doc/oplatform/Website_App/WeChat_Login/Wechat_Login.html
    const script = document.createElement('script');
    script.src = 'https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js';
    script.async = true;
    
    script.onload = () => {
      if (containerRef.current && window.WxLogin) {
        new window.WxLogin({
          id: "wechat-qr-container",
          appid: "wx5ca638d3eb3d9db9",
          scope: "snsapi_login",
          redirect_uri: encodeURIComponent(
            `${window.location.origin}/api/auth/callback/wechat-qr`
          ),
          style: "black",
          href: "", // 可以添加自定义CSS
          self_redirect: false,
          stylelite: 1,
        });
      }
    };

    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, [callbackUrl]);

  return (
    <Box 
      id="wechat-qr-container" 
      ref={containerRef}
      height="170px"
    />
  );
} 