import path from "path";
import { createRequire } from "module";
import React from "react";
import { expect } from "chai";
import sinon from "sinon";
import type { Session } from "next-auth";
import type { NextRouter } from "next/router";
import type { ShudongPost } from "shared/Shudong";
import type User from "shared/User";

type ShudongPostItemMod = typeof import("./ShudongPostItem");
type AutosaveContextMod = typeof import("../AutosaveContext");
type TrpcMod = typeof import("../trpc");
type ThemeMod = typeof import("../theme");

interface CssHandler {
  (mod: NodeJS.Module, filename: string): void;
}

const cjsRequire = createRequire(
  path.join(process.cwd(), "src/components/ShudongPostItem.test.ts"),
);

describe("ShudongPostItem", () => {
  let mod: ShudongPostItemMod;
  let rtl: typeof import("@testing-library/react");
  let chakra: typeof import("@chakra-ui/react");
  let nextAuthReact: typeof import("next-auth/react");
  let nextRouter: typeof import("next/router");
  let i18nextMod: typeof import("i18next");
  let reactI18next: typeof import("react-i18next");
  let autosaveContextMod: AutosaveContextMod;
  let trpcMod: TrpcMod;
  let themeMod: ThemeMod;
  let i18n: import("i18next").i18n;
  let cleanupJsdom: (() => void) | undefined;
  let prevCssHandler: CssHandler | undefined;
  let hadCssHandler = false;

  let updatePostMutateStub: sinon.SinonStub;
  let getDraftQueryStub: sinon.SinonStub;
  let saveDraftMutateStub: sinon.SinonStub;
  let getResponsesUseQueryStub: sinon.SinonStub;
  let origTrpcDefaultDesc: PropertyDescriptor | undefined;
  let origTrpcNextDesc: PropertyDescriptor | undefined;

  const mockShudongClient = {
    updatePost: {
      mutate: (...args: unknown[]) => updatePostMutateStub(...args),
    },
    getDraft: {
      query: (...args: unknown[]) => getDraftQueryStub(...args),
    },
    saveDraft: {
      mutate: (...args: unknown[]) => saveDraftMutateStub(...args),
    },
    createPost: {
      mutate: () => Promise.resolve(),
    },
    deletePost: {
      mutate: () => Promise.resolve(),
    },
    toggleReaction: {
      mutate: () => Promise.resolve({ reactions: [], added: true }),
    },
    toggleSubscription: {
      mutate: () => Promise.resolve({ isSubscribed: true }),
    },
  };

  const mockTrpcNextClient = {
    shudong: {
      getResponses: {
        useQuery: (...args: unknown[]) => getResponsesUseQueryStub(...args),
      },
    },
  };

  const baseUser: User = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Test Author",
    url: null,
    roles: ["Mentee"],
    email: "author@test.com",
    phone: null,
    wechat: null,
    menteeStatus: "现届学子",
    pointOfContact: null,
    pointOfContactNote: null,
  };

  const adminUser: User = {
    ...baseUser,
    id: "22222222-2222-4222-8222-222222222222",
    name: "Shudong Admin",
    roles: ["ShudongAdmin"],
    menteeStatus: null,
  };

  const viewerUser: User = {
    ...baseUser,
    id: "33333333-3333-4333-8333-333333333333",
    name: "Other Viewer",
    roles: ["Mentor"],
    menteeStatus: null,
  };

  function makePost(overrides: Partial<ShudongPost> = {}): ShudongPost {
    return {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      parentId: null,
      author: null,
      userIsAuthor: true,
      isMentorPosted: false,
      markdown: "Initial post body",
      reactions: [],
      responseCount: 0,
      isDeleted: false,
      isAiGenerated: false,
      lastEditedAt: null,
      createdAt: new Date("2026-10-01T00:00:00Z"),
      userIsSubscribed: false,
      anonymousName: "匿名楼主",
      ...overrides,
    };
  }

  function renderPostItem(
    post: ShudongPost,
    me: User,
    props: { isRootQuestion?: boolean; isNestedReply?: boolean } = {},
  ) {
    const session = {
      me,
      impersonated: undefined,
      expires: "2099-01-01",
    } as unknown as Session;

    const autosaveValue = {
      addPendingSaver: sinon.stub(),
      removePendingSaver: sinon.stub(),
      setPendingSaverError: sinon.stub(),
    };

    return rtl.render(
      React.createElement(
        nextAuthReact.SessionProvider,
        { session },
        React.createElement(
          chakra.ChakraProvider,
          { theme: themeMod.default },
          React.createElement(
            reactI18next.I18nextProvider,
            { i18n },
            React.createElement(
              autosaveContextMod.default.Provider,
              { value: autosaveValue },
              React.createElement(mod.ShudongPostItem, {
                post,
                isRootQuestion: props.isRootQuestion,
                isNestedReply: props.isNestedReply,
              }),
            ),
          ),
        ),
      ),
    );
  }

  before(async () => {
    // Clear any stale JSDOM globals left by earlier test files so
    // global-jsdom initializes a fresh active window on Node >= 20.
    const globalObj = globalThis as Record<string, unknown>;
    delete globalObj.document;
    delete globalObj.window;

    const globalJsdom = cjsRequire(
      "global-jsdom",
    ) as typeof import("global-jsdom");
    cleanupJsdom = globalJsdom();

    if (typeof window.matchMedia !== "function") {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        configurable: true,
        value: (query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }),
      });
    }

    // Evict DOM-sensitive modules cached by earlier non-JSDOM tests (such as
    // Footer.test.ts) while `document` was undefined, so react-dom (canUseDOM)
    // and Emotion (isBrowser) bind to this window and share one Chakra context.
    for (const key of Object.keys(cjsRequire.cache)) {
      const normalized = key.replace(/\\/g, "/");
      if (
        normalized.includes("/node_modules/react-dom/") ||
        normalized.includes("/node_modules/@testing-library/") ||
        normalized.includes("/node_modules/@chakra-ui/") ||
        normalized.includes("/node_modules/@emotion/") ||
        normalized.includes("/node_modules/framer-motion/") ||
        ((normalized.includes("/src/components/") ||
          normalized.includes("/src/theme/")) &&
          !normalized.endsWith(".test.ts"))
      ) {
        delete cjsRequire.cache[key];
      }
    }

    const extensions = (
      cjsRequire as NodeJS.Require & {
        extensions: Record<string, CssHandler | undefined>;
      }
    ).extensions;
    hadCssHandler = Object.prototype.hasOwnProperty.call(extensions, ".css");
    prevCssHandler = extensions[".css"];
    extensions[".css"] = () => {};

    trpcMod = cjsRequire("../trpc") as TrpcMod;
    origTrpcDefaultDesc = Object.getOwnPropertyDescriptor(trpcMod, "default");
    origTrpcNextDesc = Object.getOwnPropertyDescriptor(trpcMod, "trpcNext");
    Object.defineProperty(trpcMod, "default", {
      configurable: true,
      writable: true,
      enumerable: true,
      value: { shudong: mockShudongClient },
    });
    Object.defineProperty(trpcMod, "trpcNext", {
      configurable: true,
      writable: true,
      enumerable: true,
      value: mockTrpcNextClient,
    });

    mod = cjsRequire("./ShudongPostItem") as ShudongPostItemMod;
    rtl = cjsRequire(
      "@testing-library/react",
    ) as typeof import("@testing-library/react");
    chakra = cjsRequire(
      "@chakra-ui/react",
    ) as typeof import("@chakra-ui/react");
    nextAuthReact = cjsRequire(
      "next-auth/react",
    ) as typeof import("next-auth/react");
    nextRouter = cjsRequire("next/router") as typeof import("next/router");
    i18nextMod = cjsRequire("i18next") as typeof import("i18next");
    reactI18next = cjsRequire(
      "react-i18next",
    ) as typeof import("react-i18next");
    autosaveContextMod = cjsRequire("../AutosaveContext") as AutosaveContextMod;
    themeMod = cjsRequire("../theme") as ThemeMod;

    i18n = i18nextMod.createInstance();
    await i18n.init({
      lng: "zh",
      fallbackLng: false,
      ns: ["common"],
      defaultNS: "common",
      resources: { zh: { common: {} } },
      interpolation: { escapeValue: false },
      initImmediate: false,
    });
  });

  beforeEach(() => {
    updatePostMutateStub = sinon.stub().resolves(makePost());
    getDraftQueryStub = sinon.stub().resolves(null);
    saveDraftMutateStub = sinon.stub().resolves();
    getResponsesUseQueryStub = sinon.stub().returns({
      data: undefined,
      refetch: sinon.stub().resolves(),
    });

    sinon.stub(nextRouter, "useRouter").returns({
      push: sinon.stub().resolves(true),
      query: {},
      pathname: "/shudong/123",
      route: "/shudong/[questionId]",
      asPath: "/shudong/123",
    } as unknown as NextRouter);
  });

  afterEach(() => {
    rtl.cleanup();
    sinon.restore();
  });

  after(() => {
    if (origTrpcDefaultDesc) {
      Object.defineProperty(trpcMod, "default", origTrpcDefaultDesc);
    }
    if (origTrpcNextDesc) {
      Object.defineProperty(trpcMod, "trpcNext", origTrpcNextDesc);
    }
    const extensions = (
      cjsRequire as NodeJS.Require & {
        extensions: Record<string, CssHandler | undefined>;
      }
    ).extensions;
    if (hadCssHandler) {
      extensions[".css"] = prevCssHandler;
    } else {
      delete extensions[".css"];
    }

    if (typeof window !== "undefined") {
      window.close();
    }
    cleanupJsdom?.();
    const globalObj = globalThis as Record<string, unknown>;
    delete globalObj.document;
    delete globalObj.window;
  });

  it("lets anonymous author edit and toggle anonymity off", async () => {
    const post = makePost({
      parentId: null,
      author: null,
      userIsAuthor: true,
      anonymousName: "匿名楼主",
    });

    const { getByLabelText, getByRole } = renderPostItem(post, baseUser, {
      isRootQuestion: true,
    });

    rtl.fireEvent.click(getByLabelText("编辑帖子"));

    const anonSwitch = getByLabelText("匿名提问") as HTMLInputElement;
    expect(anonSwitch.checked).to.equal(true);

    rtl.fireEvent.click(anonSwitch);
    expect(anonSwitch.checked).to.equal(false);

    await rtl.act(async () => {
      rtl.fireEvent.click(getByRole("button", { name: "保存" }));
      await Promise.resolve();
    });

    expect(updatePostMutateStub.calledOnce).to.equal(true);
    expect(updatePostMutateStub.firstCall.args[0]).to.deep.equal({
      postId: post.id,
      markdown: post.markdown,
      isAnonymous: false,
    });
  });

  it("resets anonymity on cancel and saves response toggle", async () => {
    const post = makePost({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      parentId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      author: { id: baseUser.id, name: baseUser.name, url: null },
      userIsAuthor: true,
      anonymousName: null,
    });

    const { getByLabelText, getByRole } = renderPostItem(post, baseUser);

    rtl.fireEvent.click(getByLabelText("编辑帖子"));

    const anonSwitch = getByLabelText("匿名回答") as HTMLInputElement;
    expect(anonSwitch.checked).to.equal(false);

    // Toggle on then cancel -> reopening edit should reset to false.
    rtl.fireEvent.click(anonSwitch);
    expect(anonSwitch.checked).to.equal(true);
    rtl.fireEvent.click(getByRole("button", { name: "取消" }));

    rtl.fireEvent.click(getByLabelText("编辑帖子"));
    const reopenedSwitch = getByLabelText("匿名回答") as HTMLInputElement;
    expect(reopenedSwitch.checked).to.equal(false);

    // Toggle on and save.
    rtl.fireEvent.click(reopenedSwitch);
    expect(reopenedSwitch.checked).to.equal(true);

    await rtl.act(async () => {
      rtl.fireEvent.click(getByRole("button", { name: "保存" }));
      await Promise.resolve();
    });

    expect(updatePostMutateStub.calledOnce).to.equal(true);
    expect(updatePostMutateStub.firstCall.args[0]).to.deep.equal({
      postId: post.id,
      markdown: post.markdown,
      isAnonymous: true,
    });
  });

  it("shows 匿名回复 label when editing a nested reply", () => {
    const post = makePost({
      id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      parentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      author: null,
      userIsAuthor: true,
      anonymousName: "匿名 甲",
    });

    const { getByLabelText } = renderPostItem(post, baseUser, {
      isNestedReply: true,
    });

    rtl.fireEvent.click(getByLabelText("编辑帖子"));
    const anonSwitch = getByLabelText("匿名回复") as HTMLInputElement;
    expect(anonSwitch.checked).to.equal(true);
  });

  it("hides anonymity toggle when admin edits others' post", async () => {
    const post = makePost({
      parentId: null,
      author: null,
      userIsAuthor: false,
      anonymousName: "匿名楼主",
      markdown: "Original text",
    });

    const { getByLabelText, getByRole, queryByLabelText } = renderPostItem(
      post,
      adminUser,
      { isRootQuestion: true },
    );

    rtl.fireEvent.click(getByLabelText("编辑帖子"));

    expect(queryByLabelText("匿名提问")).to.equal(null);
    expect(queryByLabelText("匿名回答")).to.equal(null);
    expect(queryByLabelText("匿名回复")).to.equal(null);

    const textarea = getByRole("textbox") as HTMLTextAreaElement;
    rtl.fireEvent.change(textarea, { target: { value: "Moderated text" } });

    await rtl.act(async () => {
      rtl.fireEvent.click(getByRole("button", { name: "保存" }));
      await Promise.resolve();
    });

    expect(updatePostMutateStub.calledOnce).to.equal(true);
    expect(updatePostMutateStub.firstCall.args[0]).to.deep.equal({
      postId: post.id,
      markdown: "Moderated text",
    });
  });

  it("hides edit/delete from non-author non-admin on anonymous post", () => {
    const post = makePost({
      parentId: null,
      author: null,
      userIsAuthor: false,
      anonymousName: "匿名楼主",
    });

    const { queryByLabelText } = renderPostItem(post, viewerUser, {
      isRootQuestion: true,
    });

    expect(queryByLabelText("编辑帖子")).to.equal(null);
    expect(queryByLabelText("删除帖子")).to.equal(null);
  });
});
