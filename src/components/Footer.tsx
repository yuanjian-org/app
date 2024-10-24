import { HStack, Link, Wrap, WrapItem } from '@chakra-ui/react';
import Image from "next/image";
import beian from '../../public/img/beian.png';
import { componentSpacing } from 'theme/metrics';
import { appPagePaddingX } from './AppPageContainer';

export default function Footer() {
  const color = 'gray.400';

  return <Wrap justify='center' fontSize="sm" paddingBottom="30px" color={color}
    paddingX={appPagePaddingX} spacingX={componentSpacing * 2}>
    <WrapItem>
      &copy; {new Date().getFullYear()} 杭州思烛教育科技有限公司
    </WrapItem>
    <WrapItem>
      <Link
        color={color}
        isExternal
        href='http://beian.miit.gov.cn/'
      >
        浙ICP备2024117465号-2
      </Link>
    </WrapItem>
    <WrapItem>
      <HStack>
        <Image alt="备案" width={13} src={beian} />
        <Link
          color={color}
          isExternal
          href="https://beian.mps.gov.cn/#/query/webSearch?code=33010802013665"
          rel="noreferrer"
        >
          浙公网安备33010802013665
        </Link>
      </HStack>
    </WrapItem>
  </Wrap>;
}
