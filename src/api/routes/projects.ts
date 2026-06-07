import { z } from "zod";
import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import db from "../database/db";
import { zProject } from "../../shared/Project";
import { minUserAttributes } from "../database/models/attributesAndIncludes";
import { generalBadRequestError, notFoundError } from "../errors";

export default router({
  listProjects: procedure.output(z.array(zProject)).query(async () => {
    const projects = await db.Project.findAll({
      where: { isPublished: true },
      include: [
        { model: db.User, as: "creator", attributes: minUserAttributes },
      ],
      order: [["createdAt", "DESC"]],
    });
    return projects.map((p) => p.toJSON() as any);
  }),

  getProject: procedure
    .input(z.object({ id: z.string() }))
    .output(zProject)
    .query(async ({ input: { id }, ctx }) => {
      const project = await db.Project.findByPk(id, {
        include: [
          { model: db.User, as: "creator", attributes: minUserAttributes },
        ],
      });
      if (!project) throw notFoundError;

      const { getServerSession } = await import("next-auth/next");
      const { authOptions } =
        await import("../../pages/api/auth/[...nextauth]");
      const session = await getServerSession(
        ctx.req as any,
        ctx.res as any,
        authOptions(ctx.req as any),
      );

      if (project.requireLogin && !session?.user) {
        throw generalBadRequestError(
          "This project requires login to view details.",
        );
      }
      return project.toJSON() as any;
    }),

  applyProject: procedure
    .use(authUser())
    .input(z.object({ projectId: z.string(), content: z.string() }))
    .mutation(async ({ input: { projectId, content }, ctx }) => {
      const { me } = ctx;
      const project = await db.Project.findByPk(projectId);
      if (!project) throw notFoundError;

      const [, created] = await db.ProjectApplication.findOrCreate({
        where: { projectId, applicantId: me.id },
        defaults: { projectId, applicantId: me.id, content, status: "Pending" },
      });

      if (!created) {
        throw generalBadRequestError(
          "You have already applied for this project.",
        );
      }
    }),
});
