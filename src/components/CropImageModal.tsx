import {
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalCloseButton,
  Button,
  Image,
  Flex,
} from "@chakra-ui/react";
import ModalWithBackdrop from "./ModalWithBackdrop";
import ReactCrop, { type Crop } from 'react-image-crop';
import { useState } from "react";
import { componentSpacing } from "theme/metrics";

export function CropImageModal({ onClose, imageUrl } : {
  onClose: () => void,
  imageUrl?: string,
 }) {
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    x: 25,
    y: 25,
    width: 50,
    height: 50,
  });

  return <ModalWithBackdrop isOpen onClose={onClose}>
    <ModalContent>
      <ModalHeader>修改图像</ModalHeader>
      <ModalCloseButton />
      <ModalBody>
      {imageUrl &&    
        <ReactCrop crop={crop} onChange={c => setCrop(c)}>
          <Image src={imageUrl} alt="照片" />
        </ReactCrop>
      }
      </ModalBody>
      <ModalFooter>
        <Flex gap={componentSpacing}>
          <Button>保存</Button>
          <Button onClick={onClose}>关闭</Button>
        </Flex>
      </ModalFooter>
    </ModalContent>

  </ModalWithBackdrop>;
}
