1. **Fix Build Error in `src/api/webhooks/jinshuju/upload.ts`**
   - The TypeScript build fails because `profile` is typed as `UserProfile` which doesn't have an index signature for dynamic string keys. We need to cast `profile` to `any` or cast the key explicitly to `keyof UserProfile`.
   - Update `profile[mediaType + "链接"]` to `(profile as any)[mediaType + "链接"]` or `profile[(mediaType + "链接") as keyof typeof profile]`. Since `mediaType` is constrained to `"照片" | "视频"`, `mediaType + "链接"` strictly evaluates to `"照片链接" | "视频链接"`, which are valid keys on `UserProfile`. However, TypeScript doesn't statically infer `mediaType + "链接"` as `"照片链接" | "视频链接"`. Let's use `profile[(mediaType + "链接") as keyof typeof profile]`.

2. **Verify Build**
   - Run `yarn --ignore-engines build` to ensure the type error is resolved.

3. **Reply to PR Comments**
   - Reply to the comment indicating the build error has been fixed.
