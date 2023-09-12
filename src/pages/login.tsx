import { Center, Container, Flex, Link } from '@chakra-ui/react';
import Image from "next/image";
import { useEffect } from 'react';
import '@authing/guard-react18/dist/esm/guard.min.css';
import guard from "../guard";
import vercelBanner from '../../public/img/vercel-banner.svg';

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
