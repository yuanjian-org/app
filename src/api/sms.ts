/**
 * Low-level API for sending transactional SMS. Use higher level API notify*()
 * when possible.
 */
import z from "zod";
import axios from "axios";
import { internalServerError } from "./errors";
import { chinaPhonePrefix } from "../shared/strings";

export async function sms(
  domesticTemplateId: string,
  internationalTemplateId: string,
  templateData: {
    to: string;
    vars: Record<string, string>;
  }[],
) {
  // Skip everything in unittest. https://stackoverflow.com/a/29183140
  if (typeof global.it === "function") return;

  console.log(
    `Sending SMS via Submail, template id:`,
    `["${domesticTemplateId}", "${internationalTemplateId}"],`,
    `data: ${JSON.stringify(templateData, null, 2)}`,
  );

  const responses = [];

  const domestic = templateData
    .filter((t) => t.to.startsWith(chinaPhonePrefix))
    .map((t) => ({
      to: t.to.slice(chinaPhonePrefix.length),
      vars: t.vars,
    }));
  if (domestic.length > 0) {
    const appid = process.env.SUBMAIL_DOMESTIC_APP_ID;
    const appKey = process.env.SUBMAIL_DOMESTIC_APP_KEY;
    if (!appKey || !appid) {
      console.log("Domestic Submail not configured. Skip actual API.");
      return;
    }

    const form = new FormData();
    form.append("appid", appid);
    form.append("signature", appKey);
    form.append("project", domesticTemplateId);
    form.append("multi", JSON.stringify(domestic));

    // https://www.mysubmail.com/documents/eM4rY2
    const response = await axios.post(
      "https://api-v4.mysubmail.com/sms/multixsend",
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    responses.push(response);
  }

  const international = templateData.filter(
    (t) => !t.to.startsWith(chinaPhonePrefix),
  );
  if (international.length > 0) {
    const appid = process.env.SUBMAIL_INTERNATIONAL_APP_ID;
    const appKey = process.env.SUBMAIL_INTERNATIONAL_APP_KEY;
    if (!appKey || !appid) {
      console.log("International Submail not configured. Skip actual API.");
      return;
    }

    const form = new FormData();
    form.append("appid", appid);
    form.append("signature", appKey);
    form.append("project", internationalTemplateId);
    form.append("multi", JSON.stringify(international));

    // https://www.mysubmail.com/documents/B70hy
    const response = await axios.post(
      "https://api-v4.mysubmail.com/internationalsms/multixsend",
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    responses.push(response);
  }

  for (const response of responses) {
    if (response.status !== 200) {
      console.log("部分短信发送失败：", response.status, response.data);
      throw internalServerError("短信发送失败。");
    }

    const result = z
      .array(
        z.object({
          status: z.string(),
          code: z.number().optional(),
          msg: z.string().optional(),
        }),
      )
      .parse(response.data);

    if (result.some((r) => r.status !== "success")) {
      console.log("部分短信发送失败：", result);
      throw internalServerError("短信发送失败。");
    }
  }
}

/**
 * Uncomment to debug. Command:
 *
 *  $ npx ts-node <filepath>
 */
// async function main() {
//   // Parse .env file for local development
//   // eslint-disable-next-line @typescript-eslint/no-require-imports
//   require("dotenv").config();
//   await sms("rw7iV2", [{ to: "15000000000", vars: { name: "你好" } }]);
// }
// void main().then(() => console.log("done"));
