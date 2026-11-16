import path from "path";
import { createRequire } from "module";
import React from "react";
import { expect } from "chai";
import sinon from "sinon";
import type { ShudongPost } from "../shared/Shudong";
import type User from "../shared/User";
import type Role from "../shared/Role";
import type { Session } from "next-auth";
import type { NextRouter } from "next/router";

type ShudongPostItemMod = typeof import("./ShudongPostItem");
type PostItemProps = Parameters<ShudongPostItemMod["ShudongPostItem"]>[0];
type TrpcMod = typeof import("../trpc");
type EmotionCacheMod = typeof import("@emotion/cache");
type AutosaveContextMod = typeof import("../AutosaveContext");
type RouterContextMod =
  typeof import("next/dist/shared/lib/router-context.shared-runtime");

const cjsRequire = createRequire(
  path.join(process.cwd(), "src/components/ShudongPostItem.test.ts"),
);

function makeUser(id: string, name: string, roles: Role[]): User {
  return {
    id,
    name,
    url: null,
    roles,
    email: `${id}@test.com`,
    phone: null,
    wechat: null,
    menteeStatus: roles.includes("Mentee") ? "现届学子" : null,
    pointOfContact: null,
    pointOfContactNote: null,
  };
}

function makePost(overrides: Partial<ShudongPost> = {}): ShudongPost {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    parentId: null,
    author: null,
    isAuthor: false,
    isMentorPosted: false,
    markdown: "Original content",
    reactions: [],
    responseCount: 0,
    isDeleted: false,
    isAiGenerated: false,
    lastEditedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    userIsSubscribed: false,
    anonymousName: "匿名楼主",
    ...overrides,
  };
}

describe("ShudongPostItem", () => {
  let mod: ShudongPostItemMod;
  let trpcMod: TrpcMod;
  let AutosaveContext: AutosaveContextMod["default"];
  let rtl: typeof import("@testing-library/react");
  let chakra: typeof import("@chakra-ui/react");
  let nextAuthReact: typeof import("next-auth/react");
  let i18nextMod: typeof import("i18next");
  let reactI18next: typeof import("react-i18next");
  let themeMod: typeof import("../theme");
  let emotionReact: typeof import("@emotion/react");
  let createEmotionCache: EmotionCacheMod["default"];
  let RouterContext: RouterContextMod["RouterContext"];

  let cleanupJsdom: (() => void) | undefined;
  let prevCssExtension:
    | ((module: NodeModule, filename: string) => void)
    | undefined;
  let hadCssExtension = false;
  let shudongPostItemPath = "";
  let origTrpcDefault: TrpcMod["default"] | undefined;
  let origTrpcNext: TrpcMod["trpcNext"] | undefined;

  let getDraftStub: sinon.SinonStub;
  let saveDraftStub: sinon.SinonStub;
  let updatePostStub: sinon.SinonStub;
  let getResponsesUseQueryStub: sinon.SinonStub;

  before(() => {
    const globalJsdom = cjsRequire(
      "global-jsdom",
    ) as typeof import("global-jsdom");
    cleanupJsdom = globalJsdom();

    if (!window.matchMedia) {
      window.matchMedia = () =>
        ({
          matches: false,
          media: "",
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }) as MediaQueryList;
    }

    // Stub CSS module imports before loading ShudongPostItem / MarkdownStyler.
    hadCssExtension = Object.prototype.hasOwnProperty.call(
      cjsRequire.extensions,
      ".css",
    );
    prevCssExtension = cjsRequire.extensions[".css"];
    cjsRequire.extensions[".css"] = (module: NodeModule) => {
      module.exports = new Proxy(
        {},
        {
          get: (_target, prop) => String(prop),
        },
      );
    };

    getDraftStub = sinon.stub().resolves(null);
    saveDraftStub = sinon.stub().resolves();
    updatePostStub = sinon.stub().resolves(makePost());
    getResponsesUseQueryStub = sinon.stub().returns({
      data: undefined,
      refetch: sinon.stub().resolves({ data: [] }),
    });

    // Replace trpc exports directly (avoiding sinon.stub reading .restore on
    // the tRPC Proxy) before requiring ShudongPostItem so its top-level CJS
    // import bindings point to our delegates.
    trpcMod = cjsRequire("../trpc");
    origTrpcDefault = trpcMod.default;
    origTrpcNext = trpcMod.trpcNext;
    const fakeTrpc = {
      shudong: {
        getDraft: { query: (...args: unknown[]) => getDraftStub(...args) },
        saveDraft: { mutate: (...args: unknown[]) => saveDraftStub(...args) },
        updatePost: {
          mutate: (...args: unknown[]) => updatePostStub(...args),
        },
      },
    };
    const fakeTrpcNext = {
      shudong: {
        getResponses: {
          useQuery: (...args: unknown[]) => getResponsesUseQueryStub(...args),
        },
      },
    };
    trpcMod.default = fakeTrpc as unknown as TrpcMod["default"];
    Object.defineProperty(trpcMod, "trpcNext", {
      value: fakeTrpcNext as unknown as TrpcMod["trpcNext"],
      writable: true,
      configurable: true,
    });

    shudongPostItemPath = cjsRequire.resolve("./ShudongPostItem");
    mod = cjsRequire("./ShudongPostItem");
    AutosaveContext = (cjsRequire("../AutosaveContext") as AutosaveContextMod)
      .default;
    rtl = cjsRequire("@testing-library/react");
    chakra = cjsRequire("@chakra-ui/react");
    nextAuthReact = cjsRequire("next-auth/react");
    i18nextMod = cjsRequire("i18next");
    reactI18next = cjsRequire("react-i18next");
    themeMod = cjsRequire("../theme");
    emotionReact = cjsRequire("@emotion/react");
    createEmotionCache = (cjsRequire("@emotion/cache") as EmotionCacheMod)
      .default;
    RouterContext = (
      cjsRequire(
        "next/dist/shared/lib/router-context.shared-runtime",
      ) as RouterContextMod
    ).RouterContext;
  });

  after(() => {
    rtl?.cleanup();
    sinon.restore();
    if (trpcMod && origTrpcDefault) {
      trpcMod.default = origTrpcDefault;
    }
    if (trpcMod && origTrpcNext) {
      Object.defineProperty(trpcMod, "trpcNext", {
        value: origTrpcNext,
        writable: true,
        configurable: true,
      });
    }
    if (shudongPostItemPath) {
      delete cjsRequire.cache[shudongPostItemPath];
    }
    if (hadCssExtension) {
      cjsRequire.extensions[".css"] = prevCssExtension;
    } else {
      delete cjsRequire.extensions[".css"];
    }
    if (typeof window !== "undefined") {
      window.close();
    }
    cleanupJsdom?.();
  });

  beforeEach(() => {
    getDraftStub.resetHistory();
    getDraftStub.resolves(null);
    saveDraftStub.resetHistory();
    saveDraftStub.resolves();
    updatePostStub.resetHistory();
    updatePostStub.resolves(makePost());
    getResponsesUseQueryStub.resetHistory();
    getResponsesUseQueryStub.returns({
      data: undefined,
      refetch: sinon.stub().resolves({ data: [] }),
    });
  });

  afterEach(() => {
    rtl.cleanup();
  });

  async function renderItem(
    me: User,
    post: ShudongPost,
    extraProps: Partial<PostItemProps> = {},
  ) {
    const i18n = i18nextMod.createInstance();
    await i18n.init({
      lng: "zh",
      fallbackLng: false,
      ns: ["common"],
      defaultNS: "common",
      resources: { zh: { common: {} } },
      interpolation: { escapeValue: false },
      initImmediate: false,
    });

    const session: Session = {
      me: me as unknown as Session["me"],
      impersonated: undefined,
      expires: "2099-01-01T00:00:00.000Z",
    };

    const mockRouter = {
      basePath: "",
      pathname: "/shudong/1",
      route: "/shudong/[questionId]",
      asPath: "/shudong/1",
      query: {},
      push: sinon.stub().resolves(true),
      replace: sinon.stub().resolves(true),
      reload: sinon.stub(),
      back: sinon.stub(),
      forward: sinon.stub(),
      prefetch: sinon.stub().resolves(),
      beforePopState: sinon.stub(),
      events: {
        on: sinon.stub(),
        off: sinon.stub(),
        emit: sinon.stub(),
      },
      isFallback: false,
      isLocaleDomain: false,
      isReady: true,
      isPreview: false,
    } as unknown as NextRouter;

    const emotionCache = createEmotionCache({
      key: "css",
      container: document.head,
    });

    const element = React.createElement(
      RouterContext.Provider,
      { value: mockRouter },
      React.createElement(
        reactI18next.I18nextProvider,
        { i18n },
        React.createElement(
          emotionReact.CacheProvider,
          { value: emotionCache },
          React.createElement(
            chakra.ChakraProvider,
            { theme: themeMod.default },
            React.createElement(
              nextAuthReact.SessionProvider,
              { session },
              React.createElement(
                AutosaveContext.Provider,
                {
                  value: {
                    addPendingSaver: () => {},
                    removePendingSaver: () => {},
                    setPendingSaverError: () => {},
                  },
                },
                React.createElement(mod.ShudongPostItem, {
                  post,
                  ...extraProps,
                }),
              ),
            ),
          ),
        ),
      ),
    );

    return rtl.render(element);
  }

  it("toggles anonymity off when editing anonymous question", async () => {
    const me = makeUser("user-1", "张三", ["Mentor"]);
    const post = makePost({
      parentId: null,
      author: null,
      isAuthor: true,
      isMentorPosted: true,
      anonymousName: "匿名楼主",
    });
    const onRefetch = sinon.stub();

    const { getByLabelText, queryByLabelText, getByText } = await renderItem(
      me,
      post,
      { isRootQuestion: true, onRefetch },
    );

    const editBtn = getByLabelText("编辑帖子");
    rtl.fireEvent.click(editBtn);

    const anonSwitch = getByLabelText("匿名提问") as HTMLInputElement;
    expect(anonSwitch.checked).to.equal(true);

    rtl.fireEvent.click(anonSwitch);
    expect(anonSwitch.checked).to.equal(false);

    rtl.fireEvent.click(getByText("保存"));

    await rtl.waitFor(() => {
      expect(onRefetch.callCount).to.equal(1);
    });

    expect(updatePostStub.callCount).to.equal(1);
    expect(updatePostStub.firstCall.args[0]).to.deep.equal({
      postId: post.id,
      markdown: "Original content",
      isAnonymous: false,
    });
    expect(queryByLabelText("匿名提问")).to.equal(null);
  });

  it("toggles anonymity on responses and sub-responses", async () => {
    const me = makeUser("user-2", "李四", ["Mentee"]);
    const questionId = "22222222-2222-4222-8222-222222222222";
    const topResponse = makePost({
      id: "33333333-3333-4333-8333-333333333333",
      parentId: questionId,
      author: { id: me.id, name: me.name, url: null },
      isAuthor: true,
      anonymousName: null,
    });
    const onRefetch = sinon.stub();

    const firstRender = await renderItem(me, topResponse, { onRefetch });
    rtl.fireEvent.click(firstRender.getByLabelText("编辑帖子"));

    const respSwitch = firstRender.getByLabelText(
      "匿名回答",
    ) as HTMLInputElement;
    expect(respSwitch.checked).to.equal(false);

    rtl.fireEvent.click(respSwitch);
    expect(respSwitch.checked).to.equal(true);

    rtl.fireEvent.click(firstRender.getByText("保存"));

    await rtl.waitFor(() => {
      expect(onRefetch.callCount).to.equal(1);
    });

    expect(updatePostStub.callCount).to.equal(1);
    expect(updatePostStub.firstCall.args[0]).to.deep.equal({
      postId: topResponse.id,
      markdown: "Original content",
      isAnonymous: true,
    });

    rtl.cleanup();

    const subResponse = makePost({
      id: "44444444-4444-4444-8444-444444444444",
      parentId: topResponse.id,
      author: null,
      isAuthor: true,
      anonymousName: "匿名 甲",
    });
    const secondOnRefetch = sinon.stub();
    const secondRender = await renderItem(me, subResponse, {
      isSubResponse: true,
      onRefetch: secondOnRefetch,
    });
    rtl.fireEvent.click(secondRender.getByLabelText("编辑帖子"));

    const subSwitch = secondRender.getByLabelText(
      "匿名回复",
    ) as HTMLInputElement;
    expect(subSwitch.checked).to.equal(true);
    rtl.fireEvent.click(subSwitch);
    expect(subSwitch.checked).to.equal(false);
    rtl.fireEvent.click(secondRender.getByText("保存"));

    await rtl.waitFor(() => {
      expect(secondOnRefetch.callCount).to.equal(1);
    });
    expect(updatePostStub.callCount).to.equal(2);
    expect(updatePostStub.secondCall.args[0]).to.deep.equal({
      postId: subResponse.id,
      markdown: "Original content",
      isAnonymous: false,
    });
  });

  it("resets anonymity switch when cancelling edit and reopening", async () => {
    const me = makeUser("user-3", "王五", ["Mentor"]);
    const post = makePost({
      parentId: null,
      author: null,
      isAuthor: true,
    });

    const { getByLabelText, getByText } = await renderItem(me, post, {
      isRootQuestion: true,
    });

    rtl.fireEvent.click(getByLabelText("编辑帖子"));
    const switchBeforeCancel = getByLabelText("匿名提问") as HTMLInputElement;
    expect(switchBeforeCancel.checked).to.equal(true);

    rtl.fireEvent.click(switchBeforeCancel);
    expect(switchBeforeCancel.checked).to.equal(false);

    rtl.fireEvent.click(getByText("取消"));
    rtl.fireEvent.click(getByLabelText("编辑帖子"));

    const switchAfterReopen = getByLabelText("匿名提问") as HTMLInputElement;
    expect(switchAfterReopen.checked).to.equal(true);
  });

  it("hides edit button from non-author regular user", async () => {
    const me = makeUser("user-4", "赵六", ["Mentee"]);
    const post = makePost({
      parentId: null,
      author: null,
      isAuthor: false,
    });

    const { queryByLabelText } = await renderItem(me, post, {
      isRootQuestion: true,
    });

    expect(queryByLabelText("编辑帖子")).to.equal(null);
  });

  it("hides anonymity toggle for ShudongAdmin editing others", async () => {
    const admin = makeUser("admin-1", "管理员", ["ShudongAdmin"]);
    const post = makePost({
      parentId: null,
      author: null,
      isAuthor: false,
    });
    const onRefetch = sinon.stub();

    const { getByLabelText, queryByLabelText, getByText } = await renderItem(
      admin,
      post,
      { isRootQuestion: true, onRefetch },
    );

    rtl.fireEvent.click(getByLabelText("编辑帖子"));

    expect(queryByLabelText("匿名提问")).to.equal(null);
    expect(queryByLabelText("匿名回答")).to.equal(null);
    expect(queryByLabelText("匿名回复")).to.equal(null);

    rtl.fireEvent.click(getByText("保存"));

    await rtl.waitFor(() => {
      expect(onRefetch.callCount).to.equal(1);
    });

    expect(updatePostStub.callCount).to.equal(1);
    const payload = updatePostStub.firstCall.args[0] as Record<string, unknown>;
    expect(payload).to.deep.equal({
      postId: post.id,
      markdown: "Original content",
    });
    expect("isAnonymous" in payload).to.equal(false);
  });
});
