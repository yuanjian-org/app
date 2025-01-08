import { 
  Button, 
  ModalBody,
  ModalCloseButton, 
  ModalContent, 
  ModalFooter,
  ModalHeader,
  Flex,
  Box,
  Text,
} from "@chakra-ui/react";
import { useState } from "react";
import { componentSpacing } from "theme/metrics";
import ModalWithBackdrop from "./ModalWithBackdrop";
import Cropper from 'react-easy-crop';
import { UserProfile } from "shared/UserProfile";

export function CropImageModal({ imageUrl, onClose, updateImageParams, imageParams } : {
  imageUrl: string,
  onClose: () => void,
  updateImageParams: (x: number, y: number, zoom: number) => void,
  imageParams: UserProfile['照片参数'],
}) {
  const initialX = imageParams?.x ?? 0;
  const initialY = imageParams?.y ?? 0;
  const initialZoom = imageParams?.zoom ?? 1; 
  const [crop, setCrop] = useState({ x: initialX, y: initialY });
  const [zoom, setZoom] = useState(initialZoom);

  const onSave = () => {
    updateImageParams(crop.x, crop.y, zoom);
    onClose();
  };  

  return <ModalWithBackdrop isOpen onClose={onClose}>
    <ModalContent>
      <ModalHeader>剪裁照片</ModalHeader>
      <ModalCloseButton/>
      <ModalBody
        display="flex" 
        flexDirection="column" 
        alignItems="center" 
        justifyContent="center"
        gap={componentSpacing}
      >
        <Box
          width="300px"
          height="300px"
          position="relative"
          border="1px solid black"
        >
          <Cropper
            objectFit="contain"
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            showGrid={true}
            aspect={1 / 1}
            cropSize={{ width: 300, height: 300 }}
          />;
        </Box>
        <input
          type="range"
          value={zoom}
          min={1}
          max={10}
          step={0.1}
          onChange={ e => setZoom(Number(e.target.value)) }
          style={{ width: '300px' }}
        /> 
        <Text textAlign="center">使用滑块来调整图片的缩放比例，上下左右拖动图片至满意的位
          置，确保图片至少填满裁剪框</Text>
        <ModalFooter width="100%">
          <Flex gap={componentSpacing}>
            <Button onClick={onSave} variant="brand">保存</Button>
            <Button onClick={onClose}>取消</Button>
          </Flex>
        </ModalFooter>
      </ModalBody>
    </ModalContent>
  </ModalWithBackdrop>;
};
