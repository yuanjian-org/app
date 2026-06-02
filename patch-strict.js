const fs = require('fs');

// Patch 1: idTokens.test.ts stub restoration
let idTokens = fs.readFileSync('src/api/routes/idTokens.test.ts', 'utf8');

idTokens = idTokens.replace(
  /let checkStub = checkAndDeleteIdTokenModule\.checkAndDeleteIdToken;\n\s*if \(checkStub\.restore\) checkStub\.restore\(\);\n\s*checkStub = sinon\.stub\(checkAndDeleteIdTokenModule, "checkAndDeleteIdToken"\)\.resolves\(\);/g,
  `const checkStub = sinon.stub(checkAndDeleteIdTokenModule, "checkAndDeleteIdToken").resolves();`
);

idTokens = idTokens.replace(
  /let notifyStub = notifyModule\.notifyRolesIgnoreError;\n\s*if \(notifyStub\.restore\) notifyStub\.restore\(\);\n\s*notifyStub = sinon\.stub\(notifyModule, "notifyRolesIgnoreError"\)\.resolves\(\);/g,
  `const notifyStub = sinon.stub(notifyModule, "notifyRolesIgnoreError").resolves();`
);

fs.writeFileSync('src/api/routes/idTokens.test.ts', idTokens, 'utf8');

// Patch 2: ustcStudents.test.ts strictness
let ustc = fs.readFileSync('src/api/routes/ustcStudents.test.ts', 'utf8');
ustc = ustc.replace(/let error;/g, 'let error: any;');
fs.writeFileSync('src/api/routes/ustcStudents.test.ts', ustc, 'utf8');
