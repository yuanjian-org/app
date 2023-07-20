import { Avatar, HStack, Text } from '@chakra-ui/react';
import React from 'react';
import { MinUser } from 'shared/User';

export default function UserChip(props: {
  user: MinUser;
}) {
  return <HStack>
    <Avatar name={props.user.name || undefined} boxSize={10} />
    <Text>{props.user.name}</Text>
  </HStack>;
}
