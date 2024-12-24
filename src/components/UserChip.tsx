import { Avatar, HStack, Link, Text } from '@chakra-ui/react';
import React from 'react';
import { getUserUrl, MinUser } from 'shared/User';
import { formatUserName } from 'shared/strings';
import NextLink from 'next/link';
import { useUserContext } from 'UserContext';

export default function UserChip({ user }: {
  user: MinUser;
}) {
  const name = formatUserName(user.name);
  return <HStack>
    <Avatar name={name} boxSize={10} />
    <Text>{name}</Text>
  </HStack>;
}

export function UserLink({ user }: { user: MinUser }) {
  const [me] = useUserContext();
  return <Link as={NextLink} href={getUserUrl(user)} target="_blank">
    {me.id === user.id ? "我" : formatUserName(user.name, "formal")}
  </Link>;
}
