import { Box, Flex, VStack } from '@chakra-ui/react';
import Image from "next/image";
import { componentSpacing } from 'theme/metrics';
import yuanjianLogo80x80 from '../../public/img/yuanjian-logo-80x80.png';
import sizhuLogo80x80 from '../../public/img/sizhu-logo-80x80.png';
import { PropsWithChildren } from "react";
import branding from 'shared/branding';

export default function AuthPageContainer({ children, ...rest }: 
  PropsWithChildren
) {
  return <Flex direction="column" justifyContent="center" alignItems="center"
    minHeight="100vh" {...rest}
  >
    <VStack align="left" spacing={componentSpacing} width={350}>

      <Image alt="图标" width={60}
        src={branding() == "sizhu" ? sizhuLogo80x80 : yuanjianLogo80x80}

        // Without `priority` we would get a warning from Chrome that this image
        // "was detected as the Largest Contentful Paint (LCP). Please add the
        // "priority" property if this image is above the fold. Read more: 
        // https://nextjs.org/docs/api-reference/next/image#priority"
        priority
      />

      {children}
    </VStack>
    <Box height={40} />
  </Flex>;
}
