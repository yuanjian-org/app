import {
  Avatar,
  Button,
  HStack,
  Icon,
  Spacer,
  Text,
  Textarea,
  TextareaProps,
  VStack,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import { ChatMessage } from 'shared/ChatMessage';
import { componentSpacing, paragraphSpacing } from 'theme/metrics';
import trpc, { trpcNext } from 'trpc';
import { formatUserName, prettifyDate } from 'shared/strings';
import moment from 'moment';
import { MdEdit, MdSend } from 'react-icons/md';
import { useUserContext } from 'UserContext';
import { AddIcon } from '@chakra-ui/icons';
import invariant from "tiny-invariant";
import Loader from './Loader';
import MarkdownStyler from './MarkdownStyler';

export default function Room({
  menteeId,
  setTextChange,
}: {
  menteeId: string,
  setTextChange: (status: boolean) => void
}) {
  const { data: room } = trpcNext.chat.getRoom.useQuery({ menteeId });

  return !room ? <Loader /> :
    <VStack spacing={paragraphSpacing * 1.5} align="start">
      <MessageCreator roomId={room.id} setTextChange={setTextChange} />

      {room.messages.sort((a, b) => moment(a.updatedAt)
        .isAfter(moment(b.updatedAt)) ? -1 : 1)
        .map((m) => <Message key={m.id} message={m} setTextChange={setTextChange} />)
      }
    </VStack>;
}

function MessageCreator({
  roomId,
  setTextChange,
}: {
  roomId: string;
  setTextChange: (status: boolean) => void;
}) {
  const [editing, setEditing] = useState<boolean>(false);

  return editing ?
    <Editor roomId={roomId} onClose={() => setEditing(false)}
            setTextChange={setTextChange} marginTop={componentSpacing}
    />
    :
    <Button variant="outline" leftIcon={<AddIcon />}
      onClick={() => setEditing(true)}>新消息</Button>;

}

function Message({
  message: m,
  setTextChange,
}: {
  message: ChatMessage;
  setTextChange: (status: boolean) => void;
}) {
  const [user] = useUserContext();
  const name = formatUserName(m.user.name);
  const [editing, setEditing] = useState<boolean>(false);

  return <HStack align="top" spacing={componentSpacing} width="100%">
    <Avatar name={name} boxSize={10} />
    <VStack align="start" width="100%">
      <HStack minWidth="210px" spacing={componentSpacing}>
        <Text>{name}</Text>
        <Text color="grey">
          {m.createdAt && `${prettifyDate(m.createdAt)}创建`}
          {m.updatedAt && m.updatedAt !== m.createdAt && ` ｜ ${prettifyDate(m.updatedAt)}更新`}
        </Text>

        {!editing && user.id == m.user.id && <>
          <Spacer />
          <Icon as={MdEdit} cursor="pointer" onClick={() => setEditing(true)} />
        </>}
      </HStack>

      {editing ? <Editor message={m} onClose={() => setEditing(false)}
                         setTextChange={setTextChange}
        /> :
        <MarkdownStyler content={m.markdown} />
      }
      </VStack>
    </HStack>;
}

function Editor({
  roomId,
  message,
  onClose,
  setTextChange,
  ...rest
}: {
  roomId?: string; // create a new message when specified
  message?: ChatMessage; // must be specified iff. roomId is undefined
  onClose: Function;
  setTextChange: Function;
} & TextareaProps) {
  const [markdown, setMarkdown] = useState<string>(
      message ? message.markdown : "");
  const [saving, setSaving] = useState<boolean>(false);
  const utils = trpcNext.useContext();

  const save = async () => {
    setSaving(true);
    try {
      if (message) {
        invariant(!roomId);
        await trpc.chat.updateMessage.mutate({ messageId: message.id, markdown });
      } else {
        invariant(roomId);
        await trpc.chat.createMessage.mutate({ roomId, markdown });
      }
      await utils.chat.getRoom.invalidate();
      onClose();
    } finally {
      // need to anyway set it to false, even if save failed
      setSaving(false);
      setTextChange(false);
    }
  };

  return <>
    <Textarea value={markdown} onChange={(e) => {
      setTextChange(true);
      setMarkdown(e.target.value);}
    }
        autoFocus background="white" height={200} {...rest}
    />
    <HStack>
      <Button onClick={save} isLoading={saving} isDisabled={!markdown}
        variant="brand" leftIcon={<Icon as={MdSend} />}
      >
        确认
      </Button>
      <Button onClick={() => {
        setTextChange(false);
        onClose();
      }}
          variant="ghost" color="grey"
      >取消</Button>
    </HStack>
  </>;
}
