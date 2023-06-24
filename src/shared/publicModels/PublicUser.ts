/**
 * 
 * TODO deprecated public models and use trpc's output validator instead
 * 
 */

import { Role } from "../RBAC";

interface PublicUser {
  id: string;

  roles: Role[];
  name: string;
  email: string;

  clientId: string;
}

export default PublicUser;

import type User from '../../api/database/models/User';
export const presentPublicUser = (g: User) => {
  return {
    id: g.id,
    name: g.name,
    email: g.email,
    roles: g.roles,
    clientId: g.clientId,
  } as PublicUser;
};