import {
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalCloseButton,
  Button,
  Th,
  Td,
  Link,
} from "@chakra-ui/react";
import trpc from "trpc";
import ModalWithBackdrop from "./ModalWithBackdrop";
import UserSelector from "./UserSelector";
import { useState } from "react";
import { formatUserName } from "shared/strings";
import { MdEdit } from 'react-icons/md';
import { Calibration as SharedCalibration } from 'shared/Calibration';

export function CalibrationManagerHeaderCells() {
  return <>
    <Th>面试主管</Th>
  </>;
}

export function CalibrationManagerCells({ calibration, refetch }: {
  calibration: SharedCalibration,
  refetch: () => void,
}) {
  const [editing, setEditing] = useState<boolean>(false);
  return <>
    {editing && <ManagerEditor calibration={calibration} 
      onClose={() => setEditing(false)} refetch={refetch} />}

    <Td><Link onClick={() => setEditing(true)}>
      {calibration.manager ?
        formatUserName(calibration.manager.name)
        :
        <MdEdit />
      }
    </Link></Td>
  </>;
}

function ManagerEditor({ calibration, refetch, onClose } : {
  calibration: SharedCalibration,
  refetch: () => void,
  onClose: () => void,
 }) {
  const saveManager = async (managerIds: string[]) => {
    if (managerIds.length == 0) return;
    await trpc.calibrations.setManager.mutate({
      calibrationId: calibration.id,
      managerId: managerIds[0],
    });
    refetch();
  };

  return <ModalWithBackdrop isOpen onClose={onClose}>
    <ModalContent>
      <ModalHeader>{calibration.name}的面试主管</ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <UserSelector
          initialValue={calibration.manager ? [calibration.manager] : []} 
          onSelect={saveManager}
        />
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>关闭</Button>
      </ModalFooter>
    </ModalContent>

  </ModalWithBackdrop>;
}
