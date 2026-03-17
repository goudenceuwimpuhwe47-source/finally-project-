const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'goudenceuwimpuhwe47@gmail.com',
    pass: 'yuwhtxwxonnzdmvz'
  }
});

async function sendVerificationEmail(to, code) {
  await transporter.sendMail({
    from: 'Medication Ordering System <goudenceuwimpuhwe47@gmail.com>',
    to,
    subject: 'Your Medication Ordering System Verification Code',
    text: `Welcome to the Medication Ordering System!\n\nYour verification code is: ${code}\n\nPlease enter this code in the app to verify your account. The code is valid for 24 hours.\n\nIf you did not request this, please ignore this email.\n\nThank you!`,
    html: `<div style="font-family: Arial, sans-serif; color: #222;">
      <h2>Welcome to the Medication Ordering System!</h2>
      <p>Your verification code is:</p>
      <div style="font-size: 2em; font-weight: bold; color: #1976d2;">${code}</div>
      <p>Please enter this code in the app to verify your account. The code is valid for 24 hours.</p>
      <p>If you did not request this, please ignore this email.</p>
      <br>
      <p>Thank you!</p>
    </div>`
  });
}

async function sendEmail(to, subject, html, text) {
  await transporter.sendMail({
    from: 'Medication Ordering System <medicationorderingsystemforchr@gmail.com>',
    to,
    subject,
    text: text || html?.replace(/<[^>]+>/g, '') || '',
    html: html || (text ? `<pre>${text}</pre>` : undefined)
  });
}

module.exports = { sendVerificationEmail, sendEmail };