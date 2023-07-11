import { CheckIcon, RepeatIcon } from '@chakra-ui/icons';
import { Center, CenterProps, Text } from '@chakra-ui/react';
import React from 'react';
import invariant from "tiny-invariant";
import { motion } from "framer-motion";

export default function AutosaveIndicator({ state, ...rest }: CenterProps & {
  state: AutosaveState,
}) {
  const iconProps = {
    boxSize: 3.5,
    marginRight: 2,
  }
  return state.pendings.length ? 
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <Center {...rest}>
        <RepeatIcon {...iconProps} /><Text fontSize="sm">保存中...</Text>
      </Center>
    </motion.div>
    :
    <motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 3 }}>
      <Center {...rest}>
        <CheckIcon {...iconProps} color="green" /><Text fontSize="sm" color="green">已保存</Text>
      </Center>
    </motion.div>;
}

export interface AutosaveState {
  pendings: string[],
};

export const initialState: AutosaveState = {
  pendings: [],
};

/**
 * @param id identifies an Autosaver component
 */
export function addPendingSaver(s: AutosaveState, id: string): AutosaveState {
  if (s.pendings.includes(id)) return s;
  return {
    pendings: [...s.pendings, id],
  };
}

/**
 * @param id identifies an Autosaver component
 */
export function removePendingSaver(s: AutosaveState, id: string): AutosaveState {
  invariant(s.pendings.includes(id));
  return {
    pendings: s.pendings.filter(p => p !== id),
  }
}
