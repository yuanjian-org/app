import { Th, Td, Link } from "@chakra-ui/react";
import trpc from "trpc";
import ModalWithCloseButton from "./ModalWithCloseButton";
import UserSelector from "./UserSelector";
import { useState } from "react";
import { formatUserName } from "shared/strings/formatUserName";
import { MdEdit } from "react-icons/md";
import { Calibration as SharedCalibration } from "shared/Calibration";
import T from "components/T";

export function CalibrationManagerHeaderCells() {
  return (
    <Th>
      <T>面试主管</T>
    </Th>
  );
}

export function CalibrationManagerCells({
  calibration,
  refetch,
}: {
  calibration: SharedCalibration;
  refetch: () => void;
}) {
  const [editing, setEditing] = useState<boolean>(false);
  return (
    <>
      {editing && (
        <ManagerEditor
          calibration={calibration}
          onClose={() => setEditing(false)}
          refetch={refetch}
        />
      )}

      <Td>
        <Link onClick={() => setEditing(true)}>
          {calibration.manager ? (
            formatUserName(calibration.manager.name)
          ) : (
            <MdEdit />
          )}
        </Link>
      </Td>
    </>
  );
}

function ManagerEditor({
  calibration,
  refetch,
  onClose,
}: {
  calibration: SharedCalibration;
  refetch: () => void;
  onClose: () => void;
}) {
  const saveManager = async (managerIds: string[]) => {
    const managerId = managerIds.length > 0 ? managerIds[0] : null;
    await trpc.calibrations.setManager.mutate({
      calibrationId: calibration.id,
      managerId,
    });
    refetch();
  };

  return (
    <ModalWithCloseButton
      onClose={onClose}
      title={
        <>
          {calibration.name}
          <T>的面试主管</T>
        </>
      }
    >
      <UserSelector
        initialValue={calibration.manager ? [calibration.manager] : []}
        onSelect={saveManager}
      />
    </ModalWithCloseButton>
  );
}
