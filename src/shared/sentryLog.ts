import { z } from 'zod';
import moment from 'moment';
// other details like timestamp, and hostname/ IP address should be included by Sentry
const zLogObject = z.object({
    email: z.string().email().optional(),
    tag: z.string(z.enum(['error', 'info'])),
    //data: z.object({}).optional(),
    //data: z.array(z.string()).optional()
    data: z.string().optional()
})

// _authing_user variable at browser local storage
// only included keys of interest
// const zAuthingUser = z.object({
//     createdAt: z.string(),
//     email: z.string().email(),
//     lastIP: z.string(),
//     lastIp: z.string(),
//     lastLogin: z.string(),
//     token: z.string(),
//     tokenExpiredAt: z.string(),
//     updatedAt: z.string(),
// }).optional();

export type logObject = z.TypeOf<typeof zLogObject>;

export const logToSentry = (message: string, logDetail: logObject) => {
    if ((logDetail.tag) === 'error') {
        console.error(message, moment(), logDetail);
    }

    if ((logDetail.tag) === 'info') {
        console.info(message, moment(), logDetail);
    }
}
