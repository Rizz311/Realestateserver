const ical = require('ical-generator');
const moment = require('moment');
const nodemailer = require('nodemailer');

function mailCalendarInvite(start, end, comments, toEmail) {
  // create reusable transporter object using the default SMTP transport
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: (process.env.AGENT_APPT_EMAIL || 'masaltzman.sendmail@gmail.com'),
      pass: (process.env.AGENT_APPT_EMAIL_PASSWORD || 'Gmail1234??'),
    },
  });

  // const eventContent = 'BEGIN:VCALENDAR\nVERSION:1.0\nBEGIN:VEVENT\nDTSTART:'+
  // '20190107T090000\nDTEND:20190107T100000\nLOCATION:home\n'+'
  // DESCRIPTION:my event\nSUMMARY:test\nPRIORITY:3\nEND:VEVENT\nEND:VCALENDAR';

  const event = {
    start, // ES6!!!!
    end,
    timestamp: moment(),
    summary: `Meeting with Real Estate Agent ${process.env.AGENT_FULL_NAME || '(Agent name goes here)'  }\n\n----\n${comments}`,
    // eslint-disable-next-line prefer-template
    organizer: (process.env.AGENT_FULL_NAME || 'Agent name goes here') + '<' + (process.env.AGENT_APPT_EMAIL || 'masaltman@gmail.com') + '>'
  };
  console.log('EVENT:', event);
  const eventContent = ical({
    events: [
      event,
    ],
  }).toString();

  const mailOptions = {
    from: (process.env.AGENT_EMAIL || '"Mark Saltzman" <masaltzman.sendmail@gmail.com>'),
    to: [toEmail, (process.env.AGENT_EMAIL || 'masaltzman@gmail.com')],
    // eslint-disable-next-line prefer-template
    subject: 'Your meeting with Real Estate Agent ' + (process.env.AGENT_FULL_NAME || '(Agent name goes here)'),
    // eslint-disable-next-line prefer-template
    text: "Thank-you for making an appointment to discuss your real estate needs. Add this event to your calendar and we'll talk soon\n\n Best, " + (process.env.AGENT_FIRST_NAME || '(Agent first name goes here)') + '\n\n----\nYour comments: ' + comments, // plain text body
    icalEvent: {
      filename: 'invitation.ics',
      method: 'request',
      content: eventContent,
    },
  };

  // send invite
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log(error);
    }
    console.log('Message sent: %s', info.messageId);
    // Preview only available when sending through an Ethereal account
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    return info;
  });
}

module.exports = {
  mailCalendarInvite,
};
// sendCalendarInvitation(moment(), moment().add(1, 'hour'),
// 'need to talk about selling our house', 'masaltzman@gmail.com');