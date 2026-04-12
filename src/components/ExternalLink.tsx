import { Link, LinkProps } from "@chakra-ui/react";
import React from "react";

export const ExternalLink = React.forwardRef<HTMLAnchorElement, LinkProps>(
  (props, ref) => {
    return <Link isExternal ref={ref} {...props} />;
  },
);

ExternalLink.displayName = "ExternalLink";
