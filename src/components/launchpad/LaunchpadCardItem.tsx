import {
  Text,
  Link
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { IoMdBookmark } from 'react-icons/io';
import colors from 'theme/colors';

export default function LaunchpadCardItem({ title, href, padding, external }: { 
  title: string, 
  href: string,
  padding?: boolean,
  external?: boolean,
}) {
  return <Text display="inline-flex" alignItems="center">
    <IoMdBookmark color={colors.brand["100"]} />
    <Link as={NextLink} href={href} ms={padding ? 2 : 0} isExternal={external}>
      {title}
    </Link>
  </Text>;
}
