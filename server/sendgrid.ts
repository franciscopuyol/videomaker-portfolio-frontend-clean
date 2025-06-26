import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface ContactFormData {
  name?: string;
  email: string;
  message: string;
}

export async function sendContactEmail(
  formData: ContactFormData,
  destinationEmail: string
): Promise<boolean> {
  // Use verified sender email (hardcoded as fallback due to env var issue)
  const verifiedSender = process.env.SENDGRID_VERIFIED_SENDER && !process.env.SENDGRID_VERIFIED_SENDER.startsWith('SG.') 
    ? process.env.SENDGRID_VERIFIED_SENDER 
    : 'franciscopuyol@gmail.com';
  
  try {
    const emailContent = {
      to: destinationEmail,
      from: {
        email: verifiedSender,
        name: 'Portfolio Contact Form'
      },
      replyTo: formData.email,
      subject: `Portfolio Contact: ${formData.name ? `${formData.name} - ` : ''}${formData.email}`,
      text: `
New contact form submission from Portfolio Website

${formData.name ? `Name: ${formData.name}` : ''}
Email: ${formData.email}

Message:
${formData.message}

---
This message was sent from your portfolio contact form.
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

    await mailService.send(emailContent);
    console.log('✅ Email sent successfully via SendGrid');
    return true;
  } catch (error: any) {
    console.error('SendGrid email error:', {
      code: error.code,
      message: error.message,
      response: error.response?.body,
      sender: verifiedSender,
      recipient: destinationEmail
    });
    
    // Log specific 403 error details
    if (error.code === 403) {
      console.error('SendGrid 403 Error - Authentication Required:');
      console.error('1. Verify API Key has Mail Send permissions');
      console.error('2. Add sender email to SendGrid Sender Authentication');
      console.error('3. Check account status and restrictions');
      console.error(`Attempted sender: ${verifiedSender}`);
    }
    
    return false;
  }
}