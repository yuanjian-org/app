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
import invariant from 'tiny-invariant';
import Loader from './Loader';
import MarkdownStyler from './MarkdownStyler';
import { useRouter } from 'next/router';

export default function Room({
  menteeId,
  savedChanged,
}: {
  menteeId: string;
  savedChanged: (status: boolean) => void;
}) {
  const { data: room } = trpcNext.chat.getRoom.useQuery({ menteeId });

  return !room ? (
    <Loader />
  ) : (
    <VStack spacing={paragraphSpacing * 1.5} align="start">
      <MessageCreator
        roomId={room.id}
        savedChanged={(status) => savedChanged(status)}
      />

      {room.messages
        .sort((a, b) =>
          moment(a.updatedAt).isAfter(moment(b.updatedAt)) ? -1 : 1
        )
        .map((m) => (
          <Message
            key={m.id}
            message={m}
            savedChanged={(status: boolean) => savedChanged(status)}
          />
        ))}
    </VStack>
  );
}

function MessageCreator({
  roomId,
  savedChanged,
}: {
  roomId: string;
  savedChanged: (status: boolean) => void;
}) {
  const [editing, setEditing] = useState<boolean>(false);

  return editing ? (
    <Editor
      roomId={roomId}
      onClose={() => setEditing(false)}
      savedChanged={(status: boolean) => savedChanged(status)}
      marginTop={componentSpacing}
    />
  ) : (
    <Button
      variant="outline"
      leftIcon={<AddIcon />}
      onClick={() => {
        savedChanged(true);
        setEditing(true);
      }}
    >
      新消息
    </Button>
  );
}

function Message({
  message: m,
  savedChanged,
}: {
  message: ChatMessage;
  savedChanged: (status: boolean) => void;
}) {
  const [user] = useUserContext();
  const name = formatUserName(m.user.name);
  const [editing, setEditing] = useState<boolean>(false);

  return (
    <HStack align="top" spacing={componentSpacing} width="100%">
      <Avatar name={name} boxSize={10} />
      <VStack align="start" width="100%">
        <HStack minWidth="210px" spacing={componentSpacing}>
          <Text>{name}</Text>
          <Text color="grey">
            {m.updatedAt && prettifyDate(m.updatedAt)}
            {m.updatedAt !== m.createdAt && "更新"}
          </Text>

          {!editing && user.id == m.user.id && (
            <>
              <Spacer />
              <Icon
                as={MdEdit}
                cursor="pointer"
                onClick={() => {
                  savedChanged(true);
                  setEditing(true);
                }}
              />
            </>
          )}
        </HStack>

        {editing ? (
          <Editor
            message={m}
            onClose={() => setEditing(false)}
            savedChanged={(status: boolean) => savedChanged(status)}
          />
        ) : (
          <MarkdownStyler content={m.markdown} />
        )}
      </VStack>
    </HStack>
  );
}

function Editor({
  roomId,
  message,
  onClose,
  savedChanged,
  ...rest
}: {
  roomId?: string; // create a new message when specified
  message?: ChatMessage; // must be specified iff. roomId is undefined
  onClose: Function;
  savedChanged: Function;
} & TextareaProps) {
  const [markdown, setMarkdown] = useState<string>(
    message ? message.markdown : ""
  );
  const [saving, setSaving] = useState<boolean>(false);
  const utils = trpcNext.useContext();

  const save = async () => {
    setSaving(true);
    try {
      if (message) {
        invariant(!roomId);
        await trpc.chat.updateMessage.mutate({
          messageId: message.id,
          markdown,
        });
      } else {
        invariant(roomId);
        await trpc.chat.createMessage.mutate({ roomId, markdown });
      }
      await utils.chat.getRoom.invalidate();
      onClose();
    } finally {
      setSaving(false);
      savedChanged(false);
    }
  };

  return (
    <>
      <Textarea
        value={markdown}
        onChange={(e) => {
          setMarkdown(e.target.value);
        }}
        autoFocus
        background="white"
        height={200}
        {...rest}
      />
      <HStack>
        <Button
          onClick={save}
          isLoading={saving}
          isDisabled={!markdown}
          variant="brand"
          leftIcon={<Icon as={MdSend} />}
        >
          确认
        </Button>
        <Button
          onClick={() => {
            savedChanged(false);
            onClose();
          }}
          variant="ghost"
          color="grey"
        >
          取消
        </Button>
      </HStack>
    </>
  );
}
