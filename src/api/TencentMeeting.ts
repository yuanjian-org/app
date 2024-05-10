import crypto from 'crypto';
import qs from 'qs';
import apiEnv from "./apiEnv";
import https from "https";
import http from "http";
import z, { TypeOf } from "zod";
import { TRPCError } from '@trpc/server';

const LOG_HEADER = "[TecentMeeting]";

const splitFirst = (s: string, separator: string) => {
  const idx = s.indexOf(separator);
  if (idx < 0) return [s];
  return [s.slice(0, idx), s.slice(idx + separator.length)];
};

const requestWithBody = async (body: string, options: {
  host: string,
  port: string,
  protocol: string,
  path: string,
  method: 'GET' | 'POST',
  headers: Record<string, string>
}) => {
  return new Promise<string>((resolve, reject) => {
    const callback = function (response: any) {
      let str = '';
      response.on('data', function (chunk: any) {
        str += chunk;
      });
      response.on('end', function () {
        resolve(str);
      });
    };

    const req = (options.protocol === 'https:' ? https : http)
      .request(options, callback);
    req.on('error', (e: Error) => {
      reject(e);
    });
    req.write(body);
    req.end();
  });
};

const sign = (
  secretId: string, secretKey: string,
  httpMethod: string, headerNonce: number,
  headerTimestamp: number, requestUri: string, requestBody: string
) => {
  const tobeSigned = `${httpMethod}\nX-TC-Key=${secretId}` +
    `&X-TC-Nonce=${headerNonce}&X-TC-Timestamp=${headerTimestamp}` +
    `\n${requestUri}\n${requestBody}`;
  const signature = crypto.createHmac('sha256', secretKey)
    .update(tobeSigned)
    .digest('hex');
  return Buffer.from(signature, "utf8").toString('base64');
};

/**
 * TODO: handle error responses
 * TODO: rewrite using `axios` and remove `requestWithBody`
 */
const tmRequest = async (
  method: 'POST' | 'GET',
  requestUri: string,
  query: Record<string, string | number>,
  body: Record<string, string> = {},
) => {
  const now = Math.floor(Date.now() / 1000);
  const hasQuery = Object.keys(query).length > 0;
  const pathWithQuery = requestUri + (hasQuery ? `?${qs.stringify(query)}` : "");

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
    bodyText
  );

  const headers = {
    // "Accept": "*/*",
    // "Accept-Encoding": "gzip, deflate",
    "Content-Type": "application/json",
    "X-TC-Key": apiEnv.TM_SECRET_ID,
    "AppId": apiEnv.TM_ENTERPRISE_ID,
    "SdkId": apiEnv.TM_APP_ID,
    "X-TC-Timestamp": "" + now,
    "X-TC-Nonce": "" + nonce,
    "X-TC-Signature": signature,
    "X-TC-Registered": "1"
  };

  const [protocol, rest] = splitFirst(url, '//');
  const [base, path] = splitFirst(rest, '/');
  const [host, _port] = splitFirst(base, ':');

  const port = _port ?? (protocol === 'http:' ? "80" : "443");

  return JSON.parse(await requestWithBody(bodyText, {
    host,
    port,
    path: "/" + path,
    protocol,
    method,
    headers,
  }));
};

/**
 * Create a meeting.
 * 
 * https://cloud.tencent.com/document/product/1095/42417
 */
export async function createMeeting(
  tmUserId: string,
  subject: string,
  startTimeSecond: number,
  endTimeSecond: number,
) {
  console.log(LOG_HEADER, `createMeeting('${subject}', ${startTimeSecond},` +
    ` ${endTimeSecond})`);

  const zRes = z.object({
    meeting_number: z.number(),
    meeting_info_list: z.array(z.object({
      subject: z.string(),
      meeting_id: z.string(),
      meeting_code: z.string(),
      type: z.number(),
      join_url: z.string().url(),
      hosts: z.array(z.object({
        userid: z.string(),
      })),
      start_time: z.string(),
      end_time: z.string(),
      settings: z.object({
        mute_enable_join: z.boolean(),
        allow_unmute_self: z.boolean(),
        mute_all: z.boolean(),
        mute_enable_type_join: z.number(),
      }),
      meeting_type: z.number(),
      enable_live: z.boolean(),
      media_set_type: z.number(),
      location: z.string(),
      host_key: z.string().optional(),
    })),
  });

  const res = await tmRequest('POST', '/v1/meetings', {}, {
    userid: tmUserId,
    instanceid: "1",
    subject: subject,
    start_time: "" + startTimeSecond,
    end_time: "" + endTimeSecond,
    type: "0", // 0: scheduled, 1: fast
  });

  return zRes.parse(res);
}

const paginationNotSupported = () => new TRPCError({
  code: 'METHOD_NOT_SUPPORTED',
  message: "Pagination isn't supported",
});

/**
 * List meeting info of the input meeting and tencent user id
 * https://cloud.tencent.com/document/product/1095/93432
 */
export async function getMeeting(meetingId: string, tmUserId: string) {
  console.log(LOG_HEADER, 'listMeetings()');
  const zRes = z.object({
    meeting_number: z.number(),
    meeting_info_list: z.array(z.object({
      subject: z.string(),
      meeting_id: z.string(),
      meeting_code: z.string(),
      status: z.string(),
      //type: 0,
      join_url: z.string(),
      start_time: z.string(),
      end_time: z.string(),
    }))
  });

  return zRes.parse(
    await tmRequest('GET', '/v1/meetings/' + meetingId,
      {
        userid: tmUserId,
        instanceid: "1",
      })
  ).meeting_info_list[0];
}

/**
 * List meeting recordings since 31 days ago (max allowed date range).
 * 
 * https://cloud.tencent.com/document/product/1095/51189
 */
export async function listRecords(tmUserId: string) {
  console.log(LOG_HEADER, 'listRecords()');
  const zRecordMeetings = z.object({
    meeting_record_id: z.string(), // needed for script download
    subject: z.string(),
    state: z.number(), // 3 - ready for download
    record_files: z.array(
      z.object({
        record_file_id: z.string(),
        record_start_time: z.number(),
        record_end_time: z.number(),
      })
    ).optional()
  });
  const zRes = z.object({
    total_count: z.number(),
    total_page: z.number(),
    record_meetings: z.array(zRecordMeetings).optional()
  });

  var ret: TypeOf<typeof zRecordMeetings>[] = [];
  var page = 1;
  while (true) {
    const res = zRes.parse(await tmRequest('GET', '/v1/records', {
      userid: tmUserId,
      // 31d is earliest allowed date
      start_time: JSON.stringify(Math.trunc(Date.now() / 1000 - 31 * 24 * 3600)),
      end_time: JSON.stringify(Math.trunc(Date.now() / 1000)),
      page_size: 20,  // max page size
      page
    }));
    ret = ret.concat(res.record_meetings || []);
    if (page >= res.total_page) break;
    page++;
  }
  return ret;
}

/**
 * Get record file download URLs given a meeting record id retrieved from
 * listRecords().
 * 
 * https://cloud.tencent.com/document/product/1095/51180
 */
export async function getFileAddresses(recordFileId: string, tmUserId: string) {
  console.log(LOG_HEADER, `getFileAddresses("${recordFileId}")`);

  const zURL = z.object({
    download_address: z.string().url(),
    file_type: z.string(),
  });

  const zRes = z.object({
    // Raw transcript
    // meeting_summary: z.array(zFile).optional(),

    // AI processed transcript
    ai_meeting_transcripts: z.array(zURL).optional(),

    // Meeting minutes and TODOs
    ai_minutes: z.array(zURL).optional(),
  });

  const res = zRes.parse(await tmRequest('GET', 
    `/v1/addresses/${recordFileId}`, { userid: tmUserId }));

  return res;
}

// Uncomment and modify this line to debug TM APIs.
// listRecords().then(res => console.log(JSON.stringify(res, null, 2)));
