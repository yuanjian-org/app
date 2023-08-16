import { CheckIcon, RepeatIcon, WarningIcon } from '@chakra-ui/icons';
import { Center, CenterProps, Text } from '@chakra-ui/react';
import React, { useEffect } from 'react';
import invariant from "tiny-invariant";
import { motion } from "framer-motion";
import { useRouter } from 'next/router';

export default function AutosaveIndicator({ state, ...rest }: CenterProps & {
  state: AutosaveState,
}) {
  const errors = [...state.id2state.values()].filter(v => v !== null);
  const iconProps = { boxSize: 3.5, marginRight: 2, };
  return hasPendingSavers(state) ? <>
    <LeavePagePrompt />
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <Center {...rest}>
        {errors.length > 0 ?
          <><WarningIcon {...iconProps} color="red"/><Text fontSize="sm" color="red">{errors[0].toString()}</Text></>
          :
          <><RepeatIcon {...iconProps} color="disabled"/><Text fontSize="sm" color="disabled">保存中...</Text></>
        }
      </Center>
    </motion.div>
  </> : state.virgin ? null : 
    <motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 3 }}>
      <Center {...rest}>
        <CheckIcon {...iconProps} color="green" /><Text fontSize="sm" color="green">已保存</Text>
      </Center>
    </motion.div>;
}

/**
 * Reference: https://stackoverflow.com/a/70841409
 */
function LeavePagePrompt() {
  const router = useRouter();
  useEffect(() => {
    const warningText = "正在保存中。确定离开当前页面？";
    const handleWindowClose = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      return (e.returnValue = warningText);
    };
    const handleBrowseAway = () => {
      if (window.confirm(warningText)) return;
      router.events.emit('routeChangeError');
      throw 'routeChange aborted.';
    };
    window.addEventListener('beforeunload', handleWindowClose);
    router.events.on('routeChangeStart', handleBrowseAway);
    return () => {
      window.removeEventListener('beforeunload', handleWindowClose);
      router.events.off('routeChangeStart', handleBrowseAway);
    };
  }, [router]);

  return null;
}

export type AutosaveState = {
  // A map from pending saver ids to either null or an object. The former means the saver is ongoing without errors.
  // The latter means the saver experienced an error.
  id2state: Map<string, null | any>,
  // true if.f. any saves happened in the past.
  virgin: boolean,
}

// TODO: make a read only map
export const initialState: AutosaveState = {
  id2state: new Map<string, any>(),
  virgin: true,
};

function hasPendingSaver(s: AutosaveState, id: string): boolean {
  return s.id2state.has(id);
}

function hasPendingSavers(s: AutosaveState): boolean {
  return s.id2state.size > 0;
}

/**
 * @param id identifies an Autosaver component
 */
export function addPendingSaver(s: AutosaveState, id: string): AutosaveState {
  if (hasPendingSaver(s, id)) return s;
  const ret = structuredClone(s);
  ret.id2state.set(id, null);
  ret.virgin = false;
  return ret;
}

/**
 * @param id identifies an Autosaver component
 */
export function removePendingSaver(s: AutosaveState, id: string): AutosaveState {
  invariant(hasPendingSaver(s, id));
  const ret = structuredClone(s);
  ret.id2state.delete(id);
  return ret;
}

/**
 * @param id identifies an Autosaver component
 */
export function setPendingSaverError(s: AutosaveState, id: string, error?: any): AutosaveState {
  invariant(hasPendingSaver(s, id));
  const ret = structuredClone(s);
  ret.id2state.set(id, error ?? null);
  return ret;
}
