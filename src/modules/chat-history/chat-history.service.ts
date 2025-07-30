import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { N8nChatHistory } from '../../entities/n8n-chat-history.entity';

@Injectable()
export class ChatHistoryService {
  private readonly logger = new Logger(ChatHistoryService.name);

  constructor(
    @InjectRepository(N8nChatHistory)
    private chatHistoryRepository: Repository<N8nChatHistory>
  ) {}

  /**
   * Borra el historial de chat de un cliente basado en su número de teléfono
   * @param clientPhone Número de teléfono del cliente (puede tener +)
   */
  async clearClientChatHistory(clientPhone: string): Promise<void> {
    try {
      // Limpiar el número de teléfono quitando el '+'
      const cleanPhone = clientPhone.replace('+', '');
      
      // Crear el session_id como aparece en n8n: número + @s.whatsapp.net
      const sessionId = `${cleanPhone}@s.whatsapp.net`;

      this.logger.log(`Borrando historial de chat para session_id: ${sessionId}`);

      // Eliminar todos los registros con este session_id
      const result = await this.chatHistoryRepository.delete({
        session_id: sessionId
      });

      this.logger.log(
        `Historial de chat borrado para ${sessionId}. ` +
        `Registros eliminados: ${result.affected || 0}`
      );

    } catch (error) {
      this.logger.error(
        `Error al borrar historial de chat para cliente ${clientPhone}: ${error.message}`,
        error.stack
      );
      // No lanzamos el error para que no afecte el flujo principal de completar/cancelar carrera
    }
  }

  /**
   * Borra el historial de chat usando directamente el session_id
   * @param sessionId Session ID completo (ej: "584142517231@s.whatsapp.net")
   */
  async clearChatHistoryBySessionId(sessionId: string): Promise<void> {
    try {
      this.logger.log(`Borrando historial de chat para session_id: ${sessionId}`);

      const result = await this.chatHistoryRepository.delete({
        session_id: sessionId
      });

      this.logger.log(
        `Historial de chat borrado para ${sessionId}. ` +
        `Registros eliminados: ${result.affected || 0}`
      );

    } catch (error) {
      this.logger.error(
        `Error al borrar historial de chat para session_id ${sessionId}: ${error.message}`,
        error.stack
      );
    }
  }
} 