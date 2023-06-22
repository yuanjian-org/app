import { PersonalizationData } from '@sendgrid/helpers/classes/personalization';
import mail, { MailDataRequired } from '@sendgrid/mail';
import apiEnv from './apiEnv';
import User from './database/models/User';
import { Op } from 'sequelize';

mail.setApiKey(apiEnv.SENDGRID_API_KEY);

export const sendEmail = async (personalization: PersonalizationData[], template_id: string) => {

    console.log(`Sending mail via SendGrid: ${JSON.stringify(personalization, null, 2)}`)

    const message: MailDataRequired = {
        personalizations: personalization,
        // change to email linked to API key, otherwise would cause error
        from: 'yuanjian@email.com', 
        templateId: template_id,
    }

    await mail.send(message);

}

export const sendEmailToAdmin = async (new_user_email: string) => {
    const template_id = 'd-2e3aabdb9a3c45a393877596534c57c2'; // temporary holder, change to required template id

    const admin = await User.findAll({
        where: {
            roles: { [Op.contains]: ["ADMIN"] },
        }
    })

    const toSend = admin.map(({ name, email }) => ({ name, email }))

    const personalizations: PersonalizationData[] = [{
        to: toSend,
        // edit accordingly on the template parameters
        dynamicTemplateData: {
            receiver: 'Admin',
            new_user_email: new_user_email,
            sender: 'Yuanjian Admin Group',
        },
    }];

    await sendEmail(personalizations, template_id);

}