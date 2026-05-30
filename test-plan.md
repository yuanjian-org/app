Wait! In `Picture` component, the Link currently renders regardless of whether `uploadToken` is empty (if `isMe` is false, `pictureHmac` is undefined, `uploadToken` is `""`, and `getEmbeddedFormUrl("Bz3uSO", "")` generates a URL).
Wait, if `isMe` is false, we SHOULD NOT render the link!
Or if we do render the link for `UserManager`, `uploadToken` needs to be valid?
Wait, if `isMe === false`, can a UserManager upload a picture?
No, the Jinshuju webhook requires the token to have `userId`. We only fetch `getMediaChecksum` when `isMe` is true! So `UserManager` CANNOT upload picture for others using the Jinshuju form. They CAN only manually change the link in the text input box.
So yes, we should ONLY render the `Link` if `uploadToken` is valid (which implies `hmac` is available).
"do not display upload links until hmac is available."

Let's modify `src/pages/profiles/[userId].tsx`.
```typescript
function encodeJinshujuXField(
  whiteLabel: WhiteLabel,
  user: MinUser,
  hmac: string,
  target: UploadTarget,
) {
  return encodeXField(
    whiteLabel,
    user,
    encodeUploadTokenUrlSafe(target, user.id, hmac),
  );
}
```
And inside `Picture`:
```typescript
        {pictureHmac && (
          <Link
            as={NextLink}
            href={getEmbeddedFormUrl(
              "Bz3uSO",
              encodeJinshujuXField(whiteLabel, user, pictureHmac, "UserProfilePicture")
            )}
          >
            {profile.照片链接 ? (
              <HStack>
                <MdChangeCircle />
                <Text>更换照片</Text>
              </HStack>
            ) : (
              <HStack>
                <MdCloudUpload />
                <Text>上传照片</Text>
              </HStack>
            )}
          </Link>
        )}
```
Same for `Video`:
```typescript
      {videoHmac && (
        <Link
          as={NextLink}
          href={getEmbeddedFormUrl(
            "nhFsf1",
            encodeJinshujuXField(whiteLabel, user, videoHmac, "UserProfileVideo")
          )}
        >
          {profile.视频链接 ? (
            <HStack>
              <MdChangeCircle />
              <Text>更换视频</Text>
            </HStack>
          ) : (
            <HStack>
              <MdCloudUpload />
              <Text>上传视频</Text>
            </HStack>
          )}
        </Link>
      )}
```

This perfectly addresses the PR comment and handles `undefined` cleanly!
I will make this change now.
