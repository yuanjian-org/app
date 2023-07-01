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
export async function email(template_id: string, personalization: PersonalizationData[]) {
  console.log(`Sending mail via SendGrid: ${JSON.stringify(personalization, null, 2)}`)
  await mail.send({
    personalizations: personalization,
    from: apiEnv.SENDGRID_FROM_EMAIL,
    templateId: template_id,
  });
}

export async function emailAdminsIgnoreError(subject: string, content: string) {
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
    }]);
  } catch (e) {
    console.log(`Error ignored in emailAdminsIgnoreError("${subject}", "${content}")`, e);
  }
}
