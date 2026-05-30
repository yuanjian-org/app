1. Address PR comment: "require hmac. do not display upload links until hmac is available."
   - In `src/pages/profiles/[userId].tsx`, `encodeJinshujuXField` should require `hmac: string` (no `undefined`).
   - If `hmac` is not available, we should not render the `Link` components containing the "上传照片" (Upload Picture) / "上传视频" (Upload Video) buttons in the `Picture` and `Video` components.
   - Wait, if `isMe === false` (user is viewing someone else's profile), they shouldn't see the upload links anyway! Currently, they ARE seeing them if they are a `UserManager`?
     Let's check the existing visibility logic.
     Wait, in `Picture`, the `Link` is rendered. Is it hidden if `isMe` is false?
     Let's look at `Picture` and `Video` components.
