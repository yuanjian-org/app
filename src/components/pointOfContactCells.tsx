import {
  Th,
  Td,
  Link,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import { MdEdit } from 'react-icons/md';
import User, { MinUser } from 'shared/User';
import { formatUserName } from 'shared/strings';
import ModalWithBackdrop from './ModalWithBackdrop';
import UserSelector from './UserSelector';
import trpc from 'trpc';
import EditableWithIconOrLink from './EditableWithIconOrLink';

export function PointOfContactHeaderCells() {
  return <>
    <Th>联络人</Th>
    <Th>备注</Th>
  </>;
}

export function PointOfContactCells({ user, refetch } : {
  user: User,
  refetch: () => void,
}) {
  const [ editing, setEditing ] = useState<boolean>(false);

  const savePoCNote = async (note: string) => {
    await trpc.users.setPointOfContactAndNote.mutate({
      userId: user.id,
      pocNote: note,
    });
    refetch();
  };

  return <>
    {editing && <PoCEditor user={user} poc={user.pointOfContact}
      onClose={() => setEditing(false)} refetch={refetch} />}

    {/* PoC */}
    <Td><Link onClick={() => setEditing(true)}>
      {user.pointOfContact ?
        formatUserName(user.pointOfContact.name)
        :
        <MdEdit />
      }
    </Link></Td>

    {/* PoC notes */}
    <Td>
      <EditableWithIconOrLink editor="input" decorator="link"
        defaultValue={user.pointOfContactNote || ""}
        onSubmit={savePoCNote} />
    </Td>
  </>;
}

function PoCEditor({ user, poc, refetch, onClose } : {
  user: MinUser,
  poc: MinUser | null,
  refetch: () => void,
  onClose: () => void,
}) {
  const savePoC = async (pocIds: string[]) => {
    // TODO: allow removing PoC
    if (pocIds.length == 0) return;
    await trpc.users.setPointOfContactAndNote.mutate({
      userId: user.id,
      pocId: pocIds[0],
    });
    refetch();
  };

  return <ModalWithBackdrop isOpen onClose={onClose}>
    <ModalContent>
      <ModalHeader>{formatUserName(user.name)}的联络人</ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <UserSelector initialValue={poc ? [poc] : []} onSelect={savePoC} />
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>关闭</Button>
      </ModalFooter>
    </ModalContent>
  </ModalWithBackdrop>;
}