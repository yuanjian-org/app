/**
 * API for sending transactionalemails
 */

import User from './database/models/User';
import { Op } from 'sequelize';
import Role, { RoleProfiles } from '../shared/Role';
import z from 'zod';
import axios from 'axios';
import { internalServerError } from './errors';

export async function emailRole(
  role: Role,
  subject: string,
  content: string,
  baseUrl: string
) {
  const users = await User.findAll({
    where: { roles: { [Op.contains]: [role] } },
    attributes: ['email'],
  });

  await email(users.map(u => u.email), 'E_114706970517', {
    subject,
    content,
    roleDisplayName: RoleProfiles[role].displayName,
  }, baseUrl);
}

export function emailRoleIgnoreError(
  role: Role,
  subject: string,
  content: string,
  baseUrl: string
) {
  try {
    void emailRole(role, subject, content, baseUrl);
  } catch (e) {
    console.log(`emailRoleIgnoreError() ignored error:`, e);
  }
}

/**
 * Send email via AoKSend.com
 */
export async function emailOne(
  toEmail: string,
  templateId: string,
  templateData: Record<string, string>,
  baseUrl: string,
) {
  // Skip everything in unittest. https://stackoverflow.com/a/29183140
  if (typeof global.it === 'function') return;

  // Sanitize emojis as they would cause AoKSend API to return 500 error.
  const sanitized: Record<string, string> = { baseUrl };
  for (const [key, value] of Object.entries(templateData)) {
    // https://stackoverflow.com/a/72727900
    sanitized[key] = value.replace(/\p{Emoji_Presentation}/gu, '[表情符]');
  }

  console.log(`Sending mail via AoKSend, template id: ${templateId},` +
    ` to: ${toEmail}, data: ${JSON.stringify(sanitized, null, 2)}`);

  const appKey = process.env.AOKSEND_APP_KEY;
  if (!appKey) {
    console.log('AoKSend not configured. Skip calling actual API.');
    return;
  }

  const form = new FormData();
  form.append('app_key', appKey);
  form.append('template_id', templateId);
  form.append('to', toEmail);
  form.append('data', JSON.stringify(sanitized));

  /**
   * send_email_batch is an undocumented API provided by AoKSend support to
   * bypass the 3 per second rate limit of the official API described at
   * https://www.aoksend.com/doc/?id=86.
   * 
   * Currently we don't use the batch API to email multiple users at once. We
   * could do it in the future. Refer to the message from AoKSend support:
   * 
   * 参数其他的没变化 to 和 data 的格式变了
   * 
   * to 从字符串变成数组，123@163.com 变成['123@163.com','.....']
   * 
   * data 从 JSON 字符串变成数组
   * {"name":"张三","address":"深圳”} 变成
   * ['{"name":"张三","address":"深圳","{"name":"李四","address":"广州"}']
   * 多个收信人用不同的变量 有几个收信人填多少组变量如果多个收信人 共用同一个变量
   * 则只需要一组变量
   * 
   * 注意 php 的curl post 需要把二维数组参数 http_build_query
   */
  const response = await axios.post(
    'https://www.aoksend.com/index/api/send_email_batch',
    form, 
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );

  const result = z.object({
    code: z.number(),
    message: z.string(),
  }).parse(response.data);

  if (result.code !== 200) {
    throw internalServerError(`邮件发送失败：${result.code}｜${result.message}`);
  }
}

export async function email(
  toEmails: string[],
  templateId: string,
  templateData: Record<string, string>,
  baseUrl: string,
) {
  await Promise.all(toEmails.map(to =>
    emailOne(to, templateId, templateData, baseUrl)));
}

/**
 * Uncomment to debug. Command:
 * 
 *  $ npx ts-node <filepath>
 */
// async function main() {
//   for (let i = 0; i < 2; i++) {
//     await email(["test1@yopmail.com", "test2@yopmail.com", "test3@yopmail.com",
//       "test4@yopmail.com", "test5@yopmail.com"], "E_114706970517", {
//       subject: "test",
//       content: "test_batch",
//     }, "https://aoksend.com");
//   }
// }
// void main().then(() => console.log("done"));
