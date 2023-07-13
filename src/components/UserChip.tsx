import { Avatar, HStack, Text } from '@chakra-ui/react';
import React from 'react';
import { MinUserProfile } from 'shared/UserProfile';

export default function UserChip(props: {
  user: MinUserProfile;
}) {
  return <HStack>
    <Avatar name={props.user.name || undefined} boxSize={10} />
    <Text>{props.user.name}</Text>
  </HStack>;
}
