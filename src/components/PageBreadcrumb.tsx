import { ChevronRightIcon } from "@chakra-ui/icons";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbProps,
  Heading,
  Icon,
} from "@chakra-ui/react";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import T from "./T";

export const pageBreadcrumbMarginBottom = 8;

export default function PageBreadcrumb({
  current,
  parents,
  showBackArrow,
  ...rest
}: {
  current: string;
  parents?: { name: string; link: string }[];
  showBackArrow?: boolean;
} & BreadcrumbProps) {
  const parentItems = parents?.map((p, idx) => {
    const hasArrow = showBackArrow && idx === 0;
    return (
      <BreadcrumbItem key={p.link}>
        <BreadcrumbLink as={Link} href={p.link}>
          <Heading
            size="md"
            display={hasArrow ? "flex" : undefined}
            alignItems={hasArrow ? "center" : undefined}
            gap={hasArrow ? 1.5 : undefined}
          >
            {hasArrow && <Icon as={FiArrowLeft} boxSize="18px" />}
            <T>{p.name}</T>
          </Heading>
        </BreadcrumbLink>
      </BreadcrumbItem>
    );
  });
  return (
    <Breadcrumb
      separator={<ChevronRightIcon />}
      marginBottom={pageBreadcrumbMarginBottom}
      {...rest}
    >
      {parentItems}
      <BreadcrumbItem isCurrentPage>
        <BreadcrumbLink>
          <Heading size="md">
            <T>{current}</T>
          </Heading>
        </BreadcrumbLink>
      </BreadcrumbItem>
    </Breadcrumb>
  );
}
