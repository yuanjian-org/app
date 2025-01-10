import {
  Drawer,
  DrawerBody,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader
} from '@chakra-ui/react';
import UserPanel, { UserPanelProps } from 'components/UserPanel';

export default function UserDrawer({ onClose, ...rest }: UserPanelProps & {
  onClose: () => void,
}) {    
  return <Drawer size="xl" isOpen onClose={onClose}>
    <DrawerOverlay />
    <DrawerContent>
      <DrawerCloseButton /> 
      <DrawerHeader />
      <DrawerBody>
        <UserPanel {...rest} />
      </DrawerBody> 
    </DrawerContent>
  </Drawer>;
}
