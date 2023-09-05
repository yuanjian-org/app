import { Guard } from '@authing/guard-react18';
import browserEnv from "browserEnv";

const guard = new Guard({ 
  appId: browserEnv.NEXT_PUBLIC_AUTHING_APP_ID,
  redirectUri: typeof window !== 'undefined' ? (location.origin + '/callback') : '',
});

export default guard;
