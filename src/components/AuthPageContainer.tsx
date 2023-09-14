import { Box, Flex, VStack, Heading } from '@chakra-ui/react';
import Image from "next/image";
import { componentSpacing } from 'theme/metrics';
import yuanjianLogo80x80 from '../../public/img/yuanjian-logo-80x80.png';
import { ReactNode } from "react";

export default function AuthPageContainer({ title, children }: {
  title: string,
  children: ReactNode
}) {
  return <Flex direction="column" justifyContent="center" alignItems="center" minHeight="100vh">
    <VStack align="left" spacing={componentSpacing} width={350}>
      <Image src={yuanjianLogo80x80} alt="图标" width={60} 
        // Without `priority` we would get a warning from Chrome that this image "was detected as the Largest 
        // Contentful Paint (LCP). Please add the "priority" property if this image is above the fold. Read more: 
        // https://nextjs.org/docs/api-reference/next/image#priority"
        priority
      />

      <Heading size="md" marginBottom={10}>{title}</Heading>

      {children}

    </VStack>

    <Box height={40} />
  </Flex>;
}
