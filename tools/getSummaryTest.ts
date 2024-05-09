import { loadEnvConfig } from '@next/env';

import { getAddresses } from "../src/api/TencentMeeting";
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

// console.log("Decoded smart/fullsummary:");
// getSummary(apiEnv.TM_USER_IDS[0], '1786969809404370945').then(console.log);

// console.log("Decoded smart/chapters:");
// getChapters(apiEnv.TM_USER_IDS[0], '1786969809404370945').then(console.log);

console.log("Segmented summary ( refer ai_minutes object)");
getAddresses(apiEnv.TM_USER_IDS[0], '1786969809404370945').then(console.log);
