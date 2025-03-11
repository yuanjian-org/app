/**
 * API for sending transactionalemails
 */

import { PersonalizationData } from '@sendgrid/helpers/classes/personalization';
import mail from '@sendgrid/mail';
import apiEnv from './apiEnv';
import User from './database/models/User';
import { Op } from 'sequelize';
import Role, { RoleProfiles } from '../shared/Role';
import z from 'zod';
import _ from 'lodash';
import axios from 'axios';
import { internalServerError } from './errors';

if (apiEnv.hasSendGrid()) mail.setApiKey(apiEnv.SENDGRID_API_KEY);

/**
 * Send email using SendGrid API. See https://docs.sendgrid.com/api-reference/mail-send/mail-send for parameter details.
 * Example personalizations:
 * 
    [{
      to: [
        {
          name: 'foo',
          email: 'bar',
        },
        {
          name: 'foo2',
          email: 'bar2',
        },
      ],
      dynamicTemplateData: { 
        key: value, 
        key2: value2,
      }
    }, ...]
 */
export async function email(templateId: string,
  personalization: PersonalizationData[], baseUrl: string)
{
  // Skip everything in unittest.
  // https://stackoverflow.com/a/29183140
  // TODO: Use mocking instead
  if (typeof global.it === 'function') return;

  // Always attach `baseUrl` as dynamic template data
  const ps: any[] = _.cloneDeep(personalization);
  for (const p of ps) {
    if ('dynamicTemplateData' in p) {
      p.dynamicTemplateData.baseUrl = baseUrl;
    } else {
      p.dynamicTemplateData = { baseUrl: baseUrl };
    }
  }

  console.log(`Sending mail via SendGrid, template id: ${templateId},` +
    ` personalizations: ${JSON.stringify(ps, null, 2)}`);
  if (!apiEnv.hasSendGrid()) {
    console.log('SendGrid not configured. Skip calling actual API.');
    return;
  }

  try {
    await mail.send({
      personalizations: ps,
      templateId,
      from: {
      email: 'no-reply@mentors.org.cn',
      name: '社会导师服务平台',
    },
    trackingSettings: {
      openTracking: {
        enable: true,
      },
      }
    });
  } catch (e) {
    // Log the error message from SendGrid
    // @ts-expect-error
    console.log(`email() failed:`, e.response.body);
    throw e;
  }
}

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

  await email2(users.map(u => u.email), 'E_114706970517', {
    subject,
    content,
    roleDisplayName: RoleProfiles[role].displayName,
    baseUrl,
  });
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
 * Send email via AoKSend.com. See https://www.aoksend.com/admin/apiconfig/index
 */
export async function emailOne(
  toEmail: string,
  templateId: string,
  templateData: Record<string, string>,
) {
  // Skip everything in unittest.
  // https://stackoverflow.com/a/29183140
  if (typeof global.it === 'function') return;

  console.log(`Sending mail via AoKSend, template id: ${templateId},` +
    ` to: ${toEmail}, data: ${JSON.stringify(templateData, null, 2)}`);

  const appKey = process.env.AOKSEND_APP_KEY;
  if (!appKey) {
    console.log('AoKSend not configured. Skip calling actual API.');
    return;
  }

  console.log(`key: "${appKey}"`);

  const form = new FormData();
  form.append('app_key', appKey);
  form.append('template_id', templateId);
  form.append('to', toEmail);
  form.append('data', JSON.stringify(templateData));

  const response = await axios.post(
    'https://www.aoksend.com/index/api/send_email',
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

export async function email2(
  toEmails: string[],
  templateId: string,
  templateData: Record<string, string>,
) {
  await Promise.all(toEmails.map(to => emailOne(to, templateId, templateData)));
}
