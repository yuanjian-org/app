import {
  CardProps
} from '@chakra-ui/react';
import { Card } from '@chakra-ui/react';

export function CardForDesktop({ children, ...rest }: CardProps) {
  return <Card
    overflow="hidden"
    {...rest}
  >
    {children}
  </Card>;
}

export function CardForMobile({ children, ...rest }: CardProps) {
  return <Card
    overflow="hidden"
    size="sm"
    boxShadow="sm"
    {...rest}
  >
    {children}
  </Card>;
}
