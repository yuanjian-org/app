import { z } from "zod";

export const zUpload = z.object({
  uploader: z.string(),
  urls: z.array(z.string()),
  // For some reason optional() is needed to avoid ts type check errors.
  createdAt: z.coerce.string().optional(),
});
type Upload = z.TypeOf<typeof zUpload>;

export default Upload;
