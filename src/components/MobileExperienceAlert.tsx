import { Alert, AlertIcon, AlertDescription, HStack } from '@chakra-ui/react';
import { sidebarBreakpoint } from 'components/Navbars';


export default function MobileExperienceAlert() {
  return <Alert status="warning" display={{ [sidebarBreakpoint]: "none" }}>
  <HStack>
    <AlertIcon />
    <AlertDescription>本页内容较多。为了最佳浏览体验，建议使用桌面浏览器。</AlertDescription>
  </HStack>
  </Alert>;
}
