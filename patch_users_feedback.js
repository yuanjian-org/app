const fs = require('fs');
const file = 'src/api/routes/users.ts';

let code = fs.readFileSync(file, 'utf8');

// 1. Replace z.infer<typeof zUser> with User in updateImpl signature
code = code.replace(
    'input: z.infer<typeof zUser> & { wechatUnionId?: string | null },',
    'input: User & { wechatUnionId?: string | null },'
);

// 2. Add comment for the selfModule import
code = code.replace(
    'import * as selfModule from "./users";',
    '// Import self module to allow Sinon stubbing of exported functions in tests\nimport * as selfModule from "./users";'
);

fs.writeFileSync(file, code);
