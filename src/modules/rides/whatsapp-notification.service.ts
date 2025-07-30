import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class WhatsAppNotificationService {
  private readonly logger = new Logger(WhatsAppNotificationService.name);
  private readonly evolutionApiUrl = 'https://back-evolution-api.l4h6aa.easypanel.host';
  private readonly apiKey = '98B50032DFC9-42D0-A1CF-A46CC84898C0';

  /**
   * Convierte kilómetros a millas
   * @param kilometers Distancia en kilómetros
   * @returns Distancia en millas
   */
  private convertKmToMiles(kilometers: number): number {
    return kilometers * 0.621371;
  }

  async sendCancellationMessageToDriver(
    driverPhone: string,
    rideInfo: {
      trackingCode: string;
      origin: string;
      destination: string;
      clientName?: string;
    }
  ): Promise<boolean> {
    try {
      // Formatear el número de teléfono para WhatsApp
      const formattedPhone = this.formatPhoneForWhatsApp(driverPhone);
      
      // Crear mensaje amigable y humanizado
      const message = this.createCancellationMessage(rideInfo);

      const payload = {
        number: formattedPhone,
        text: message
      };

      const response = await axios.post(
        `${this.evolutionApiUrl}/message/sendText/Pavola`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.apiKey
          },
          timeout: 10000 // 10 segundos de timeout
        }
      );

      if (response.status === 200 || response.status === 201) {
        this.logger.log(
          `Mensaje de cancelación enviado exitosamente al conductora ${driverPhone} ` +
          `para la carrera ${rideInfo.trackingCode}`
        );
        return true;
      } else {
        this.logger.warn(
          `Respuesta inesperada de Evolution API: ${response.status} - ${response.statusText}`
        );
        return false;
      }

    } catch (error) {
      this.logger.error(
        `Error al enviar mensaje de cancelación al conductora ${driverPhone}: ${error.message}`,
        error.stack
      );
      return false;
    }
  }

  private formatPhoneForWhatsApp(phone: string): string {
    // Remover caracteres no numéricos
    const cleanPhone = phone.replace(/\D/g, '').replace('+', '');
    
    // Si ya tiene código de país, usarlo tal como está
    return cleanPhone;
  }

  private createCancellationMessage(rideInfo: {
    trackingCode: string;
    origin: string;
    destination: string;
    clientName?: string;
  }): string {
    const clientInfo = rideInfo.clientName ? ` de ${rideInfo.clientName}` : '';
    
    return `🚫 *Viaje Cancelado*

Hola, lamentamos informarte que el viaje${clientInfo} ha sido cancelado.

📋 *Detalles del viaje:*
• Código: ${rideInfo.trackingCode}
• Origen: ${rideInfo.origin}
• Destino: ${rideInfo.destination}

Puedes continuar recibiendo nuevos viajes. ¡Gracias por tu comprensión! 🚗💨`;
  }

  async sendTestMessage(phone: string, message: string): Promise<boolean> {
    try {
      const formattedPhone = this.formatPhoneForWhatsApp(phone);
      
      const payload = {
        number: formattedPhone,
        text: message
      };

      const response = await axios.post(
        `${this.evolutionApiUrl}/message/sendText/Pavola`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.apiKey
          },
          timeout: 10000
        }
      );

      return response.status === 200 || response.status === 201;
    } catch (error) {
      this.logger.error(`Error al enviar mensaje de prueba: ${error.message}`);
      return false;
    }
  }

  /**
   * Envía código OTP por WhatsApp como fallback cuando SMS falla
   * @param driverPhone Número de teléfono de la conductora
   * @param otpCode Código OTP de 6 dígitos
   * @param platform Plataforma del dispositivo (opcional)
   * @param appHash Hash de la aplicación Android (opcional)
   * @returns Promise<boolean> true si se envió exitosamente
   */
  async sendOtpViaWhatsApp(driverPhone: string, otpCode: string, platform?: string, appHash?: string): Promise<boolean> {
    try {
      // Formatear el número de teléfono para WhatsApp
      const formattedPhone = this.formatPhoneForWhatsApp(driverPhone);
      
      // Crear mensaje de OTP con formato claro
      const message = this.createOtpMessage(otpCode, platform, appHash);

      const payload = {
        number: formattedPhone,
        text: message
      };

      const response = await axios.post(
        `${this.evolutionApiUrl}/message/sendText/Pavola`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.apiKey
          },
          timeout: 10000 // 10 segundos de timeout
        }
      );

      if (response.status === 200 || response.status === 201) {
        this.logger.log(
          `Código OTP enviado exitosamente por WhatsApp al conductora ${driverPhone}: ${otpCode}`
        );
        return true;
      } else {
        this.logger.warn(
          `Respuesta inesperada de Evolution API para OTP: ${response.status} - ${response.statusText}`
        );
        return false;
      }

    } catch (error) {
      this.logger.error(
        `Error al enviar OTP por WhatsApp al conductora ${driverPhone}: ${error.message}`,
        error.stack
      );
      return false;
    }
  }

  /**
   * Crea el mensaje de OTP para WhatsApp
   * @param otpCode Código OTP de 6 dígitos
   * @param platform Plataforma del dispositivo (opcional)
   * @param appHash Hash de la aplicación Android (opcional)
   * @returns Mensaje formateado para WhatsApp
   */
  private createOtpMessage(otpCode: string, platform?: string, appHash?: string): string {
    let message = `🔐 *Código de Verificación - Taxi Rosa*

Tu código de verificación es: *${otpCode}*

⚠️ *Importante:*
• Este código expira en 10 minutos
• No compartas este código con nadie
• Úsalo para iniciar sesión en la app

🚗 ¡Gracias por usar Taxi Rosa!`;

    // Si es Android y tiene app_hash, agregar el hash al final para detección automática
    if (platform === 'android' && appHash) {
      message += `\n\n${appHash}`;
    }

    return message;
  }

  async sendWelcomeMessageToDriver(
    driverPhone: string,
    driverInfo: {
      firstName: string;
      lastName: string;
      licencePlate: string;
      vehicle: string;
    }
  ): Promise<boolean> {
    try {
      // Formatear el número de teléfono para WhatsApp
      const formattedPhone = this.formatPhoneForWhatsApp(driverPhone);
      
      // Crear mensaje de bienvenida personalizado
      const message = this.createWelcomeMessage(driverInfo);

      const payload = {
        number: formattedPhone,
        text: message,
        linkPreview: true
      };

      const response = await axios.post(
        `${this.evolutionApiUrl}/message/sendText/Pavola`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.apiKey
          },
          timeout: 10000 // 10 segundos de timeout
        }
      );
      if (response.status === 200 || response.status === 201) {
        this.logger.log(
          `Mensaje de bienvenida enviado exitosamente al conductora ${driverPhone} ` +
          `(${driverInfo.firstName} ${driverInfo.lastName})`
        );
        return true;
      } else {
        this.logger.warn(
          `Respuesta inesperada de Evolution API: ${response.status} - ${response.statusText}`
        );
        return false;
      }

    } catch (error) {
      this.logger.error(
        `Error al enviar mensaje de bienvenida al conductora ${driverPhone}: ${error.message}`,
        error.stack
      );
      return false;
    }
  }

  async sendTripCompletionMessageToClient(
    clientPhone: string,
    rideInfo: {
      trackingCode: string;
      origin: string;
      destination: string;
      price: number;
      distance?: number;
      duration?: number;
      driverName: string;
      driverVehicle: string;
      driverPlate: string;
      completionDate: Date;
    }
  ): Promise<boolean> {
    try {
      // Formatear el número de teléfono para WhatsApp
      const formattedPhone = this.formatPhoneForWhatsApp(clientPhone);
      
      // Crear mensaje de factura personalizado
      const message = this.createTripCompletionMessage(rideInfo);

      const payload = {
        number: formattedPhone,
        text: message
      };
      console.log(payload, 'payload');

      const response = await axios.post(
        `${this.evolutionApiUrl}/message/sendText/Pavola`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.apiKey
          },
          timeout: 10000 // 10 segundos de timeout
        }
      );

      if (response.status === 200 || response.status === 201) {
        this.logger.log(
          `Mensaje de viaje completado enviado exitosamente al cliente ${clientPhone} ` +
          `para la carrera ${rideInfo.trackingCode}`
        );
        return true;
      } else {
        this.logger.warn(
          `Respuesta inesperada de Evolution API: ${response.status} - ${response.statusText}`
        );
        return false;
      }

    } catch (error) {
      this.logger.error(
        `Error al enviar mensaje de viaje completado al cliente ${clientPhone}: ${error.message}`,
        error.stack
      );
      return false;
    }
  }

  private createTripCompletionMessage(rideInfo: {
    trackingCode: string;
    origin: string;
    destination: string;
    price: number;
    distance?: number;
    duration?: number;
    driverName: string;
    driverVehicle: string;
    driverPlate: string;
    completionDate: Date;
  }): string {
    const formatPrice = (price: number) => `$${Number(price || 0).toFixed(2)}`;
    const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    const formatDate = (date: Date) => date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });

    let distanceInfo = '';
    if (rideInfo.distance && !isNaN(Number(rideInfo.distance))) {
      const distanceKm = Number(rideInfo.distance);
      const distanceMiles = this.convertKmToMiles(distanceKm);
      distanceInfo = `• Distancia: ${distanceMiles.toFixed(1)} millas\n`;
    }

    let durationInfo = '';
    if (rideInfo.duration && !isNaN(Number(rideInfo.duration))) {
      const duration = Number(rideInfo.duration);
      const minutes = Math.round(duration);
      durationInfo = `• Duración: ${minutes} minutos\n`;
    }

    return `✅ *¡Viaje Completado!* 🎉

Gracias por elegir Taxi Rosa. Tu viaje ha sido completado exitosamente.

🧾 *RECIBO DE VIAJE*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 *Ruta:*
🔸 Origen: ${rideInfo.origin}
🔸 Destino: ${rideInfo.destination}

👨‍💼 *Tu conductora:*
• Nombre: ${rideInfo.driverName}
• Vehículo: ${rideInfo.driverVehicle}
• Placa: ${rideInfo.driverPlate}

📊 *Detalles del viaje:*
• Código: ${rideInfo.trackingCode}
${distanceInfo}${durationInfo}• Fecha: ${formatDate(rideInfo.completionDate)}
• Hora de finalización: ${formatTime(rideInfo.completionDate)}

💰 *TOTAL: ${formatPrice(rideInfo.price)}*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⭐ *¡Califica tu experiencia!*
Tu opinión nos ayuda a mejorar nuestro servicio.

🚖 Gracias por confiar en *Taxi Rosa* 💖
¡Esperamos verte pronto!`;
  }

  private createWelcomeMessage(driverInfo: {
    firstName: string;
    lastName: string;
    licencePlate: string;
    vehicle: string;
  }): string {
    return `🎉 *¡Bienvenido a Taxi Rosa!* 🚗💖

¡Hola ${driverInfo.firstName}! Nos complace darte la bienvenida a nuestra familia de conductoras.

👨‍💼 *Tu información registrada:*
• Nombre: ${driverInfo.firstName} ${driverInfo.lastName}
• Vehículo: ${driverInfo.vehicle}
• Placa: ${driverInfo.licencePlate}

📱 *Próximos pasos:*
1️⃣ Ingresa a la app de Taxi Rosa
2️⃣ Inicia sesión con tu número de teléfono
3️⃣ ¡Comienza a recibir viajes!


💡 *Consejos importantes:*
• Mantén tu ubicación activada
• Responde rápidamente a las solicitudes
• Brinda un excelente servicio

¡Esperamos que tengas mucho éxito con nosotros! 🌟

Si tienes alguna pregunta, no dudes en contactarnos.

*Equipo Taxi Rosa* 💖🚗`;
  }

  async sendDriverAssignmentNotification(
    driverPhone: string,
    rideInfo: {
      origin: string;
      destination: string;
      client_name: string;
      tracking_code: string;
    }
  ): Promise<boolean> {
    try {
      const formattedPhone = this.formatPhoneForWhatsApp(driverPhone);
      const message = this.createAssignmentMessage(rideInfo);

      const payload = {
        number: formattedPhone,
        text: message
      };

      const response = await axios.post(
        `${this.evolutionApiUrl}/message/sendText/Pavola`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.apiKey
          },
          timeout: 10000
        }
      );

      if (response.status === 200 || response.status === 201) {
        this.logger.log(
          `Notificación de asignación enviada exitosamente al conductora ${driverPhone} ` +
          `para la carrera ${rideInfo.tracking_code}`
        );
        return true;
      } else {
        this.logger.warn(
          `Respuesta inesperada de Evolution API: ${response.status} - ${response.statusText}`
        );
        return false;
      }
    } catch (error) {
      this.logger.error(
        `Error al enviar notificación de asignación al conductora ${driverPhone}: ${error.message}`,
        error.stack
      );
      return false;
    }
  }

  private createAssignmentMessage(rideInfo: {
    origin: string;
    destination: string;
    client_name: string;
    tracking_code: string;
  }): string {
    return `🚗 *¡Nuevo Viaje Asignado!*

¡Hola! Se te ha asignado un nuevo viaje.

📋 *Detalles del viaje:*
• Código: ${rideInfo.tracking_code}
• Cliente: ${rideInfo.client_name}
• Origen: ${rideInfo.origin}
• Destino: ${rideInfo.destination}

⚠️ *Importante:*
• Debes aceptar el viaje en la app
• Si no puedes realizarlo, recházalo lo antes posible

¡Gracias por tu servicio! 🙌`;
  }
} 