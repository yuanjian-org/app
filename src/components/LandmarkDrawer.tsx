import {
    Drawer, 
    DrawerBody, 
    DrawerHeader, 
    DrawerOverlay, 
    DrawerContent, 
    DrawerCloseButton,
    Radio,
    RadioGroup,
    Stack,
    Text,
    Button,
  } from '@chakra-ui/react';
import { Landmark } from 'shared/Map';
import React, { useState } from 'react';
import { componentSpacing } from 'theme/metrics';

export default function LandmarkDrawer ({ onClose, landmark }: { 
    onClose: () => void; 
    landmark: Landmark
  }) {      
    const [value, setValue] = useState('');

    return <Drawer size="lg" isOpen onClose={onClose}>
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton /> 
        <DrawerHeader>{landmark.名称}</DrawerHeader>
        <DrawerBody display="flex" flexDirection="column" gap={componentSpacing}>
          {landmark.定义}
          <Text>你认为你的{landmark.名称}处于以下哪个阶段？（单选）</Text>
          <RadioGroup onChange={setValue} value={value}>
            <Stack direction="column">
              {landmark.层级.map((level, index) => (
                <Radio key={index} value={String(index)} alignItems="flex-start">
                  {level}
                </Radio>
              ))}
            </Stack>
          </RadioGroup>
          <Button width="20%" alignSelf="center">提交</Button>     
        </DrawerBody>
      </DrawerContent>
    </Drawer>;
  };
