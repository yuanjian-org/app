import { Avatar, HStack, Link, Text } from '@chakra-ui/react';
import { getUserUrl, MinUser } from 'shared/User';
import { formatUserName } from 'shared/strings';
import NextLink from 'next/link';
import { useMyId } from 'useMe';

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
  const myId = useMyId();
  return <Link as={NextLink} href={getUserUrl(user)} target="_blank">
    {myId === user.id ? "我" : formatUserName(user.name, "formal")}
  </Link>;
}

export function MenteeLink({ user }: {
  user: MinUser,
}) {
  return <Link as={NextLink} href={`/mentees/${user.id}`} target="_blank">
    {formatUserName(user.name, "formal")}
  </Link>;
}
