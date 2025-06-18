import { Avatar, HStack, Link, Text } from '@chakra-ui/react';
import { getUserUrl, MinUser } from 'shared/User';
import { formatUserName } from 'shared/strings';
import NextLink from 'next/link';
import { useMyId } from 'useMe';

/**
 * UserChip := The user's avatar icon + UserLink
 */
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
  return <Link as={NextLink} href={getUserUrl(user)} target="_blank">
    <UserName user={user} />
  </Link>;
}

export function UserName({ user }: { user: MinUser }) {
  const myId = useMyId();
  return <>{myId === user.id ? "我" : formatUserName(user.name)}</>;
}

export function MenteeLink({ user }: {
  user: MinUser,
}) {
  return <Link as={NextLink} href={`/mentees/${user.id}`} target="_blank">
    {formatUserName(user.name, "formal")}
  </Link>;
}
