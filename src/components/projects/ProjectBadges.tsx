import { Badge, Flex, Tooltip, BadgeProps } from "@chakra-ui/react";
import {
  ProjectStatus,
  ProjectVisibility,
  ProjectStatusLabel,
  ProjectStatusDesc,
  ProjectVisibilityLabel,
  ProjectVisibilityDesc,
} from "../../shared/Project";

export function ProjectStatusBadge({
  status,
  ...props
}: { status: ProjectStatus } & BadgeProps) {
  let colorScheme = "gray";
  if (status === "Open") colorScheme = "green";
  else if (status === "Closed") colorScheme = "red";

  return (
    <Tooltip label={ProjectStatusDesc[status]}>
      <Badge colorScheme={colorScheme} {...props}>
        {ProjectStatusLabel[status]}
      </Badge>
    </Tooltip>
  );
}

export function ProjectVisibilityBadge({
  visibility,
  ...props
}: { visibility: ProjectVisibility } & Omit<BadgeProps, "visibility">) {
  let colorScheme = "gray";
  if (visibility === "Public") colorScheme = "blue";
  else if (visibility === "Confidential") colorScheme = "purple";

  return (
    <Tooltip label={ProjectVisibilityDesc[visibility]}>
      <Badge colorScheme={colorScheme} {...props}>
        {ProjectVisibilityLabel[visibility]}
      </Badge>
    </Tooltip>
  );
}

export function ProjectBadges({
  status,
  visibility,
}: {
  status: ProjectStatus;
  visibility: ProjectVisibility;
}) {
  if (status === "Open" && visibility === "Public") {
    return null;
  }

  return (
    <Flex gap={2} align="center">
      {status !== "Open" && <ProjectStatusBadge status={status} />}
      {visibility !== "Public" && (
        <ProjectVisibilityBadge visibility={visibility} />
      )}
    </Flex>
  );
}
