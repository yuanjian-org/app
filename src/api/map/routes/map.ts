import { procedure, router } from "../../trpc";
import { authUser } from "../../auth";

const get = procedure
  .use(authUser("Mentee"||"Mentor"))
  .query(async () =>
{
});


const list = procedure
  .use(authUser("Mentee"||"Mentor"))
  .query(async () =>
{
});

const save = procedure
.use(authUser("Mentee"||"Mentor"))
.query(async () =>
{
});

const update = procedure
.use(authUser("Mentee"||"Mentor"))
.query(async () =>
{
});

export default router({
    get,
    list,
    save,
    update
});
