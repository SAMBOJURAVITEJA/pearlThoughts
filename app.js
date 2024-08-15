import express from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

app.use(express.json());


const backUpMailOptions = {
  from: process.env.BACK_UP_USER,
  to: process.env.GMAIL_USER,
  subject:  "Back Up Email",
  text: "This is a Back Up Email To Retrieve The Data",
};

// Configure primary email transporter (Gmail)
const primaryTransporter = nodemailer.createTransport({
  secure: false,
  host: "smtp.gmail.com",
  port: 587,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

// Configure backup email transporter (e.g., Yahoo or another SMTP service)
const backupTransporter = nodemailer.createTransport({
  secure: false,
  host: "smtp.gmail.com",
  port: 587,
  auth: {
    user: process.env.BACK_UP_USER,
    pass: process.env.BACK_UP_PASS,
  },
});

let failedAttempts = 0;

async function sendEmail(mailOptions) {
  let transporter = primaryTransporter;

  if (failedAttempts >= 3) {
    console.log("Switching to backup email service");
    transporter = backupTransporter;
    failedAttempts = 0; // Reset the failure counter after switching
  }

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
    failedAttempts = 0; // Reset the failure counter on success
  } catch (error) {
    console.error(`Email sending failed: ${error.message}`);
    failedAttempts++;
    if (failedAttempts < 3) {
      console.log(
        `Retrying with primary service (Attempt ${failedAttempts + 1})`
      );
      sendEmail(mailOptions); // Retry with the same transporter
    } else if (transporter === primaryTransporter) {
      console.log("Switching to backup service for next attempt");
      sendEmail(backUpMailOptions); // Switch to backup and retry
    } else {
      console.log("All attempts failed. Email not sent.");
    }
  }
}




// Define a route to trigger the email sending
app.post("/send-email", async (req, res) => {
  const { email, subject, text } = req.body;

  const primaryMailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: subject || "Test Email",
    text: text || "This is a test email with retry logic and fallback service.",
  };

  try {
    await sendEmail(primaryMailOptions);
    res.status(200).send("Email process initiated");
  } catch (error) {
    res.status(500).send("Failed to send email");
  }
});
