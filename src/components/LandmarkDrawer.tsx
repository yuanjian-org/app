import {
    Drawer, 
    DrawerBody, 
    DrawerHeader, 
    DrawerOverlay, 
    DrawerContent, 
  } from '@chakra-ui/react';
import { Landmark } from 'shared/Map';

export default function LandmarkDrawer ({ onClose, landmark }: { 
    onClose: () => void; 
    landmark: Landmark
  }) {      
    return <Drawer isOpen onClose={onClose}>
      <DrawerOverlay />
      <DrawerContent>
        <DrawerHeader>{landmark.名称}</DrawerHeader>
        <DrawerBody>{landmark.定义}</DrawerBody>
      </DrawerContent>
    </Drawer>;
  };
