import { TRPCError } from "@trpc/server";

type Kind = "用户" | "分组" | "评估" | "一对一匹配" | "资深导师匹配" | "面试"
  | "面试反馈" | "申请表" | "面试讨论" | "会议纪要" | "讨论空间" | "讨论消息" | "学生"
  | "学生状态" | "学生面试" | "导师" | "导师选择" | "待办事项"
  | "数据"; // A general kind

export const notFoundError = (kind: Kind, id: string) =>
  new TRPCError({ code: 'NOT_FOUND', message: `${kind} ${id} 不存在。` });

export const noPermissionError = (kind: Kind, id?: string) =>
  new TRPCError({ code: 'FORBIDDEN', message: `没有权限访问${kind}${id ? ` ${id}` : ""}。` });

export const alreadyExistsErrorMessage = (kind: Kind) => `${kind}已经存在。`;

export const alreadyExistsError = (kind: Kind) =>
  new TRPCError({ code: 'BAD_REQUEST', message: alreadyExistsErrorMessage(kind) });

/**
 * Add a period "。" at the end of the message
 */
export const generalBadRequestError = (message: string) =>
  new TRPCError({ code: 'BAD_REQUEST', message });

export const conflictError = () =>
  new TRPCError({ code: "CONFLICT", message: "版本冲突。" });

export const notImplemnetedError = () =>
  new TRPCError({ code: "METHOD_NOT_SUPPORTED", message: "功能尚未实现。" });

export const internalServerError = (message: string) =>
  new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
