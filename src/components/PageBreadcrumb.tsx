import { ChevronRightIcon } from "@chakra-ui/icons";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, Heading } from "@chakra-ui/react";
import Link from "next/link";

export default function PageBreadcrumb(props: {
  current: string,
  parents: { name: string, link: string }[],
}) {
  const parents = props.parents.map(p => (
    <BreadcrumbItem key={p.link}>
      <BreadcrumbLink as={Link} href={p.link}><Heading size="md">{p.name}</Heading></BreadcrumbLink>
    </BreadcrumbItem>
  ));
  return <Breadcrumb separator={<ChevronRightIcon />}>
    {parents}
    <BreadcrumbItem isCurrentPage>
      <BreadcrumbLink><Heading size="md">{props.current}</Heading></BreadcrumbLink>
    </BreadcrumbItem>
  </Breadcrumb>;
}
