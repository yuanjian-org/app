import { Avatar, HStack, Text } from '@chakra-ui/react';
import React from 'react';
import { MinUser } from 'shared/User';
import { formatUserName } from 'shared/strings';

export default function UserChip({ user }: {
  user: MinUser;
}) {
  const name = formatUserName(user.name);
  return <HStack>
    <Avatar name={name} boxSize={10} />
    <Text>{name}</Text>
  </HStack>;
}
