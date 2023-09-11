import { Center, Container, Flex, Link } from '@chakra-ui/react';
import Image from "next/image";
import vercelBanner from '../../public/img/vercel-banner.svg';

export default function Login() {
  return <Flex
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
  </Flex>;
}
