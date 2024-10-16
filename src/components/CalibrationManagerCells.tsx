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
import { MinUser } from "shared/User";
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
    const [ editing, setEditing ] = useState<boolean>(false);
    return <>
      {editing && <ManagerEditor calibration={calibration} 
        manager={calibration.manager}
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

function ManagerEditor({ calibration, manager, refetch, onClose } : {
    calibration: SharedCalibration,
    manager: MinUser | null,
    refetch: () => void,
    onClose: () => void,
 }) {
    const saveManager = async (managerIds: string[]) => {
        if (managerIds.length == 0) return;
        await trpc.calibrations.setManager.mutate({
            id: calibration.id,
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
                    initialValue={manager ? [manager] : []} 
                    onSelect={saveManager} 
                />
            </ModalBody>
            <ModalFooter>
                <Button onClick={onClose}>关闭</Button>
            </ModalFooter>
        </ModalContent>

    </ModalWithBackdrop>;
}
