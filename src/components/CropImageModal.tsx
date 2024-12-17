import { 
  Button, 
  ModalBody,
  ModalCloseButton, 
  ModalContent, 
  ModalFooter,
  ModalHeader,
  Flex,
  Box,
} from "@chakra-ui/react";
import { useState } from "react";
import { componentSpacing } from "theme/metrics";
import ModalWithBackdrop from "./ModalWithBackdrop";
import Cropper from 'react-easy-crop';
import { UserProfile } from "shared/UserProfile";

export function CropImageModal({ imageUrl, onClose, onSave, imageParams } : {
  imageUrl: string,
  onClose: () => void,
  onSave: (x: number, y: number, zoom: number) => void,
  imageParams: UserProfile['照片参数']
}) {
  const initialX = imageParams?.x ?? 0;
  const initialY = imageParams?.y ?? 0;
  const initialZoom = imageParams?.zoom ?? 1; 
  const [crop, setCrop] = useState({ x: initialX, y: initialY });
  const [zoom, setZoom] = useState(initialZoom);

  const save = () => {
    onSave(crop.x, crop.y, zoom);
    onClose();
  };

  return <ModalWithBackdrop isOpen onClose={onClose}>
    <ModalContent>
      <ModalHeader>修改图像</ModalHeader>
      <ModalCloseButton/>
      <ModalBody>
        <Box
          width="300px"
          height="300px"
          position="relative"
          overflow="hidden"
        >
           <Cropper 
              objectFit="contain"
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              aspect={1 / 1}
              cropSize={{ width: 300, height: 300 }}
            />
        </Box>
      </ModalBody>
      <ModalFooter>
        <Flex gap={componentSpacing}>
          <Button onClick={save} variant="brand">保存</Button>
          <Button onClick={onClose}>关闭</Button>
        </Flex>
      </ModalFooter>
    </ModalContent>
  </ModalWithBackdrop>;
};
