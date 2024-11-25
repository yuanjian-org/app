import {
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalCloseButton,
  Button,
  Flex,
  Box,
} from "@chakra-ui/react";
import ModalWithBackdrop from "./ModalWithBackdrop";
import { componentSpacing } from "theme/metrics";
import { useState } from 'react';
import Cropper from 'react-easy-crop';

export function CropImageModal({ onClose, imageUrl, onSave } : {
  onClose: () => void,
  imageUrl?: string,
  onSave: (x: number, y: number, zoom: number) => void,
 }) {
  const [crop, setCrop] = useState<{x: number, y: number}>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(2);

  const handleSave = () => {
    onSave(crop.x, crop.y, zoom); 
    onClose(); 
  };

  return <ModalWithBackdrop isOpen onClose={onClose}>
    <ModalContent>
      <ModalHeader>修改图像</ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        {imageUrl && 
          <Box 
            overflow="hidden"
            position="relative" 
            height="400px"
          >
            <Cropper 
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={1}
              objectFit="contain"
              onCropChange={setCrop}
              onZoomChange={setZoom}
              cropSize={{ width: 300, height: 300 }}
            />
          </Box>
        }
      </ModalBody>
      <ModalFooter>
        <Flex gap={componentSpacing}>
          <Button onClick={handleSave}>保存</Button>
          <Button onClick={onClose}>关闭</Button>
        </Flex>
      </ModalFooter>
    </ModalContent>
  </ModalWithBackdrop>;
}
