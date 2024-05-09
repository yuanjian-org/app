import { loadEnvConfig } from '@next/env';
import {getAddresses, getChapters, getSummary, listRecords} from "../src/api/TencentMeeting";
import apiEnv from "../src/api/apiEnv";
loadEnvConfig('./');

// listRecords(apiEnv.TM_USER_IDS[0]).then((res) => {
//   console.log(res);
//   const record_file_id = res[0]?.record_files?.[0].record_file_id;
//   if (!record_file_id) {
//     return;
//   }
//
//   getSummary(apiEnv.TM_USER_IDS[0], record_file_id).then(console.log);
// });

// getSummary(apiEnv.TM_USER_IDS[0], '1786969809404370945').then(console.log);
// getChapters(apiEnv.TM_USER_IDS[0], '1786969809404370945').then(console.log);
getAddresses(apiEnv.TM_USER_IDS[0], '1786969809404370945').then(console.log);
