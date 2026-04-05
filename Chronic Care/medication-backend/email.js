const sgMail = require('@sendgrid/mail');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendVerificationEmail(to, code) {
  const msg = {
    to,
    from: process.env.EMAIL_USER, // Your verified Single Sender email
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
  };
  
  try {
    await sgMail.send(msg);
    console.log(`[SendGrid] Verification email sent to ${to}`);
  } catch (err) {
    console.error('[SendGrid Error]', err.response?.body?.errors || err.message);
    throw err;
  }
}

async function sendEmail(to, subject, html, text) {
  const msg = {
    to,
    from: process.env.EMAIL_USER,
    subject,
    text: text || html?.replace(/<[^>]+>/g, '') || '',
    html: html || (text ? `<pre>${text}</pre>` : undefined)
  };

  try {
    await sgMail.send(msg);
    console.log(`[SendGrid] Email sent to ${to}`);
  } catch (err) {
    console.error('[SendGrid Error]', err.response?.body?.errors || err.message);
    throw err;
  }
}

module.exports = { sendVerificationEmail, sendEmail };