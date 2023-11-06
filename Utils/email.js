const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  // 1) Create a transporter
  let transporter = nodemailer.createTransport({
    host: "smtp-relay.sendinblue.com",
    port: 587,
    secure: false, // use SSL
    auth: {
      user: "ragheadb@gmail.com", // Your email
      pass: process.env.SMTP_KEY, // Your SMTP key from SendinBlue
    },
  });

  let mailOptions = {
    from: "Raghead Bahmad ragheadb@gmail.com", // sender address
    to: options.email, // list of receivers
    subject: options.subject,
    text: options.message,
  };

  transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
