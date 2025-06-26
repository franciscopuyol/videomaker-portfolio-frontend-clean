import nodemailer from 'nodemailer';

interface ContactFormData {
  name?: string;
  email: string;
  message: string;
}

export async function sendContactEmailNodemailer(
  formData: ContactFormData,
  destinationEmail: string
): Promise<boolean> {
  try {
    // Create a simple SMTP transporter that works with most providers
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || destinationEmail,
        pass: process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD
      }
    });

    const mailOptions = {
      from: destinationEmail,
      to: destinationEmail,
      replyTo: formData.email,
      subject: `Portfolio Contact: ${formData.name ? `${formData.name} - ` : ''}${formData.email}`,
      text: `
New contact form submission from Portfolio Website

${formData.name ? `Name: ${formData.name}` : ''}
Email: ${formData.email}

Message:
${formData.message}

---
This message was sent from your portfolio contact form at ${new Date().toLocaleString()}
      `.trim(),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">New Portfolio Contact</h2>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            ${formData.name ? `<p style="margin: 0 0 10px 0;"><strong>Name:</strong> ${formData.name}</p>` : ''}
            <p style="margin: 0 0 10px 0;"><strong>Email:</strong> <a href="mailto:${formData.email}">${formData.email}</a></p>
          </div>
          
          <div style="margin: 20px 0;">
            <h3 style="color: #333; margin-bottom: 10px;">Message:</h3>
            <div style="background: #fff; padding: 15px; border: 1px solid #ddd; border-radius: 5px; white-space: pre-wrap; line-height: 1.6;">${formData.message}</div>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
            <p>This message was sent from your portfolio contact form at ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('NodeMailer email error:', error);
    return false;
  }
}