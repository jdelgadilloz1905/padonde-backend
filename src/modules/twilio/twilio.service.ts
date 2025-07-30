import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as twilio from 'twilio';

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private twilioClient: twilio.Twilio;

  constructor(private configService: ConfigService) {
    this.twilioClient = twilio(
      this.configService.get<string>('TWILIO_ACCOUNT_SID'),
      this.configService.get<string>('TWILIO_AUTH_TOKEN')
    );
  }

  async sendOtp(phoneNumber: string, otpCode: string, platform?: string, appHash?: string): Promise<boolean> {
    try {
      // Crear mensaje base
      let messageBody = `Tu código de verificación de Taxi Rosa es: ${otpCode}`;
      
      // Si es Android y tiene app_hash, agregar el hash al final para detección automática
      if (platform === 'android' && appHash) {
        messageBody += `\n\n${appHash}`;
      }

      const message = await this.twilioClient.messages.create({
        body: messageBody,
        from: this.configService.get<string>('TWILIO_PHONE_NUMBER'),
        to: phoneNumber
      });

      this.logger.log(`SMS enviado con éxito al número ${phoneNumber}. SID: ${message.sid}`);
      return true;
    } catch (error) {
      this.logger.error(`Error al enviar SMS: ${error.message}`, error.stack);
      return false;
    }
  }
} 