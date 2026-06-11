import { Flex } from "@chakra-ui/react";
import { sectionSpacing } from "theme/metrics";
import { FieldRow } from "./FieldRow";
import { projectApplicationFields } from "shared/applicationFields";
import { ContactFieldRow } from "./ContactFieldRow";

export function ProjectApplication({
  application,
  sex,
  wechat,
}: {
  application: Record<string, any>;
  sex?: string;
  wechat?: string;
}) {
  return (
    <Flex direction="column" gap={sectionSpacing}>
      {sex && <FieldRow name="性别" readonly value={sex} />}

      <ContactFieldRow
        mask={false}
        copyable={true}
        name="微信"
        value={wechat || null}
      />

      {projectApplicationFields.map((f) => {
        if (f.name in application) {
          return (
            <FieldRow
              readonly={true}
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
