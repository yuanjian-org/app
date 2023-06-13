import { ReactComponentElement } from "react";
import { Resource } from "../../shared/RBAC";

export interface IRoute {
  name: string;
  layout: string;
  // component: ReactComponentElement;
  icon: ReactComponentElement | string;
  resource: Resource;
  secondary?: boolean;
  path: string;
}
