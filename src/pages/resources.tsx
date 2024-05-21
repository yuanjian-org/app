import {
  Text,
} from '@chakra-ui/react';
import React from 'react';
import { useUserContext } from "../UserContext";
import { isPermitted } from 'shared/Role';
import { fullPage } from 'AppPage';

export default fullPage(() => {
  const [user] = useUserContext();
  if (!isPermitted(user.roles, ["Mentee", "Mentor", "MentorCoach"])) {
    return <Text>无权查看本页。</Text>;
  }

  return <iframe src="https://ziyuan.super.site" width="100%" height="700px" />;
});
