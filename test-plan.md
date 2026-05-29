1. **Update `src/shared/strings.ts`**
   - Modify `shaChecksum` to accept `any` instead of `Record<string, any>`, or modify it to accept `unknown`. Actually, looking at `stringifyStable`, it is likely `fast-json-stable-stringify` which takes `any`.

2. **Update Frontend (`src/pages/profiles/[userId].tsx`)**
   - In `encodeJinshujuXField`, pass a third argument for the url, or compute the `shaChecksum` directly inside the component and pass the sha to the function. Let's just modify `encodeJinshujuXField` signature to take `urlToHash: string | undefined` instead of `profile: UserProfile`.
   - Update `Picture` and `Video` components to use the new `encodeJinshujuXField` signature.

3. **Update Backend (`src/api/webhooks/jinshuju/upload.ts`)**
   - Inside `uploadUserProfileMedia`, instead of `const localSha = shaChecksum(profile);`, use `const localSha = shaChecksum(profile[mediaType + "链接"]);`.

4. **Update Tests (`src/api/webhooks/jinshuju/upload.test.ts`)**
   - Update the checksum computations to hash the specific url (`localProfile["照片链接"]` or `localProfile["视频链接"]`) rather than the entire `localProfile`.
   - Verify tests pass.

5. **Complete pre-commit steps**
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
