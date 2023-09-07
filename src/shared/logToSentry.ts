enum LogLevel {
    ERROR,
    INFO
};

// logTosentry is called to use console logger to pass messages to Sentry/Issue as logging service
// Details like timestamp, and hostname/IP address should be included by Sentry 
const logToSentry = (tag: keyof typeof LogLevel, message: string, email?: string, data?: string | {}) => {
    if ((tag) === 'ERROR') {
        console.error('LOG', tag, message, formatLogger(email, data));
    };

    if ((tag) === 'INFO') {
        console.info('LOG', tag, message, formatLogger(email, data));
    };
};

function formatLogger(email?: string, data?: any) {
    let dataStr = '';
    if (!data) {
        dataStr = '';
    } else if (typeof data === 'string' || data instanceof String) {
        dataStr = '\ndata: ' + data;
    } else if (typeof data === 'object') {
        // convert to string if data type is object
        let str = '';
        for (let k in data) {
            if (data.hasOwnProperty(k)) {
                str += k + ': ' + data[k] + ',' + '\n';
            }
        }
        dataStr = '\ndata:{ \n' + str + '}';
    } else {
        dataStr = '\nERROR - invalid data Type';
    };
    return email ? "\nemail: " + email + dataStr : dataStr;
};

export default logToSentry;
