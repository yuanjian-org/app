import { PersonalizationData } from '@sendgrid/helpers/classes/personalization';
import mail from '@sendgrid/mail';
import apiEnv from './apiEnv';
import User from './database/models/User';
import { Op } from 'sequelize';
import Role, { RoleProfiles } from '../shared/Role';
import z from 'zod';

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
  const ps: any[] = structuredClone(personalization);
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

  await mail.send({
    personalizations: ps,
    templateId,
    from: {
      email: 'hi@mentors.org.cn',
      name: '社会导师服务平台',
    },
    replyTo: {
      email: 'hi@yuanjian.org',
      name: '社会导师服务平台',
    },
    trackingSettings: {
      openTracking: {
        enable: true,
      },
    }
  });
}

export function emailIgnoreError(templateId: string,
  personalization: PersonalizationData[], baseUrl: string)
{
  try {
    void email(templateId, personalization, baseUrl);
  } catch (e) {
    console.log(`emailIgnoreError() ignored error:`, e);
  }
}

export async function emailRole(
  role: Role,
  subject: string,
  content: string,
  baseUrl: string
) {
  const zTo = z.array(z.object({
    name: z.string(),
    email: z.string(),
  }));

  const managers = zTo.parse(await User.findAll({
    where: { roles: { [Op.contains]: [role] } },
    attributes: ['name', 'email'],
  }));

  await email('d-99d2ae84fe654400b448f8028238d461', [{
    to: managers,
    dynamicTemplateData: { 
      subject, 
      content,
      roleDisplayName: RoleProfiles[role].displayName,
    },
  }], baseUrl);
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
