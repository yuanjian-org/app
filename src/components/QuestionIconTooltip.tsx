import React from 'react';
import { QuestionIcon } from "@chakra-ui/icons";
import { Tooltip, TooltipProps } from "@chakra-ui/react";

export default function QuestionIconTooltip({ label }: { label: string }) {
  return <Tooltip label={label}>
    <QuestionIcon color="gray" marginStart={2} />
  </Tooltip>;
}
