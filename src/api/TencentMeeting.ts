import crypto from "crypto";
import qs from "qs";
import apiEnv from "./apiEnv";
import https from "https";
import http from "http";
import z, { TypeOf } from "zod";
import { internalServerError } from "./errors";

const LOG_HEADER = "[TecentMeeting]";

const splitFirst = (s: string, separator: string) => {
  const idx = s.indexOf(separator);
  if (idx < 0) return [s];
  return [s.slice(0, idx), s.slice(idx + separator.length)];
};

const requestWithBody = (
  body: string,
  options: {
    host: string;
    port: string;
    protocol: string;
    path: string;
    method: "GET" | "POST" | "PUT";
    headers: Record<string, string>;
  },
) => {
  return new Promise<string>((resolve, reject) => {
    const callback = function (response: any) {
      let str = "";
      response.on("data", function (chunk: any) {
        str += chunk;
      });
      response.on("end", function () {
        resolve(str);
      });
    };

    const req = (options.protocol === "https:" ? https : http).request(
      options,
      callback,
    );
    req.on("error", (e: Error) => {
      reject(e);
    });
    req.write(body);
    req.end();
  });
};

const sign = (
  secretId: string,
  secretKey: string,
  httpMethod: string,
  headerNonce: number,
  headerTimestamp: number,
  requestUri: string,
  requestBody: string,
) => {
  const tobeSigned =
    `${httpMethod}\nX-TC-Key=${secretId}` +
    `&X-TC-Nonce=${headerNonce}&X-TC-Timestamp=${headerTimestamp}` +
    `\n${requestUri}\n${requestBody}`;
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(tobeSigned)
    .digest("hex");
  return Buffer.from(signature, "utf8").toString("base64");
};

/**
 * TODO: rewrite using `axios` and remove `requestWithBody`
 */
const tmRequest = async (
  method: "GET" | "POST" | "PUT",
  requestUri: string,
  query: Record<string, string | number>,
  body: Record<string, any> = {},
) => {
  const now = Math.floor(Date.now() / 1000);
  const hasQuery = Object.keys(query).length > 0;
  const pathWithQuery =
    requestUri + (hasQuery ? `?${qs.stringify(query)}` : "");

  // authentication docs location
  // https://cloud.tencent.com/document/product/1095/42413
  const url = "https://api.meeting.qq.com" + pathWithQuery;
  const nonce = Math.floor(Math.random() * 100000);
  const bodyText = method === "GET" ? "" : JSON.stringify(body);

  const signature = sign(
    apiEnv.TM_SECRET_ID,
    apiEnv.TM_SECRET_KEY,
    method,
    nonce,
    now,
    pathWithQuery,
    bodyText,
  );

  const headers = {
    // "Accept": "*/*",
    // "Accept-Encoding": "gzip, deflate",
    "Content-Type": "application/json",
    "X-TC-Key": apiEnv.TM_SECRET_ID,
    AppId: apiEnv.TM_ENTERPRISE_ID,
    SdkId: apiEnv.TM_APP_ID,
    "X-TC-Timestamp": "" + now,
    "X-TC-Nonce": "" + nonce,
    "X-TC-Signature": signature,
    "X-TC-Registered": "1",
  };

  const [protocol, rest] = splitFirst(url, "//");
  const [base, path] = splitFirst(rest, "/");
  const [host, _port] = splitFirst(base, ":");

  const port = _port ?? (protocol === "http:" ? "80" : "443");

  const res = JSON.parse(
    await requestWithBody(bodyText, {
      host,
      port,
      path: "/" + path,
      protocol,
      method,
      headers,
    }),
  );

  if ("error_info" in res) {
    const e = res.error_info;
    throw internalServerError(
      `腾讯会议后台错误：${e.message}` +
        ` 错误码：${e.new_error_code}` +
        (e.error_code !== e.new_error_code
          ? `（旧错误码：${e.error_code}）`
          : ""),
    );
  }
  return res;
};

const defaultInstanceId = "1";

/**
 * https://cloud.tencent.com/document/product/1095/42417
 */
export async function createRecurringMeeting(
  tmUserId: string,
  subject: string,
  startTimeSecond: number,
  endTimeSecond: number,
) {
  console.log(
    LOG_HEADER,
    `createRecurringMeeting('${subject}',
    ${startTimeSecond}, ${endTimeSecond})`,
  );

  const res = await tmRequest(
    "POST",
    "/v1/meetings",
    {},
    {
      userid: tmUserId,
      instanceid: defaultInstanceId,
      subject,
      start_time: startTimeSecond.toString(),
      end_time: endTimeSecond.toString(),
      type: 0,
      meeting_type: 1,
      recurring_rule: {
        recurring_type: 4,
        until_type: 1,
        until_count: 50,
      },
    },
  );

  return z
    .object({
      meeting_info_list: z.array(
        z.object({
          meeting_id: z.string(),
          join_url: z.string().url(),
        }),
      ),
    })
    .parse(res);
}

/**
 * https://cloud.tencent.com/document/product/1095/42424
 */
export async function updateMeeting(
  meetingId: string,
  tmUserId: string,
  subject: string,
) {
  console.log(LOG_HEADER, `updateMeeting('${meetingId}', '${subject}')`);

  await tmRequest(
    "PUT",
    `/v1/meetings/${meetingId}`,
    {},
    {
      userid: tmUserId,
      instanceid: defaultInstanceId,
      subject,
    },
  );
}

/**
 * https://cloud.tencent.com/document/product/1095/93432
 */
export async function getMeeting(meetingId: string, tmUserId: string) {
  console.log(LOG_HEADER, "getMeeting()");
  return z
    .object({
      meeting_info_list: z.array(
        z.object({
          subject: z.string(),
          meeting_id: z.string(),
          meeting_code: z.string(),
          status: z.string(),
          //type: 0,
          join_url: z.string(),
          start_time: z.string(),
          end_time: z.string(),
        }),
      ),
    })
    .parse(
      await tmRequest("GET", "/v1/meetings/" + meetingId, {
        userid: tmUserId,
        instanceid: defaultInstanceId,
      }),
    ).meeting_info_list[0];
}

const zMeetingRecord = z.object({
  meeting_id: z.string(),
  meeting_record_id: z.string(), // needed for script download
  state: z.number(), // 3 - ready for download
  record_files: z
    .array(
      z.object({
        record_file_id: z.string(),
        record_start_time: z.number(),
        record_end_time: z.number(),
      }),
    )
    .optional(),
});
export type MeetingRecord = TypeOf<typeof zMeetingRecord>;

/**
 * List meeting recordings since 31 days ago (max allowed date range).
 *
 * https://cloud.tencent.com/document/product/1095/51189
 */
export async function listRecords(tmUserId: string): Promise<MeetingRecord[]> {
  console.log(LOG_HEADER, "listRecords()");
  const zRes = z.object({
    total_count: z.number(),
    total_page: z.number(),
    record_meetings: z.array(zMeetingRecord).optional(),
  });

  let ret: MeetingRecord[] = [];
  let page = 1;
  while (true) {
    const res = zRes.parse(
      await tmRequest("GET", "/v1/records", {
        userid: tmUserId,
        // 31d is earliest allowed date
        start_time: JSON.stringify(
          Math.trunc(Date.now() / 1000 - 31 * 24 * 3600),
        ),
        end_time: JSON.stringify(Math.trunc(Date.now() / 1000)),
        page_size: 20, // max page size
        page,
      }),
    );
    ret = ret.concat(res.record_meetings || []);
    if (page >= res.total_page) break;
    page++;
  }
  return ret;
}

const zOptionalFileAddresses = z
  .array(
    z.object({
      download_address: z.string().url(),
      file_type: z.string(),
    }),
  )
  .optional();
export type FileAddresses = TypeOf<typeof zOptionalFileAddresses>;

/**
 * Get record file download URLs given a meeting record id retrieved from
 * listRecords().
 *
 * https://cloud.tencent.com/document/product/1095/51180
 */
export async function getKey2FileAddresses(
  recordFileId: string,
  tmUserId: string,
) {
  console.log(LOG_HEADER, `getFileAddresses("${recordFileId}")`);

  const zRes = z.object({
    // Meeting minutes and TODOs
    ai_minutes: zOptionalFileAddresses,

    // Transcripts, summaries, minutes saved in the database but inaccessible
    // to users.
    ai_meeting_transcripts: zOptionalFileAddresses,
    meeting_summary: zOptionalFileAddresses,
    ai_topic_minutes: zOptionalFileAddresses,
    ai_speaker_minutes: zOptionalFileAddresses,
    ai_ds_minutes: zOptionalFileAddresses,
  });

  const res = zRes.parse(
    await tmRequest("GET", `/v1/addresses/${recordFileId}`, {
      userid: tmUserId,
    }),
  );

  return res;
}

export type SpeakerStats = {
  speakerName: string;
  totalTime: number;
}[];

// https://cloud.tencent.com/document/product/1095/105659
export async function getSpeakerStats(
  recordFileId: string,
  tmUserId: string,
): Promise<SpeakerStats> {
  console.log(LOG_HEADER, `getSpeakerStats("${recordFileId}")`);

  const zRes = z.object({
    speaker_list: z
      .array(
        z.object({
          speaker_name: z.string(),
          total_time: z.number(),
        }),
      )
      .optional(),
  });

  const res = zRes.parse(
    await tmRequest("GET", `/v1/smart/speakers`, {
      record_file_id: recordFileId,
      operator_id_type: 1,
      operator_id: tmUserId,
      page_size: 50,
      page: 1,
    }),
  );

  const stats: SpeakerStats = [];
  for (const speaker of res.speaker_list || []) {
    stats.push({
      speakerName: decodeBase64(speaker.speaker_name),
      totalTime: millisecondsToMinutes(speaker.total_time),
    });
  }

  return stats;
}

function decodeBase64(base64: string): string {
  return Buffer.from(base64, "base64").toString("utf-8");
}

function millisecondsToMinutes(milliseconds: number): number {
  return Math.round(milliseconds / 60000);
}

/**
 * Uncomment this line to debug. Command:
 *
 *  $ npx ts-node src/api/TencentMeeting.ts
 */

// void getFileAddresses("1984469546266210305", "h1").then((res) => {
//   console.log(res);
// });
