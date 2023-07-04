import { PersonalizationData } from '@sendgrid/helpers/classes/personalization';
import mail from '@sendgrid/mail';
import apiEnv from './apiEnv';
import User from './database/models/User';
import { Op } from 'sequelize';
import Role, { RoleProfiles } from '../shared/Role';
import z from 'zod';

mail.setApiKey(apiEnv.SENDGRID_API_KEY);

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
export async function email(templateId: string, personalization: PersonalizationData[], baseUrl: string) {
  // Always attach `base_url` as dynamic template data
  const ps: any[] = structuredClone(personalization);
  for (const p of ps) {
    if ('dynamicTemplateData' in p) {
      p.dynamicTemplateData.baseUrl = baseUrl;
    } else {
      p.dynamicTemplateData = { baseUrl: baseUrl };
    }
  }

  console.log(`Sending mail via SendGrid, template id: ${templateId}, personalizations: ${JSON.stringify(ps, null, 2)}`);
  await mail.send({
    personalizations: ps,
    templateId,
    from: {
      email: 'app@yuanjian.org',
      name: '远见教育平台',
    },
    replyTo: {
      email: 'hi@yuanjian.org',
      name: '远见团队',
    },
    trackingSettings: {
      openTracking: {
        enable: true,
      },
    }
  });
}

export async function emailIgnoreError(templateId: string, personalization: PersonalizationData[], baseUrl: string) {
  try {
    await email(templateId, personalization, baseUrl);
  } catch (e) {
    console.log(`emailIgnoreError() ignored error:`, e);
  }
}

export async function emailUserManagersIgnoreError(subject: string, content: string, baseUrl: string) {
  // Use type system to capture typos.
  const role : Role = "UserManager";

  const zTo = z.array(z.object({
    name: z.string(),
    email: z.string(),
  }));

  const managers = zTo.parse(await User.findAll({
    where: {
      // For some reason the compiler prefers `[role]` far more than `role`.
      roles: { [Op.contains]: [role] },
    },
    attributes: ['name', 'email'],
  }));

  await emailIgnoreError('d-99d2ae84fe654400b448f8028238d461', [{
    to: managers,
    dynamicTemplateData: { 
      subject, 
      content,
      roleDisplayName: RoleProfiles[role].displayName,
    },
  }], baseUrl);
}
