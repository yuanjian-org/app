import { Grid, GridItem, GridProps } from "@chakra-ui/react";
import { componentSpacing } from "theme/metrics";
import { breakpoint } from "theme/breakpoints";
import PageBreadcrumb from "components/PageBreadcrumb";

/**
 * A Section is a Grid with 5 columns on desktop and 2 columns on mobile.
 * It's children must only be a list of GridItems.
 */
export default function LandingPageSection({
  header,
  children,
  ...rest
}: {
  header: string;
} & GridProps) {
  return (
    <Grid
      gap={componentSpacing}
      templateColumns={{
        base: "repeat(2, 1fr)",
        [breakpoint]: "repeat(5, 1fr)",
      }}
      {...rest}
    >
      <GridItem colSpan={{ base: 2, [breakpoint]: 5 }}>
        <PageBreadcrumb current={header} />
      </GridItem>
      {children}
    </Grid>
  );
}
