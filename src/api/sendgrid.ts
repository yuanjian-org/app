import { PersonalizationData } from '@sendgrid/helpers/classes/personalization';
import mail from '@sendgrid/mail';
import apiEnv from './apiEnv';
import User from './database/models/User';
import { Op } from 'sequelize';
import Role from '../shared/Role';

mail.setApiKey(apiEnv.SENDGRID_API_KEY);

/**
 * Send email using SendGrid API. See https://docs.sendgrid.com/api-reference/mail-send/mail-send for parameter details.
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

  console.log(`Sending mail via SendGrid: ${JSON.stringify(ps, null, 2)}`);
  await mail.send({
    personalizations: ps,
    from: apiEnv.SENDGRID_FROM_EMAIL,
    templateId,
  });
}

export async function emailUserManagersIgnoreError(subject: string, content: string, baseUrl: string) {
  try {
    // Use type system to capture typos.
    const role : Role = "UserManager";
    const admins = await User.findAll({
      where: {
        roles: { [Op.contains]: [role] },
      }
    });
    await email('d-99d2ae84fe654400b448f8028238d461', [{
      to: admins.map(({ name, email }) => ({ name, email })),
      dynamicTemplateData: { subject, content },
    }], baseUrl);
  } catch (e) {
    console.log(`Error ignored in emailAdminsIgnoreError("${subject}", "${content}")`, e);
  }
}
