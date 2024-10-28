import { ChevronRightIcon } from "@chakra-ui/icons";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbProps, Heading } from "@chakra-ui/react";
import Link from "next/link";

export const pageBreadcrumbMarginBottom = 8;

export default function PageBreadcrumb({ current, parents, ...rest } : {
  current: string,
  parents?: { name: string, link: string }[],
} & BreadcrumbProps) {
  const parentItems = parents?.map(p => (
    <BreadcrumbItem key={p.link}>
      <BreadcrumbLink as={Link} href={p.link}>
        <Heading size="md" color="gray.600">{p.name}</Heading>
      </BreadcrumbLink>
    </BreadcrumbItem>
  ));
  return <Breadcrumb 
    separator={<ChevronRightIcon />} 
    marginBottom={pageBreadcrumbMarginBottom}
    {...rest}
  >
    {parentItems}
    <BreadcrumbItem isCurrentPage>
      <BreadcrumbLink>
        <Heading size="md" color="gray.600">{current}</Heading>
      </BreadcrumbLink>
    </BreadcrumbItem>
  </Breadcrumb>;
}
