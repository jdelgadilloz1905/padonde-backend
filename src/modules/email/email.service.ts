import { Injectable, Logger } from '@nestjs/common';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import * as Handlebars from 'handlebars';
import { SendEmailDto } from './dto/send-email.dto';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private sesClient: SESClient;

  constructor() {
    this.sesClient = new SESClient({
      region: process.env.AWS_SES_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  async sendEmail(emailData: SendEmailDto): Promise<void> {
    try {
      const command = new SendEmailCommand({
        Source: process.env.EMAIL_FROM || 'noreply@toucan-talent-health.us',
        Destination: {
          ToAddresses: [emailData.to],
        },
        Message: {
          Subject: {
            Data: emailData.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: emailData.html,
              Charset: 'UTF-8',
            },
            Text: {
              Data: emailData.text || '',
              Charset: 'UTF-8',
            },
          },
        },
      });

      await this.sesClient.send(command);
      this.logger.log(`Email enviado exitosamente a ${emailData.to}`);
    } catch (error) {
      this.logger.error(`Error enviando email: ${error.message}`);
      throw error;
    }
  }

  async sendWelcomeEmail(to: string, userName: string): Promise<void> {
    const template = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenido a Taxi Rosa</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 10px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #e91e63; font-size: 32px; font-weight: bold; }
          .content { line-height: 1.6; color: #333; }
          .button { display: inline-block; background-color: #e91e63; color: white!important; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🚖 Taxi Rosa</div>
          </div>
          <div class="content">
            <h2>¡Bienvenido {{userName}}!</h2>
            <p>Gracias por registrarte en Taxi Rosa. Estamos emocionados de tenerte como parte de nuestra comunidad.</p>
            <p>Con nuestra aplicación podrás:</p>
            <ul>
              <li>Solicitar viajes de manera rápida y segura</li>
              <li>Rastrear tu viaje en tiempo real</li>
              <li>Calificar a tus conductoras</li>
              <li>Ver tu historial de viajes</li>
            </ul>
            <p>¡Esperamos que disfrutes usando nuestra aplicación!</p>
          </div>
          <div class="footer">
            <p>Saludos,<br>El equipo de Taxi Rosa</p>
            <p><small>Este es un correo automático, por favor no responder.</small></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const compiledTemplate = Handlebars.compile(template);
    const html = compiledTemplate({ userName });

    await this.sendEmail({
      to,
      subject: 'Bienvenido a Taxi Rosa',
      html,
      text: `¡Bienvenido ${userName}! Gracias por registrarte en Taxi Rosa.`,
    });
  }

  async sendPasswordResetEmail(to: string, resetToken: string, userName: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    
    const template = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recuperación de Contraseña - Taxi Rosa</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 0; 
            background-color: #f5f5f5; 
            line-height: 1.6;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: white; 
            border-radius: 12px; 
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }
          .header { 
            background: linear-gradient(135deg, #ff6b35, #f7931e);
            color: white;
            text-align: center; 
            padding: 40px 20px;
          }
          .logo { 
            font-size: 28px; 
            font-weight: bold; 
            margin-bottom: 10px;
          }
          .header-title {
            font-size: 20px;
            font-weight: 500;
            margin: 0;
          }
          .content { 
            padding: 40px;
            color: #333; 
            font-size: 16px;
          }
          .greeting {
            margin-bottom: 20px;
            font-size: 16px;
          }
          .main-text {
            margin-bottom: 30px;
            line-height: 1.8;
          }
          .button-container {
            text-align: center;
            margin: 35px 0;
          }
          .button { 
            display: inline-block; 
            background: linear-gradient(135deg, #ff6b35, #f7931e);
            color: white !important; 
            padding: 15px 40px; 
            text-decoration: none !important; 
            border-radius: 8px; 
            font-weight: 600;
            font-size: 16px;
            border: none;
            cursor: pointer;
            transition: all 0.3s ease;
          }
          .button:hover {
            background: linear-gradient(135deg, #e55a2b, #e6841a);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(255, 107, 53, 0.3);
          }
          .expiry-text {
            margin: 25px 0;
            font-size: 16px;
            color: #333;
          }
          .security-text {
            margin: 25px 0;
            font-size: 16px;
            color: #333;
            line-height: 1.8;
          }
          .footer-text {
            margin-top: 30px;
            font-size: 16px;
            color: #333;
          }
          .team-signature {
            margin: 5px 0;
          }
          .copyright {
            text-align: center;
            padding: 20px;
            font-size: 14px;
            color: #666;
            background-color: #f8f9fa;
            border-top: 1px solid #e9ecef;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🚖 Taxi Rosa</div>
            <p class="header-title">Recuperación de Contraseña</p>
          </div>
          <div class="content">
            <p class="greeting">Hola,</p>
            
            <p class="main-text">
              Recibimos una solicitud para restablecer la contraseña de tu cuenta 
              <a href="mailto:{{userEmail}}" style="color: #ff6b35; text-decoration: none;">{{userEmail}}</a>.
            </p>
            
            <p class="main-text">Para crear una nueva contraseña, haz clic en el siguiente botón:</p>
            
            <div class="button-container">
              <a href="{{resetUrl}}" class="button">Restablecer Contraseña</a>
            </div>
            
            <p class="expiry-text">Este enlace expirará en 15 minutos por seguridad.</p>
            
            <p class="security-text">Si no solicitaste este cambio, puedes ignorar este email de forma segura.</p>
            
            <p class="footer-text">Saludos,</p>
            <p class="team-signature">El equipo de Taxi Rosa</p>
          </div>
          <div class="copyright">
            © 2025 Taxi Rosa. Todos los derechos reservados.
          </div>
        </div>
      </body>
      </html>
    `;

    this.logger.log(`Compilando template - userName: "${userName}", resetUrl: "${resetUrl}"`);
    
    const compiledTemplate = Handlebars.compile(template);
    const html = compiledTemplate({ userName, resetUrl, userEmail: to });

    this.logger.log(`Template compilado para: ${to}`);

    await this.sendEmail({
      to,
      subject: 'Recuperación de Contraseña - Taxi Rosa',
      html,
      text: `Hola, recibimos una solicitud para restablecer la contraseña de tu cuenta ${to}. Usa este enlace: ${resetUrl} (Expira en 15 minutos)`,
    });
  }

  async sendRideNotification(to: string, rideDetails: any): Promise<void> {
    const template = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Notificación de Viaje - Taxi Rosa</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 40px; border-radius: 10px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #e91e63; font-size: 32px; font-weight: bold; }
          .content { line-height: 1.6; color: #333; }
          .ride-info { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🚖 Taxi Rosa</div>
          </div>
          <div class="content">
            <h2>{{subject}}</h2>
            <p>{{message}}</p>
            <div class="ride-info">
              <h3>Detalles del Viaje</h3>
              <div class="info-row">
                <strong>Origen:</strong> <span>{{origin}}</span>
              </div>
              <div class="info-row">
                <strong>Destino:</strong> <span>{{destination}}</span>
              </div>
              <div class="info-row">
                <strong>Fecha:</strong> <span>{{date}}</span>
              </div>
              <div class="info-row">
                <strong>Estado:</strong> <span>{{status}}</span>
              </div>
            </div>
          </div>
          <div class="footer">
            <p>Saludos,<br>El equipo de Taxi Rosa</p>
            <p><small>Este es un correo automático, por favor no responder.</small></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const compiledTemplate = Handlebars.compile(template);
    const html = compiledTemplate(rideDetails);

    await this.sendEmail({
      to,
      subject: rideDetails.subject || 'Notificación de Viaje - Taxi Rosa',
      html,
      text: `${rideDetails.message} - Origen: ${rideDetails.origin}, Destino: ${rideDetails.destination}`,
    });
  }

  // Método de prueba para verificar envío de emails
  async sendTestEmail(to: string): Promise<void> {
    const template = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Test Email - Taxi Rosa</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 500px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; }
          .logo { color: #e91e63; font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">🚖 Taxi Rosa</div>
          <h2>Email de Prueba</h2>
          <p>Este es un email de prueba del sistema Taxi Rosa.</p>
          <p>Si recibes este mensaje, el sistema de email funciona correctamente.</p>
          <p>Fecha: ${new Date().toLocaleString()}</p>
          <hr>
          <p><small>El equipo de Taxi Rosa</small></p>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail({
      to,
      subject: 'Test Email - Taxi Rosa',
      html: template,
      text: 'Este es un email de prueba del sistema Taxi Rosa.',
    });
  }

  // Método simple para probar reset password sin template complejo
  async sendSimplePasswordResetEmail(to: string, resetToken: string, userName: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    
    this.logger.log(`DEBUGGER - Email: ${to}, UserName: "${userName}", ResetUrl: ${resetUrl}`);
    
    const simpleTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Restablecer Contraseña - Taxi Rosa</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; }
          .logo { color: #e91e63; font-size: 24px; font-weight: bold; text-align: center; margin-bottom: 20px; }
          .button { 
            display: inline-block; 
            background-color: #e91e63 !important; 
            color: white !important; 
            padding: 15px 30px; 
            text-decoration: none !important; 
            border-radius: 8px; 
            margin: 20px 0; 
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">🚖 Taxi Rosa</div>
          <h2>Restablecer Contraseña</h2>
          <p>Hola <strong>{{userName}}</strong>,</p>
          <p>Usa este enlace para restablecer tu contraseña:</p>
          <p style="text-align: center;">
            <a href="{{resetUrl}}" class="button">Restablecer Contraseña</a>
          </p>
          <p><strong>Importante:</strong> Este enlace expira en 15 minutos.</p>
          <p>Enlace: {{resetUrl}}</p>
          <hr>
          <p><small>El equipo de Taxi Rosa</small></p>
        </div>
      </body>
      </html>
    `;

    const compiledTemplate = Handlebars.compile(simpleTemplate);
    const html = compiledTemplate({ userName, resetUrl });

    this.logger.log(`Template compilado exitosamente`);

    await this.sendEmail({
      to,
      subject: 'Restablecer Contraseña - Taxi Rosa (Prueba)',
      html,
      text: `Hola ${userName}, usa este enlace para restablecer tu contraseña: ${resetUrl}`,
    });
  }
} 