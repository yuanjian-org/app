import {
    Text,
    Drawer, 
    DrawerBody, 
    DrawerHeader, 
    DrawerOverlay, 
    DrawerContent, 
    Button,
  } from '@chakra-ui/react';
import { Landmark } from 'shared/Map';

export default function LandmarkDrawer ({ onClose, landmark }: { 
    onClose: () => void; 
    landmark: Landmark | null 
  }) {
    if (!landmark) return null;
      
    return <Drawer isOpen={!!landmark} onClose={onClose}>
      <DrawerOverlay />
      <DrawerContent>
        <DrawerHeader>{landmark.名称}</DrawerHeader>
        <DrawerBody>
          <Text>{landmark.定义}{' '}
            <Button onClick={() => onClose()} size="sm" variant="link">收起
            </Button>
          </Text>
        </DrawerBody>
      </DrawerContent>
    </Drawer>;
  };
