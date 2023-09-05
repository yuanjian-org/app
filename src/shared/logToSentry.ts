enum LogLevel {
    ERROR,
    INFO
};

// logTosentry is called to use console logger to pass messages to Sentry/Issue as logging service
// Details like timestamp, and hostname/IP address should be included by Sentry 
const logToSentry = (tag: keyof typeof LogLevel, message: string, email?: string, data?: string | {}) => {
    if ((tag) === 'ERROR') {
        console.error('LOG', tag, message + ", user: " + email, formatData(data));
    };

    if ((tag) === 'INFO') {
        console.info('LOG', tag, message + ", user: " + email, formatData(data));
    };
};

function formatData(data: any | undefined) {
    if (!data) { return '' };
    if (typeof data === 'string' || data instanceof String) { return "\nadditional data:" + data };
    // convert to string if data type is object
    if (typeof data === 'object') {
        var str = '';
        for (var k in data) {
            if (data.hasOwnProperty(k)) {
                str += k + ': ' + data[k] + ',' + '\n';
            }
        }
        return "\nadditional data:{ \n" + str + "}";
    } else {
        return "ERROR - invalid data Type";
    };
};

export default logToSentry;
