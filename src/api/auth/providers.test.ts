import { expect } from "chai";
import sinon from "sinon";
import { hash } from "bcryptjs";
import { randomUUID } from "crypto";
import providers from "./providers";
import db from "../database/db";
import sequelize from "../database/sequelize";
import * as checkAndDeleteIdTokenModule from "../checkAndDeleteIdToken";
import { CredentialsConfig } from "next-auth/providers/credentials";

describe("Auth Providers", () => {
  let idPasswordProvider: CredentialsConfig<any>;
  let idTokenProvider: CredentialsConfig<any>;

  before(() => {
    idPasswordProvider = providers.find(
      (p) => p.id === "id-password",
    ) as CredentialsConfig<any>;
    idTokenProvider = providers.find(
      (p) => p.id === "id-token",
    ) as CredentialsConfig<any>;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("id-password provider", () => {
    it("should authorize successfully with correct credentials", async () => {
      let errorCaught: any = null;

      try {
        await sequelize.transaction(async (transaction) => {
          const password = "mysecretpassword";
          const hashedPassword = await hash(password, 10);

          const testEmail = `${randomUUID()}@example.com`;

          const user = await db.User.create(
            {
              email: testEmail,
              name: "Password User",
              password: hashedPassword,
              roles: [],
            },
            { transaction },
          );

          // We need to bypass the transaction isolation for the authorize method
          // which doesn't take a transaction parameter and creates its own or uses default connection.
          // Since authorize reads directly from db without transaction, we must commit to read,
          // OR we can mock db.User.findOne to use the transaction.
          // Let's mock db.User.findOne to inject the transaction so we can rollback later.
          sinon.stub(db.User, "findOne").callsFake((options: any) => {
            return (db.User.findOne as any).wrappedMethod.call(db.User, {
              ...options,
              transaction,
            });
          });

          const result = await idPasswordProvider.authorize!(
            {
              idType: "email",
              id: testEmail,
              password: "mysecretpassword",
            },
            {} as any,
          );

          expect(result).to.not.equal(null);
          expect(result?.id).to.equal(user.id);

          throw new Error("ROLLBACK_FOR_TEST");
        });
      } catch (e: any) {
        errorCaught = e;
      }

      if (errorCaught?.message !== "ROLLBACK_FOR_TEST") {
        console.error(errorCaught);
      }
      expect(errorCaught?.message).to.equal("ROLLBACK_FOR_TEST");
    });

    it("should fail authorization with incorrect password", async () => {
      let errorCaught: any = null;

      try {
        await sequelize.transaction(async (transaction) => {
          const password = "mysecretpassword";
          const hashedPassword = await hash(password, 10);

          const testEmailWrong = `${randomUUID()}@example.com`;

          await db.User.create(
            {
              email: testEmailWrong,
              name: "Password Wrong User",
              password: hashedPassword,
              roles: [],
            },
            { transaction },
          );

          sinon.stub(db.User, "findOne").callsFake((options: any) => {
            return (db.User.findOne as any).wrappedMethod.call(db.User, {
              ...options,
              transaction,
            });
          });

          const result = await idPasswordProvider.authorize!(
            {
              idType: "email",
              id: testEmailWrong,
              password: "wrongpassword",
            },
            {} as any,
          );

          expect(result).to.equal(null);

          throw new Error("ROLLBACK_FOR_TEST");
        });
      } catch (e: any) {
        errorCaught = e;
      }

      if (errorCaught?.message !== "ROLLBACK_FOR_TEST") {
        console.error(errorCaught);
      }
      expect(errorCaught?.message).to.equal("ROLLBACK_FOR_TEST");
    });

    it("should fail authorization if user does not exist", async () => {
      sinon.stub(db.User, "findOne").resolves(null);

      const result = await idPasswordProvider.authorize!(
        {
          idType: "email",
          id: "non-existent@example.com",
          password: "password",
        },
        {} as any,
      );

      expect(result).to.equal(null);
    });
  });

  describe("id-token provider", () => {
    it("should return an existing user if one exists for the token", async () => {
      let errorCaught: any = null;

      try {
        await sequelize.transaction(async (transaction) => {
          const testPhone = randomUUID();

          const user = await db.User.create(
            {
              phone: testPhone,
              name: "Token User",
              roles: [],
            },
            { transaction },
          );

          const checkStub = sinon
            .stub(checkAndDeleteIdTokenModule, "checkAndDeleteIdToken")
            .resolves();

          // Force sequelize.transaction in authorize to run in our current transaction
          sinon
            .stub(sequelize, "transaction")
            .callsFake(async (callback: any) => {
              return await callback(transaction);
            });

          const result = await idTokenProvider.authorize!(
            {
              idType: "phone",
              id: testPhone,
              token: "123456",
            },
            {} as any,
          );

          expect(result).to.not.equal(null);
          expect(result?.id).to.equal(user.id);
          expect(checkStub.callCount).to.equal(1);

          throw new Error("ROLLBACK_FOR_TEST");
        });
      } catch (e: any) {
        errorCaught = e;
      }

      if (errorCaught?.message !== "ROLLBACK_FOR_TEST") {
        console.error(errorCaught);
      }
      expect(errorCaught?.message).to.equal("ROLLBACK_FOR_TEST");
    });

    it("should create and return a new user if one does not exist for the token", async () => {
      let errorCaught: any = null;

      try {
        await sequelize.transaction(async (transaction) => {
          const checkStub = sinon
            .stub(checkAndDeleteIdTokenModule, "checkAndDeleteIdToken")
            .resolves();

          sinon
            .stub(sequelize, "transaction")
            .callsFake(async (callback: any) => {
              return await callback(transaction);
            });

          const testNewUserEmail = `new-user-token-${randomUUID()}@example.com`;

          const result = await idTokenProvider.authorize!(
            {
              idType: "email",
              id: testNewUserEmail,
              token: "123456",
            },
            {} as any,
          );

          expect(result).to.not.equal(null);
          expect(result?.email).to.equal(testNewUserEmail);
          expect(checkStub.callCount).to.equal(1);

          const createdUser = await db.User.findByPk(result?.id, {
            transaction,
          });
          expect(createdUser).to.not.equal(null);

          throw new Error("ROLLBACK_FOR_TEST");
        });
      } catch (e: any) {
        errorCaught = e;
      }

      if (errorCaught?.message !== "ROLLBACK_FOR_TEST") {
        console.error(errorCaught);
      }
      expect(errorCaught?.message).to.equal("ROLLBACK_FOR_TEST");
    });
  });
});
