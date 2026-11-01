const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

/**
 * Creates and returns the nodemailer transporter using environment variables.
 */
function createTransporter() {
  const service = process.env.SMTP_SERVICE || "gmail";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    logger.warn("SMTP credentials (SMTP_USER / SMTP_PASS) not configured in environment variables.");
  }

  // Custom SMTP server vs built-in service (like Gmail)
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user, pass },
    });
  }

  return nodemailer.createTransport({
    service: service,
    auth: { user, pass },
  });
}

/**
 * Builds responsive HTML email template for contact submissions
 */
function buildHtmlEmail({ name, email, subject, message, submissionTime, docId }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Contact Query - AJHA Consultancy</title>
</head>
<body style="margin:0;padding:0;background-color:#0c0e16;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e0e0e0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0c0e16;padding:30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background-color:#1a1c26;border-radius:8px;overflow:hidden;border:1px solid #2a2d3d;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, #1a1c26 0%, #252836 100%);padding:25px 30px;border-bottom:3px solid #ff6600;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <h2 style="margin:0;color:#ffffff;font-size:20px;letter-spacing:1px;font-weight:700;">AJHA CONSULTANCY SERVICES</h2>
                    <p style="margin:5px 0 0 0;color:#ff6600;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">New Website Contact Inquiry</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding:30px;">
              <p style="margin:0 0 20px 0;font-size:15px;color:#dcdcdc;line-height:1.6;">
                You have received a new inquiry submitted through the <strong>ajhaconsultancy.com</strong> contact form.
              </p>

              <!-- Details Table -->
              <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#12141d;border-radius:6px;border:1px solid #282b3a;margin-bottom:25px;">
                <tr>
                  <td style="padding:12px 18px;border-bottom:1px solid #282b3a;color:#ff6600;font-weight:600;width:120px;font-size:14px;">From:</td>
                  <td style="padding:12px 18px;border-bottom:1px solid #282b3a;color:#ffffff;font-size:14px;font-weight:500;">${name}</td>
                </tr>
                <tr>
                  <td style="padding:12px 18px;border-bottom:1px solid #282b3a;color:#ff6600;font-weight:600;font-size:14px;">Email:</td>
                  <td style="padding:12px 18px;border-bottom:1px solid #282b3a;font-size:14px;">
                    <a href="mailto:${email}" style="color:#4da3ff;text-decoration:none;font-weight:500;">${email}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 18px;border-bottom:1px solid #282b3a;color:#ff6600;font-weight:600;font-size:14px;">Subject:</td>
                  <td style="padding:12px 18px;border-bottom:1px solid #282b3a;color:#ffffff;font-size:14px;">${subject}</td>
                </tr>
                <tr>
                  <td style="padding:12px 18px;color:#ff6600;font-weight:600;font-size:14px;">Received At:</td>
                  <td style="padding:12px 18px;color:#a0a0a0;font-size:13px;">${submissionTime}</td>
                </tr>
              </table>

              <!-- Message Section -->
              <h4 style="margin:0 0 10px 0;color:#ffffff;font-size:15px;font-weight:600;">Message Content:</h4>
              <div style="background-color:#12141d;border-left:4px solid #ff6600;padding:16px 20px;border-radius:0 6px 6px 0;color:#e8e8e8;font-size:14px;line-height:1.7;white-space:pre-wrap;">${message}</div>

              <!-- Action Button -->
              <div style="margin-top:30px;text-align:center;">
                <a href="mailto:${email}?subject=Re: ${encodeURIComponent(subject)}" style="display:inline-block;background-color:#ff6600;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:5px;font-weight:600;font-size:14px;">
                  Reply Directly to ${name}
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 30px;background-color:#12141d;border-top:1px solid #242735;text-align:center;">
              <p style="margin:0;color:#7a7d8d;font-size:12px;">
                Record ID: <code style="color:#ff6600;background:#1a1c26;padding:2px 6px;border-radius:3px;">${docId}</code> | Stored in Cloud Firestore
              </p>
              <p style="margin:6px 0 0 0;color:#5a5c68;font-size:11px;">
                © AJHA Consultancy Services. Enterprise Solutions & Digital Transformation.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Cloud Firestore Trigger:
 * Listens for new documents in 'contacts/{docId}' and automatically
 * sends an email notification to ram.annadanam@gmail.com
 */
exports.sendContactEmail = onDocumentCreated("contacts/{docId}", async (event) => {
  const snap = event.data;
  if (!snap) {
    logger.warn("No snapshot data found for event");
    return;
  }

  const data = snap.data();
  const docId = event.params.docId;

  const name = data.name || "Anonymous Visitor";
  const email = data.email || "noreply@ajhaconsultancy.com";
  const subject = data.subject || "Inquiry via AJHA Website";
  const message = data.message || "No message content";
  const recipientEmail = process.env.TO_EMAIL || "mohaneswar3@gmail.com, ram.annadanam@gmail.com";
  const fromEmail = process.env.FROM_EMAIL || `"AJHA Website Contact" <${process.env.SMTP_USER || "noreply@ajhaconsultancy.com"}>`;

  let submissionTime = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Kolkata",
    dateStyle: "full",
    timeStyle: "medium"
  });

  if (data.createdAt && typeof data.createdAt.toDate === "function") {
    submissionTime = data.createdAt.toDate().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
      dateStyle: "full",
      timeStyle: "medium"
    });
  }

  logger.info(`Processing contact query ${docId} from ${name} (${email}) for ${recipientEmail}`);

  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: fromEmail,
      to: recipientEmail,
      replyTo: `"${name}" <${email}>`,
      subject: `[AJHA Contact Query] ${subject} - from ${name}`,
      text: `New contact inquiry received from AJHA Website:\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\nDate: ${submissionTime}\n\nMessage:\n${message}\n\nRecord ID: ${docId}`,
      html: buildHtmlEmail({ name, email, subject, message, submissionTime, docId }),
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email successfully dispatched for query ${docId}: messageId=${info.messageId}`);

    // Update document in Firestore with delivery status
    await snap.ref.update({
      emailStatus: "sent",
      emailMessageId: info.messageId,
      emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
      emailRecipient: recipientEmail,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error(`Failed to send email for contact query ${docId}:`, error);

    await snap.ref.update({
      emailStatus: "error",
      emailError: error.message || "Unknown error",
      emailFailedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    throw error;
  }
});

/**
 * Optional HTTP endpoint to submit contact queries via REST API
 */
exports.submitContactHttp = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed. Use POST." });
    return;
  }

  const { name, email, subject, message } = req.body || {};

  if (!name || !email || !message) {
    res.status(400).json({ error: "Missing required fields: name, email, and message are required." });
    return;
  }

  try {
    const docRef = await admin.firestore().collection("contacts").add({
      name: String(name).trim(),
      email: String(email).trim(),
      subject: subject ? String(subject).trim() : "No Subject",
      message: String(message).trim(),
      recipient: "mohaneswar3@gmail.com, ram.annadanam@gmail.com",
      status: "unread",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      source: "http_api",
    });

    res.status(200).json({ success: true, docId: docRef.id, message: "Query received and stored successfully." });
  } catch (err) {
    logger.error("Error creating contact document via HTTP endpoint:", err);
    res.status(500).json({ error: "Internal server error saving inquiry." });
  }
});

/**
 * Builds responsive HTML email template for new job postings sent to partners
 */
function buildJobAlertEmail({ title, department, experience, location, jobType, responsibilities, qualifications, jobId }) {
  const respItems = Array.isArray(responsibilities) && responsibilities.length > 0
    ? responsibilities.map(r => `<li style="margin-bottom:6px;color:#d0d4dc;">${r}</li>`).join("")
    : "<li style=\"color:#a0a0a0;\">Refer to the partner portal for full requirements.</li>";

  const qualItems = Array.isArray(qualifications) && qualifications.length > 0
    ? qualifications.map(q => `<li style="margin-bottom:6px;color:#d0d4dc;">${q}</li>`).join("")
    : "<li style=\"color:#a0a0a0;\">Refer to the partner portal for qualifications.</li>";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Job Requirement - AJHA Partner Network</title>
</head>
<body style="margin:0;padding:0;background-color:#0c0e16;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e0e0e0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0c0e16;padding:30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background-color:#1a1c26;border-radius:8px;overflow:hidden;border:1px solid #2a2d3d;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, #1a1c26 0%, #252836 100%);padding:25px 30px;border-bottom:3px solid #ff6600;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <h2 style="margin:0;color:#ffffff;font-size:20px;letter-spacing:1px;font-weight:700;">AJHA CONSULTANCY SERVICES</h2>
                    <p style="margin:5px 0 0 0;color:#ff6600;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Authorized Partner Network • New Opening Alert</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding:30px;">
              <p style="margin:0 0 16px 0;font-size:15px;color:#dcdcdc;line-height:1.6;">
                Dear Authorized Partner,
              </p>
              <p style="margin:0 0 20px 0;font-size:14px;color:#b0b4c0;line-height:1.6;">
                A new client requirement has been posted on the <strong>AJHA Partner Portal</strong>. You are invited to review the requirement details below and submit matching candidate CVs directly through your partner dashboard.
              </p>

              <!-- Position Title Banner -->
              <div style="background-color:#12141d;border-left:4px solid #ff6600;padding:16px 20px;border-radius:0 6px 6px 0;margin-bottom:20px;">
                <h3 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">${title}</h3>
                <p style="margin:4px 0 0 0;color:#ff6600;font-size:13px;font-weight:600;">${department || "Consulting"} • ${location || "Flexible"} • ${jobType || "Full-Time"}</p>
              </div>

              <!-- Details Table -->
              <table width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#12141d;border-radius:6px;border:1px solid #282b3a;margin-bottom:25px;">
                <tr>
                  <td style="padding:10px 18px;border-bottom:1px solid #282b3a;color:#ff6600;font-weight:600;width:140px;font-size:13px;">Experience:</td>
                  <td style="padding:10px 18px;border-bottom:1px solid #282b3a;color:#ffffff;font-size:13px;">${experience || "Not specified"}</td>
                </tr>
                <tr>
                  <td style="padding:10px 18px;border-bottom:1px solid #282b3a;color:#ff6600;font-weight:600;font-size:13px;">Work Location:</td>
                  <td style="padding:10px 18px;border-bottom:1px solid #282b3a;color:#ffffff;font-size:13px;">${location || "Flexible"}</td>
                </tr>
                <tr>
                  <td style="padding:10px 18px;color:#ff6600;font-weight:600;font-size:13px;">Employment Type:</td>
                  <td style="padding:10px 18px;color:#ffffff;font-size:13px;">${jobType || "Full-Time"}</td>
                </tr>
              </table>

              <!-- Key Responsibilities -->
              <h4 style="margin:0 0 8px 0;color:#ffffff;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Key Responsibilities:</h4>
              <ul style="margin:0 0 20px 0;padding-left:20px;font-size:13px;line-height:1.6;">
                ${respItems}
              </ul>

              <!-- Qualifications -->
              <h4 style="margin:0 0 8px 0;color:#ffffff;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Qualifications:</h4>
              <ul style="margin:0 0 25px 0;padding-left:20px;font-size:13px;line-height:1.6;">
                ${qualItems}
              </ul>

              <!-- Action Button -->
              <div style="margin:30px 0 10px 0;text-align:center;">
                <a href="https://www.ajhaconsultancyservices.com/partners.html" style="display:inline-block;background-color:#ff6600;color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:6px;font-weight:700;font-size:14px;letter-spacing:0.5px;">
                  Access Partner Portal & Submit CVs
                </a>
              </div>
              <p style="text-align:center;color:#7a7d8d;font-size:12px;margin-top:12px;">
                Or visit: <a href="https://www.ajhaconsultancyservices.com/partners.html" style="color:#4da3ff;text-decoration:none;">https://www.ajhaconsultancyservices.com/partners.html</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 30px;background-color:#12141d;border-top:1px solid #242735;text-align:center;">
              <p style="margin:0;color:#7a7d8d;font-size:12px;">
                Job ID: <code style="color:#ff6600;background:#1a1c26;padding:2px 6px;border-radius:3px;">${jobId}</code> • Authorized Partner Network
              </p>
              <p style="margin:6px 0 0 0;color:#5a5c68;font-size:11px;">
                © AJHA Consultancy Services Inc. This notification is confidential and intended solely for authorized staffing partners.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Cloud Firestore Trigger:
 * Listens for newly created documents in 'jobs/{jobId}' and automatically
 * sends email alerts to all authorized partners in the 'partners' collection.
 */
exports.notifyPartnersNewJob = onDocumentCreated("jobs/{jobId}", async (event) => {
  const snap = event.data;
  if (!snap) {
    logger.warn("No snapshot data found for new job event");
    return;
  }

  const job = snap.data();
  const jobId = event.params.jobId;

  // Don't trigger if already marked or in draft
  if (job.status && job.status !== "active") {
    logger.info(`Job ${jobId} status is '${job.status}', skipping partner alert.`);
    return;
  }

  logger.info(`Processing partner email alert for newly posted job: ${jobId} - ${job.title}`);

  try {
    const partnerEmails = new Set();

    // 1. Fetch authorized partners from Firestore 'partners' collection
    const partnersSnap = await admin.firestore().collection("partners").get();
    partnersSnap.forEach((doc) => {
      const data = doc.data() || {};
      const email = (data.email || doc.id || "").trim().toLowerCase();
      if (email && email.includes("@") && !email.includes("example.com")) {
        partnerEmails.add(email);
      }
    });

    // 2. Fetch partners from recent submissions (clients who previously submitted CVs)
    try {
      const subSnap = await admin.firestore().collection("submissions").limit(50).get();
      subSnap.forEach((doc) => {
        const data = doc.data() || {};
        const pEmail = (data.partnerEmail || "").trim().toLowerCase();
        if (pEmail && pEmail.includes("@") && !pEmail.includes("example.com")) {
          partnerEmails.add(pEmail);
        }
      });
    } catch (subErr) {
      logger.warn("Could not query submissions for partners:", subErr);
    }

    // 3. Include primary admins for audit verification
    partnerEmails.add("ram.annadanam@gmail.com");
    partnerEmails.add("mohaneswar3@gmail.com");

    const recipients = Array.from(partnerEmails);
    if (recipients.length === 0) {
      logger.warn("No partner recipients found to notify.");
      return;
    }

    logger.info(`Dispatching job notification to ${recipients.length} partner(s): ${recipients.join(", ")}`);

    const transporter = createTransporter();
    const fromEmail = process.env.FROM_EMAIL || `"AJHA Partner Network" <${process.env.SMTP_USER || "noreply@ajhaconsultancy.com"}>`;

    const htmlContent = buildJobAlertEmail({
      title: job.title || "New Requirement",
      department: job.department || "Consulting",
      experience: job.experience || "Not specified",
      location: job.location || "Flexible",
      jobType: job.jobType || "Full-Time",
      responsibilities: job.responsibilities || [],
      qualifications: job.qualifications || [],
      jobId,
    });

    // Send emails (using BCC so partner emails remain private from each other)
    const mailOptions = {
      from: fromEmail,
      to: "mohaneswar3@gmail.com, ram.annadanam@gmail.com",
      bcc: recipients.join(", "),
      subject: `[AJHA Job Alert] New Requirement: ${job.title || "Opening"} (${job.location || "Multiple"})`,
      text: `A new client requirement has been posted on the AJHA Partner Portal.\n\nPosition: ${job.title}\nPractice: ${job.department}\nExperience: ${job.experience}\nLocation: ${job.location}\nType: ${job.jobType}\n\nReview JD & Submit Candidate CVs: https://www.ajhaconsultancyservices.com/partners.html\n\nJob ID: ${jobId}`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Partner job alert email sent successfully: messageId=${info.messageId}`);

    // Update job document
    await snap.ref.update({
      partnerAlertSent: true,
      partnerAlertMessageId: info.messageId,
      partnerAlertRecipientsCount: recipients.length,
      partnerAlertSentAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Record in notifications collection
    await admin.firestore().collection("notifications").add({
      type: "new_job_alert",
      jobId,
      jobTitle: job.title,
      recipientsCount: recipients.length,
      recipients,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      source: "cloud_function_trigger",
    });

    return { success: true, count: recipients.length };
  } catch (err) {
    logger.error(`Error notifying partners of new job ${jobId}:`, err);
    await snap.ref.update({
      partnerAlertError: err.message || "Unknown error",
      partnerAlertFailedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
});
