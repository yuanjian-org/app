import {
  Drawer, DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerBody,
  DrawerHeader,
} from '@chakra-ui/react';
import UserPanel, { UserPanelProps } from 'components/UserPanel';

export default function UserDrawer({ onClose, ...rest }: UserPanelProps & {
  onClose: () => void,
}) {    
  return <Drawer size="xl" isOpen onClose={onClose}>
    <DrawerOverlay />
    <DrawerContent>
      <DrawerCloseButton size="lg" /> 
      <DrawerHeader />
      <DrawerBody>
        <UserPanel {...rest} />
      </DrawerBody> 
    </DrawerContent>
  </Drawer>;
}
