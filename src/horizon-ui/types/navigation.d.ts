import { ReactComponentElement } from "react";
import { Resource } from "../../shared/RBAC";

export interface IRoute {
  name: string;
  // component: ReactComponentElement;
  icon: ReactComponentElement | string;
  resource: Resource;
  secondary?: boolean;
  path: string;
  hiddenFromSidebar?: boolean;
}
