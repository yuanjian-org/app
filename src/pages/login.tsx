import { Center, Container, Flex, Link } from '@chakra-ui/react';
import Image from "next/image";
import { useEffect } from 'react';
import '@authing/guard-react18/dist/esm/guard.min.css';
import guard from "../guard";
import vercelBanner from '../../public/img/vercel-banner.svg';
import logToSentry from 'shared/logToSentry';

export default function Login() {
  const guardEffects = async () => {
    guard.start('#authing-guard-container').then(userInfo => {
      console.log('guard.start:', userInfo);
    });

    guard.on('load', (e) => {
      console.log('guard.on load:', e);
    });

    guard.on('login', userInfo => {
      location.href = '/';
    });
  };

  useEffect(() => {
    // if local storage contains user infos means the token is damaged or missing to login
    const user = localStorage.getItem('_authing_user');
    if (user) {
      const u = JSON.parse(user);
      if (localStorage.getItem('_authing_token')) {
        logToSentry('INFO',
          'Authing token is invalid at local storage',
          u.email,
          {
            lastLogin: u.lastLogin,
            tokenExpiredAt: u.tokenExpiredAt
          }
        );
      } else {
        logToSentry('ERROR',
          'Authing token is missing at local storage',
          u.email
        );
      }
  }
    guardEffects();
  }, []);

  return (
    <Flex
      justifyContent="center"
      alignItems="flex-end"
      minHeight="99vh"
    >
      <div id="authing-guard-container"></div>
      <Center>
        <Container as="footer">
          <Link isExternal href="https://vercel.com/?utm_source=yuanjian&utm_campaign=oss">
            <Image
              src={vercelBanner}
              alt="Vercel Banner"
              height="30"
            />
          </Link>
        </Container>
      </Center>
    </Flex>
  );
}
