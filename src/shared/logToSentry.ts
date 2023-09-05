import { z } from 'zod';
// other details like timestamp, and hostname/ IP address should be included by Sentry
const zLogObject = z.object({
    message: z.string(),
    email: z.string().email().optional(),
    data: z.object({}).optional()
})

enum logLevel{
    ERROR,
    INFO
}

export type logObject = z.TypeOf<typeof zLogObject>;

const logToSentry = (tag: keyof typeof logLevel, logDetail: logObject) => {
    if ((tag) === 'ERROR') {
        console.error('LOG', tag, JSON.stringify(logDetail));
    }

    if ((tag) === 'INFO') {
        console.info('LOG', tag, JSON.stringify(logDetail));
    }
}

export default logToSentry;
