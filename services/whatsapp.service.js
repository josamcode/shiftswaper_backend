// services/whatsapp.service.js
const twilio = require('twilio');

class WhatsAppService {
  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
  }

  async sendOTP(phoneNumber, otp) {
    try {
      // Format phone number for WhatsApp (add whatsapp: prefix)
      const to = `whatsapp:${phoneNumber}`;
      const from = `whatsapp:${this.whatsappNumber}`;

      const message = await this.client.messages.create({
        body: `From shiftswaper \n\nYour verification code is: ${otp}\n\nThis code will expire in 15 minutes.`,
        from: from,
        to: to
      });

      console.log('WhatsApp message sent:', message.sid);
      return { success: true, messageId: message.sid };

    } catch (error) {
      console.error('WhatsApp sending failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new WhatsAppService();
