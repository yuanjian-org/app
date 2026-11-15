import { expect } from "chai";
import axios from "axios";
import { Transaction } from "sequelize";
import sinon from "sinon";
import db from "./database/db";
import sequelize from "./database/sequelize";
import {
  buildWeChatTemplateData,
  clearWeChatCaches,
  getWeChatAccessToken,
  isWeChatNotificationConfigured,
  sanitizeWeChatThing,
  saveWeChatOpenIdForUnionId,
  syncWeChatFollowerOpenIds,
  wechat,
} from "./wechat";

describe("wechat", () => {
  let axiosGetStub: sinon.SinonStub;
  let axiosPostStub: sinon.SinonStub;
  let originalEnv: NodeJS.ProcessEnv;
  let originalIt: typeof global.it;
  let transaction: Transaction;

  beforeEach(async () => {
    clearWeChatCaches();
    originalEnv = { ...process.env };
    process.env.AUTH_WECHAT_APP_ID = "wx_test_app_id";
    process.env.AUTH_WECHAT_APP_SECRET = "wx_test_app_secret";
    process.env.WECHAT_NOTIFICATION_TEMPLATE_ID = "tmpl_test_123";
    delete process.env.WECHAT_NOTIFICATION_TITLE_FIELD;
    delete process.env.WECHAT_NOTIFICATION_CONTENT_FIELD;
    delete process.env.WECHAT_NOTIFICATION_TIME_FIELD;

    axiosGetStub = sinon.stub(axios, "get");
    axiosPostStub = sinon.stub(axios, "post");
    transaction = await sequelize.transaction();

    // Bypass the global.it check inside wechat()
    originalIt = global.it;
    Reflect.set(global, "it", undefined);
  });

  afterEach(async () => {
    process.env = originalEnv;
    global.it = originalIt;
    sinon.restore();
    await transaction.rollback();
    clearWeChatCaches();
  });

  describe("sanitizeWeChatThing", () => {
    it("should strip HTML, markdown, emojis, and newlines", () => {
      const raw =
        '<ul><li><a href="https://yuantuapp.com">张三</a> 😊</li>' +
        "<li>完成了 **[任务](https://example.com)**\n第二行</li></ul>";
      expect(sanitizeWeChatThing(raw)).to.equal("张三 完成了 任务 第二行");
    });

    it("should return fallback when input becomes empty", () => {
      expect(sanitizeWeChatThing("<br /> 🎉 ", "默认内容")).to.equal(
        "默认内容",
      );
    });

    it("should truncate >20 chars with ellipsis", () => {
      const text = "一二三四五六七八九十一二三四五六七八九十甲乙";
      const result = sanitizeWeChatThing(text);
      expect(Array.from(result).length).to.equal(20);
      expect(result).to.equal("一二三四五六七八九十一二三四五六七八九…");
    });

    it("should preserve strings of exactly 20 characters", () => {
      const text = "一二三四五六七八九十一二三四五六七八九十";
      expect(sanitizeWeChatThing(text)).to.equal(text);
    });
  });

  describe("buildWeChatTemplateData", () => {
    it("should build default thing1, thing2, and Asia/Shanghai time3", () => {
      // 2026-05-01T04:30:00Z == 2026-05-01 12:30 in Asia/Shanghai (UTC+8)
      const fixedDate = new Date("2026-05-01T04:30:00Z");
      const data = buildWeChatTemplateData(
        "待办事项提醒",
        "您有2项待办",
        fixedDate,
      );
      expect(data).to.deep.equal({
        thing1: { value: "待办事项提醒" },
        thing2: { value: "您有2项待办" },
        time3: { value: "2026-05-01 12:30" },
      });
    });

    it("should honor custom field names and omit empty field names", () => {
      process.env.WECHAT_NOTIFICATION_TITLE_FIELD = "keyword1";
      process.env.WECHAT_NOTIFICATION_CONTENT_FIELD = "thing4";
      process.env.WECHAT_NOTIFICATION_TIME_FIELD = "";

      const data = buildWeChatTemplateData("标题", "内容");
      expect(data).to.deep.equal({
        keyword1: { value: "标题" },
        thing4: { value: "内容" },
      });
    });
  });

  describe("isWeChatNotificationConfigured", () => {
    it("should require appId, secret, and templateId", () => {
      expect(isWeChatNotificationConfigured()).to.equal(true);
      delete process.env.WECHAT_NOTIFICATION_TEMPLATE_ID;
      expect(isWeChatNotificationConfigured()).to.equal(false);
    });
  });

  describe("getWeChatAccessToken", () => {
    it("should cache stable_token unless forceRefresh is true", async () => {
      axiosPostStub
        .onFirstCall()
        .resolves({ data: { access_token: "tok_1", expires_in: 7200 } })
        .onSecondCall()
        .resolves({ data: { access_token: "tok_2", expires_in: 7200 } });

      const t1 = await getWeChatAccessToken();
      const t2 = await getWeChatAccessToken();
      expect(t1).to.equal("tok_1");
      expect(t2).to.equal("tok_1");
      expect(axiosPostStub.callCount).to.equal(1);

      const t3 = await getWeChatAccessToken(true);
      expect(t3).to.equal("tok_2");
      expect(axiosPostStub.callCount).to.equal(2);
    });

    it("should throw when WeChat returns errcode", async () => {
      axiosPostStub.resolves({
        data: { errcode: 40164, errmsg: "invalid ip" },
      });

      let threw = false;
      try {
        await getWeChatAccessToken();
      } catch (e: unknown) {
        threw = true;
        expect((e as Error).message).to.include("40164");
      }
      expect(threw).to.equal(true);
    });
  });

  describe("saveWeChatOpenIdForUnionId", () => {
    it("should update active user and clear colliding openid", async () => {
      const mergedUser = await db.User.create(
        {
          name: "Old Merged",
          wechatOpenId: "openid_shared",
        },
        { transaction },
      );
      const activeUser = await db.User.create(
        {
          name: "Active User",
          wechatUnionId: "union_active_1",
        },
        { transaction },
      );
      await mergedUser.update({ mergedTo: activeUser.id }, { transaction });

      await saveWeChatOpenIdForUnionId(
        "union_active_1",
        "openid_shared",
        transaction,
      );

      await mergedUser.reload({ transaction });
      await activeUser.reload({ transaction });
      expect(mergedUser.wechatOpenId).to.equal(null);
      expect(activeUser.wechatOpenId).to.equal("openid_shared");
    });
  });

  describe("syncWeChatFollowerOpenIds", () => {
    it("should sync openids to users by wechatUnionId", async () => {
      const user = await db.User.create(
        {
          name: "Desktop QR User",
          wechatUnionId: "union_sync_target",
          wechatOpenId: null,
        },
        { transaction },
      );

      axiosPostStub
        .withArgs("https://api.weixin.qq.com/cgi-bin/stable_token")
        .resolves({ data: { access_token: "sync_tok", expires_in: 7200 } });

      axiosGetStub
        .withArgs("https://api.weixin.qq.com/cgi-bin/user/get")
        .resolves({
          data: {
            total: 2,
            count: 2,
            data: { openid: ["openid_follower_1", "openid_public_2"] },
            next_openid: "",
          },
        });

      axiosPostStub
        .withArgs("https://api.weixin.qq.com/cgi-bin/user/info/batchget")
        .resolves({
          data: {
            user_info_list: [
              {
                subscribe: 1,
                openid: "openid_follower_1",
                unionid: "union_sync_target",
              },
              {
                subscribe: 1,
                openid: "openid_public_2",
                unionid: "union_unregistered",
              },
            ],
          },
        });

      const map = await syncWeChatFollowerOpenIds(transaction);
      expect(map.get("union_sync_target")).to.equal("openid_follower_1");

      await user.reload({ transaction });
      expect(user.wechatOpenId).to.equal("openid_follower_1");
    });
  });

  describe("wechat() channel", () => {
    it("should skip when recipients empty or unconfigured", async () => {
      await wechat(
        [],
        { title: "测试", content: "内容" },
        "https://yuantuapp.com",
        transaction,
      );
      expect(axiosPostStub.callCount).to.equal(0);

      delete process.env.WECHAT_NOTIFICATION_TEMPLATE_ID;
      await wechat(
        [
          {
            id: "00000000-0000-0000-0000-000000000001",
            wechatUnionId: "u1",
            wechatOpenId: "o1",
          },
        ],
        { title: "测试", content: "内容" },
        "https://yuantuapp.com",
        transaction,
      );
      expect(axiosPostStub.callCount).to.equal(0);
    });

    it("should send to direct and synced recipients", async () => {
      const directUser = await db.User.create(
        {
          name: "Direct User",
          wechatUnionId: "union_direct",
          wechatOpenId: "openid_direct",
        },
        { transaction },
      );
      const qrOnlyUser = await db.User.create(
        {
          name: "QR User",
          wechatUnionId: "union_qr_only",
          wechatOpenId: null,
        },
        { transaction },
      );

      axiosPostStub
        .withArgs("https://api.weixin.qq.com/cgi-bin/stable_token")
        .resolves({ data: { access_token: "send_tok", expires_in: 7200 } });

      axiosGetStub
        .withArgs("https://api.weixin.qq.com/cgi-bin/user/get")
        .resolves({
          data: {
            total: 2,
            count: 2,
            data: { openid: ["openid_direct", "openid_qr_resolved"] },
            next_openid: "",
          },
        });

      axiosPostStub
        .withArgs("https://api.weixin.qq.com/cgi-bin/user/info/batchget")
        .resolves({
          data: {
            user_info_list: [
              {
                subscribe: 1,
                openid: "openid_qr_resolved",
                unionid: "union_qr_only",
              },
            ],
          },
        });

      axiosPostStub
        .withArgs("https://api.weixin.qq.com/cgi-bin/message/template/send")
        .resolves({ data: { errcode: 0, errmsg: "ok" } });

      await wechat(
        [
          {
            id: directUser.id,
            wechatUnionId: directUser.wechatUnionId,
            wechatOpenId: directUser.wechatOpenId,
          },
          {
            id: qrOnlyUser.id,
            wechatUnionId: qrOnlyUser.wechatUnionId,
            wechatOpenId: qrOnlyUser.wechatOpenId,
          },
        ],
        {
          title: "树洞新回复",
          content: "<b>测试内容</b> 🎉",
          url: "/shudong/123",
        },
        "https://yuantuapp.com",
        transaction,
      );

      const sendCalls = axiosPostStub
        .getCalls()
        .filter(
          (c) =>
            c.args[0] ===
            "https://api.weixin.qq.com/cgi-bin/message/template/send",
        );
      expect(sendCalls).to.have.length(2);

      const sentOpenIds = sendCalls.map(
        (c) => (c.args[1] as { touser: string }).touser,
      );
      expect(sentOpenIds).to.have.members([
        "openid_direct",
        "openid_qr_resolved",
      ]);

      const payload = sendCalls[0].args[1] as {
        template_id: string;
        url: string;
        data: Record<string, { value: string }>;
      };
      expect(payload.template_id).to.equal("tmpl_test_123");
      expect(payload.url).to.equal("https://yuantuapp.com/shudong/123");
      expect(payload.data.thing1).to.deep.equal({ value: "树洞新回复" });
      expect(payload.data.thing2).to.deep.equal({ value: "测试内容" });
    });

    it("should refresh on 40001 and skip 43004 cleanly", async () => {
      axiosPostStub
        .withArgs("https://api.weixin.qq.com/cgi-bin/stable_token")
        .onFirstCall()
        .resolves({ data: { access_token: "stale_tok", expires_in: 7200 } })
        .onSecondCall()
        .resolves({ data: { access_token: "fresh_tok", expires_in: 7200 } });

      const sendStub = axiosPostStub.withArgs(
        "https://api.weixin.qq.com/cgi-bin/message/template/send",
      );
      sendStub
        .onFirstCall()
        .resolves({ data: { errcode: 40001, errmsg: "invalid credential" } })
        .onSecondCall()
        .resolves({ data: { errcode: 43004, errmsg: "require subscribe" } });

      await wechat(
        [
          {
            id: "00000000-0000-0000-0000-000000000099",
            wechatUnionId: "u_unsub",
            wechatOpenId: "o_unsub",
          },
        ],
        { title: "提醒", content: "内容" },
        "https://yuantuapp.com",
        transaction,
      );

      expect(sendStub.callCount).to.equal(2);
      expect(
        (sendStub.secondCall.args[2] as { params: { access_token: string } })
          .params.access_token,
      ).to.equal("fresh_tok");
    });
  });
});
