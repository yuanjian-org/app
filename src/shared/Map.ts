import { z } from "zod";

export const MAX_LANDMARK_SCORE = 4;

export const Longtitudes = [
    "情感",
    "智慧",
    "实践"
] as const;

export const zLongtitude = z.enum(Longtitudes);

export const Latitudes = [
    "个人成长",
    "事业发展",
    "社会责任"
] as const;

export const zLatitude = z.enum(Latitudes);

export type Latitude = z.TypeOf<typeof zLatitude>;

export const zLandmark = z.object({
    名称: z.string(),
    定义: z.string(),
    经度: zLongtitude,
    纬度: zLatitude,
    层级: z.array(z.string()).length(MAX_LANDMARK_SCORE),
    相关地标: z.array(z.string()).optional(),
    工具箱: z.string().optional(),
  });

export type Landmark = z.TypeOf<typeof zLandmark>;

export const zLandmarkScore = z.number().int().min(1).max(MAX_LANDMARK_SCORE);

export type LandmarkScore = z.TypeOf<typeof zLandmarkScore>;

export const zLandmarkAssessment = z.object({
    createdAt: z.date(),
    score: zLandmarkScore,
    markdown: z.string().nullable(),
});

export type LandmarkAssessment = z.TypeOf<typeof zLandmarkAssessment>;
