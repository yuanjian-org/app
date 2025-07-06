import { Column, Table, Model } from "sequelize-typescript";
import { BIGINT, JSONB, UUID } from "sequelize";
import ZodColumn from "../modelHelpers/ZodColumn";
import z from "zod";

@Table
export default class InterviewFeedbackUpdateAttempt extends Model {
  @Column(UUID)
  userId: string;

  @Column(UUID)
  interviewFeedbackId: string;

  @ZodColumn(JSONB, z.record(z.string(), z.any()))
  feedback: Record<string, any> | null;

  @Column(BIGINT)
  etag: number;
}
