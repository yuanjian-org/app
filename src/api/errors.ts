import { TRPCError } from "@trpc/server";

type Kind = "用户" | "分组" | "评估" | "一对一匹配" | "资深导师匹配" | "面试" | "面试反馈" | "申请资料" | "面试讨论" | "会议转录"
  | "讨论空间" | "讨论消息";

export const notFoundError = (kind: Kind, id: string) =>
  new TRPCError({ code: 'NOT_FOUND', message: `${kind} ${id} 不存在。` });

export const noPermissionError = (kind: Kind, id?: string) =>
  new TRPCError({ code: 'FORBIDDEN', message: `没有权限访问${kind}${id ? ` ${id}` : ""}。` });

export const alreadyExistsErrorMessage = (kind: Kind) => `${kind}已经存在。`;

export const alreadyExistsError = (kind: Kind) =>
  new TRPCError({ code: 'BAD_REQUEST', message: alreadyExistsErrorMessage(kind) });

export const generalBadRequestError = (message: string) =>
  new TRPCError({ code: 'BAD_REQUEST', message });

export const conflictError = () =>
  new TRPCError({ code: "CONFLICT", message: "版本冲突" });

  export const notImplemnetedError = () =>
  new TRPCError({ code: "METHOD_NOT_SUPPORTED", message: "功能尚未实现" });
