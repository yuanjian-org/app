1. Address the PR comment: the user wants to avoid the clever string concatenation `profile[(mediaType + "链接") as keyof typeof profile]` and explicitly use `mediaType === "照片" ? profile["照片链接"] : profile["视频链接"]` inside `src/api/webhooks/jinshuju/upload.ts`.
2. Apply the change to `src/api/webhooks/jinshuju/upload.ts`.
3. Run `yarn build` and `yarn test` to make sure it compiles and tests still pass.
4. Reply to the PR comment and submit.
