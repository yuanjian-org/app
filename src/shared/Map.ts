import { z } from "zod";

export const Longtitudes = [
    "情感",
    "智慧",
    "实践"
] as const;

export const zLongtitudes = z.enum(Longtitudes);

export const Latitudes = [
    "个人成长",
    "事业发展",
    "社会责任"
] as const;

export const zLatitudes = z.enum(Latitudes);

export const zLandmark = z.object({
    定义: z.string(),
    经度: zLongtitudes,
    纬度: zLatitudes,
    层级: z.array(z.string()).length(4),
    相关地标: z.array(z.string()).optional(),
    工具箱: z.string().optional(),
  });

export type Landmark = z.TypeOf<typeof zLandmark>;
