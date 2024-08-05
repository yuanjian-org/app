import { Alert, AlertIcon, AlertDescription, HStack, AlertProps } from '@chakra-ui/react';
import { sidebarBreakpoint } from 'components/Navbars';


export default function MobileExperienceAlert(props: AlertProps) {
  return <Alert status="warning" width="89%" display={{ [sidebarBreakpoint]: "none" }} {...props}>
    <HStack>
      <AlertIcon />
      <AlertDescription>本页内容较多。为了最佳使用体验，建议使用桌面浏览器。</AlertDescription>
    </HStack>
  </Alert>;
}
