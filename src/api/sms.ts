/**
 * API for sending SMS
 */

import z from "zod";
import axios from "axios";
import { internalServerError } from "./errors";

/**
 * Send email via AoKSend.com
 */
export async function sms(
  templateId: string,
  templateData: {
    to: string;
    vars: Record<string, string>;
  }[],
) {
  // Skip everything in unittest. https://stackoverflow.com/a/29183140
  if (typeof global.it === "function") return;

  console.log(
    `Sending SMS via Submail, template id: ${templateId},` +
      ` data: ${JSON.stringify(templateData, null, 2)}`,
  );

  const appid = process.env.SUBMAIL_APP_ID;
  const appKey = process.env.SUBMAIL_APP_KEY;
  if (!appKey || !appid) {
    console.log("Submail not configured. Skip calling actual API.");
    return;
  }

  const form = new FormData();
  form.append("appid", appid);
  form.append("signature", appKey);
  form.append("project", templateId);
  form.append("multi", JSON.stringify(templateData));

  // https://www.mysubmail.com/documents/eM4rY2
  const response = await axios.post(
    "https://api-v4.mysubmail.com/sms/multixsend",
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );

  if (response.status !== 200) {
    console.log("短信发送失败：", response.status, response.data);
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
