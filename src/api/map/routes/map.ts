import { procedure, router } from "../../trpc";
import { authUser } from "../../auth";
import db from "../../database/db";
import { z } from "zod";
import { noPermissionError, notFoundError } from "../../errors";
import { isPermitted } from "shared/Role";

const get = procedure
  .use(authUser("Mentee"||"Mentor"))
  .query(async ({ input: type }) =>
{
});


const list = procedure
  .use(authUser("Mentee"||"Mentor"))
  .query(async ({ input: type }) =>
{
});

const save = procedure
.use(authUser("Mentee"||"Mentor"))
.query(async ({ input: type }) =>
{
});

const update = procedure
.use(authUser("Mentee"||"Mentor"))
.query(async ({ input: type }) =>
{
});

export default router({
    get,
    list,
    save,
    update
});
