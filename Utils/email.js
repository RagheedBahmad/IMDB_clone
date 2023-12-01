const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  // 1) Create a transporter
  let transporter = nodemailer.createTransport({
    host: "in-v3.mailjet.com",
    port: 587,
    secure: false, // use SSL
    auth: {
      user: process.env.SMTP_KEY, // Your email
      pass: process.env.SMTP_SECRET, // Your SMTP key from SendinBlue
    },
  });

  let mailOptions = {
    from: `"Raghead Bahmad" ragheadb@gmail.com`, // sender address
    to: options.email, // list of receivers
    subject: options.subject,
    text: options.message,
  };

  transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
