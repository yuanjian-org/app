import fs from "fs";
import path from "path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChakraProvider } from "@chakra-ui/react";
import { I18nextProvider } from "react-i18next";
import i18next from "i18next";
import { JSDOM } from "jsdom";
import { expect } from "chai";
import sinon from "sinon";
import theme from "theme";
import Footer from "components/Footer";
import * as whiteLabelModule from "shared/WhiteLabel";
import type { WhiteLabel } from "shared/WhiteLabel";

const enCommonPath = path.resolve(
  __dirname,
  "../../public/locales/en/common.json",
);
const enCommon = JSON.parse(fs.readFileSync(enCommonPath, "utf8")) as Record<
  string,
  string
>;

async function renderFooter(
  label: WhiteLabel,
  locale: "zh" | "en" = "zh",
): Promise<Document> {
  sinon.stub(whiteLabelModule, "whiteLabel").value(label);

  const i18n = i18next.createInstance();
  await i18n.init({
    lng: locale,
    fallbackLng: false,
    ns: ["common"],
    defaultNS: "common",
    resources:
      locale === "en" ? { en: { common: enCommon } } : { zh: { common: {} } },
    interpolation: { escapeValue: false },
    initImmediate: false,
  });

  const footer = React.createElement(Footer);
  const themed = React.createElement(ChakraProvider, { theme }, footer);
  const element = React.createElement(I18nextProvider, { i18n }, themed);
  const html = renderToStaticMarkup(element);
  return new JSDOM(html).window.document;
}

describe("Footer", () => {
  const year = new Date().getFullYear();

  afterEach(() => {
    sinon.restore();
  });

  it("renders both copyright holders in a group on xhef", async () => {
    const doc = await renderFooter("xhef", "zh");
    const text = doc.body.textContent ?? "";

    expect(text).to.include(`© ${year} 杭州思烛教育科技有限公司`);
    expect(text).to.include(`© ${year} 新华爱心教育基金会`);
    expect(text).to.include("浙公网安备33040202000149");
    expect(text).to.include("浙ICP备09080143号-1");

    const beianHref =
      "https://beian.mps.gov.cn/#/query/webSearch?code=33040202000149";
    const beianLink = doc.querySelector(`a[href="${beianHref}"]`);
    expect(beianLink).to.not.equal(null);

    // Outer wrap + copyright group wrap + filing group wrap.
    const lists = doc.querySelectorAll(".chakra-wrap__list");
    expect(lists).to.have.lengthOf(3);

    const copyrightGroupText = lists[1]?.textContent ?? "";
    const filingGroupText = lists[2]?.textContent ?? "";
    expect(copyrightGroupText).to.include("杭州思烛教育科技有限公司");
    expect(copyrightGroupText).to.include("新华爱心教育基金会");
    expect(copyrightGroupText).to.not.include("浙公网安备");
    expect(filingGroupText).to.include("浙公网安备33040202000149");
    expect(filingGroupText).to.include("浙ICP备09080143号-1");
  });

  it("translates both copyright holders to English on xhef", async () => {
    const doc = await renderFooter("xhef", "en");
    const text = doc.body.textContent ?? "";

    expect(text).to.include("Hangzhou Sizhu Education Technology Co., Ltd.");
    expect(text).to.include("Xinhua Compassion Education Foundation");
    expect(text).to.not.include("新华爱心教育基金会");
  });

  it("omits 新华爱心教育基金会 on non-xhef deployments", async () => {
    const doc = await renderFooter("yuantu", "zh");
    const text = doc.body.textContent ?? "";

    expect(text).to.include(`© ${year} 杭州思烛教育科技有限公司`);
    expect(text).to.not.include("新华爱心教育基金会");
    expect(text).to.include("浙公网安备33010802014263");
    expect(text).to.include("浙ICP备2024117465号-4");
  });

  it("renders only Songding ICP on yqd and sylp", async () => {
    for (const label of ["yqd", "sylp"] as const) {
      sinon.restore();
      const doc = await renderFooter(label, "zh");
      const text = doc.body.textContent ?? "";

      expect(text).to.not.include("杭州思烛教育科技有限公司");
      expect(text).to.not.include("新华爱心教育基金会");
      expect(text).to.not.include("浙公网安备");
      expect(text).to.include("沪ICP备2021004288号");
    }
  });
});
