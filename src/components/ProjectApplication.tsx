import { Flex } from "@chakra-ui/react";
import { sectionSpacing } from "theme/metrics";
import { FieldRow } from "./FieldRow";
import { projectApplicationFields } from "shared/applicationFields";

export function ProjectApplication({
  application,
}: {
  application: Record<string, any>;
}) {
  return (
    <Flex direction="column" gap={sectionSpacing}>
      {projectApplicationFields.map((f) => {
        if (f.name in application) {
          return (
            <FieldRow
              readonly
              key={f.name}
              name={f.name}
              value={application[f.name]}
            />
          );
        }
      })}
    </Flex>
  );
}
