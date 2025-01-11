import {
  CardProps
} from '@chakra-ui/react';
import { Card } from '@chakra-ui/react';

export function CardForDesktop({ children, ...cardProps }: CardProps) {
  return <Card
    overflow="hidden"
    {...cardProps}
  >
    {children}
  </Card>;
}

export function CardForMobile({ children, ...cardProps }: CardProps) {
  return <Card
    overflow="hidden"
    size="sm"
    boxShadow="sm"
    {...cardProps}
  >
    {children}
  </Card>;
}
