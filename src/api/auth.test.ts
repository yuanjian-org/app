import { expect } from "chai";
import * as td from "testdouble";
import { TRPCError } from "@trpc/server";
import { authIntegration, authUser, authWebhook } from "./auth";
import { router, procedure } from "./trpc";

describe("auth.ts", () => {
  let envBackup: NodeJS.ProcessEnv;

  beforeEach(() => {
    envBackup = { ...process.env };
  });

  afterEach(() => {
    process.env = envBackup;
    td.reset();
  });

  describe("authIntegration", () => {
    it("should throw UNAUTHORIZED if token is missing", async () => {
      const mockRouter = router({
        testQuery: procedure.use(authIntegration()).query(() => "success"),
      });

      const caller = mockRouter.createCaller({ req: { headers: {} } } as any);

      let error: any;
      try {
        await caller.testQuery();
      } catch (e) {
        error = e;
      }
      expect(error).to.be.instanceOf(TRPCError);
      expect((error as TRPCError).code).to.equal("UNAUTHORIZED");
    });

    it("should throw internal server error if INTEGRATION_AUTH_TOKEN is not set", async () => {
      delete process.env.INTEGRATION_AUTH_TOKEN;
      const mockRouter = router({
        testQuery: procedure.use(authIntegration()).query(() => "success"),
      });
      const caller = mockRouter.createCaller({
        req: { headers: { authorization: "Bearer some-token" } },
      } as any);

      let error: any;
      try {
        await caller.testQuery();
      } catch (e) {
        error = e;
      }
      expect(error).to.be.instanceOf(TRPCError);
      expect((error as TRPCError).code).to.equal("INTERNAL_SERVER_ERROR");
    });

    it("should throw BAD_REQUEST if token is invalid", async () => {
      process.env.INTEGRATION_AUTH_TOKEN = "valid-token";
      const mockRouter = router({
        testQuery: procedure.use(authIntegration()).query(() => "success"),
      });
      const caller = mockRouter.createCaller({
        req: { headers: { authorization: "Bearer invalid-token" } },
      } as any);

      let error: any;
      try {
        await caller.testQuery();
      } catch (e) {
        error = e;
      }
      expect(error).to.be.instanceOf(TRPCError);
      expect((error as TRPCError).code).to.equal("BAD_REQUEST");
    });

    it("should succeed if token is valid", async () => {
      process.env.INTEGRATION_AUTH_TOKEN = "valid-token";
      const mockRouter = router({
        testQuery: procedure.use(authIntegration()).query(() => "success"),
      });
      const caller = mockRouter.createCaller({
        req: { headers: { authorization: "Bearer valid-token" } },
      } as any);

      const result = await caller.testQuery();
      expect(result).to.equal("success");
    });
  });

  describe("authUser", () => {
    let getServerSessionMock: any;

    beforeEach(() => {
      getServerSessionMock = td.func();
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nextAuthNext = require("next-auth/next");
      td.replace(nextAuthNext, "getServerSession", getServerSessionMock);
    });

    afterEach(() => {
      td.reset();
    });

    it("should throw UNAUTHORIZED if session is missing", async () => {
      td.when(
        getServerSessionMock(
          td.matchers.anything(),
          td.matchers.anything(),
          td.matchers.anything(),
        ),
      ).thenResolve(null);

      const mockRouter = router({
        testQuery: procedure.use(authUser()).query(() => "success"),
      });

      const req = { getHeader: () => undefined } as any;

      const res = {
        getHeader: () => undefined,
        setHeader: () => undefined,
      } as any;

      const caller = mockRouter.createCaller({ req, res } as any);

      let error: any;
      try {
        await caller.testQuery();
      } catch (e) {
        error = e;
      }
      expect(error).to.be.instanceOf(TRPCError);
      expect((error as TRPCError).code).to.equal("UNAUTHORIZED");
    });

    it("should throw FORBIDDEN if role is not permitted", async () => {
      const session = { me: { roles: ["Mentee"] } };
      td.when(
        getServerSessionMock(
          td.matchers.anything(),
          td.matchers.anything(),
          td.matchers.anything(),
        ),
      ).thenResolve(session);

      const mockRouter = router({
        testQuery: procedure
          .use(authUser("UserManager"))
          .query(() => "success"),
      });

      const req = { getHeader: () => undefined } as any;

      const res = {
        getHeader: () => undefined,
        setHeader: () => undefined,
      } as any;

      const caller = mockRouter.createCaller({ req, res } as any);

      let error: any;
      try {
        await caller.testQuery();
      } catch (e) {
        error = e;
      }
      expect(error).to.be.instanceOf(TRPCError);
      expect((error as TRPCError).code).to.equal("FORBIDDEN");
    });

    it("should succeed and provide context if session and role are valid", async () => {
      const session = { me: { roles: ["UserManager"] } };
      td.when(
        getServerSessionMock(
          td.matchers.anything(),
          td.matchers.anything(),
          td.matchers.anything(),
        ),
      ).thenResolve(session);

      const mockRouter = router({
        testQuery: procedure
          .use(authUser("UserManager"))
          .query(({ ctx }) => ctx),
      });

      const req = { getHeader: () => undefined } as any;

      const res = {
        getHeader: () => undefined,
        setHeader: () => undefined,
      } as any;

      const caller = mockRouter.createCaller({ req, res } as any);

      const ctx = await caller.testQuery();
      expect(ctx.me).to.deep.equal(session.me);
      expect(ctx.session).to.deep.equal(session);
    });
  });

  describe("authWebhook", () => {
    it("should throw internal server error if WEBHOOK_TOKEN is not set", async () => {
      delete process.env.WEBHOOK_TOKEN;
      const mockRouter = router({
        testQuery: procedure.use(authWebhook).query(() => "success"),
      });

      const caller = mockRouter.createCaller({} as any);

      let error: any;
      try {
        await caller.testQuery();
      } catch (e) {
        error = e;
      }
      expect(error).to.be.instanceOf(TRPCError);
      expect((error as TRPCError).code).to.equal("INTERNAL_SERVER_ERROR");
    });

    it("should succeed if WEBHOOK_TOKEN is set", async () => {
      process.env.WEBHOOK_TOKEN = "test-webhook-token";
      const mockRouter = router({
        testQuery: procedure.use(authWebhook).query(() => "success"),
      });

      const caller = mockRouter.createCaller({} as any);

      const result = await caller.testQuery();
      expect(result).to.equal("success");
    });
  });
});
