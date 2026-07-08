import { ChevronRightIcon } from "@chakra-ui/icons";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbProps,
  Heading,
} from "@chakra-ui/react";
import Link from "next/link";
import T from "./T";

export const pageBreadcrumbMarginBottom = 8;

export default function PageBreadcrumb({
  current,
  parents,
  ...rest
}: {
  current: string;
  parents?: { name: string; link: string }[];
} & BreadcrumbProps) {
  const parentItems = parents?.map((p) => (
    <BreadcrumbItem key={p.link}>
      <BreadcrumbLink as={Link} href={p.link}>
        <Heading size="md">
          <T>{p.name}</T>
        </Heading>
      </BreadcrumbLink>
    </BreadcrumbItem>
  ));
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
