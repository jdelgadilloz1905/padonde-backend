import { 
  WebSocketGateway, 
  WebSocketServer, 
  SubscribeMessage, 
  OnGatewayConnection, 
  OnGatewayDisconnect 
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { DriverLocationService } from './driver-location.service';

@WebSocketGateway({
  namespace: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(TrackingGateway.name);
  private connectedDrivers = new Map<number, Socket>();
  private adminClients = new Set<Socket>();

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly driverLocationService: DriverLocationService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`🔌 WebSocket client connected: ${client.id}`);
    this.logger.log(`📍 Client handshake: ${JSON.stringify(client.handshake.query)}`);
    
    // Enviar confirmación de conexión
    client.emit('connection:established', {
      clientId: client.id,
      timestamp: new Date(),
      message: 'Conexión WebSocket establecida exitosamente'
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔌 WebSocket client disconnected: ${client.id}`);
    
    // Remove from connected drivers if it was a driver
    for (const [driverId, socket] of this.connectedDrivers.entries()) {
      if (socket.id === client.id) {
        this.connectedDrivers.delete(driverId);
        this.logger.log(`Driver ${driverId} disconnected`);
        break;
      }
    }

    // Remove from admin clients if it was an admin
    this.adminClients.delete(client);
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket) {
    client.emit('pong', { timestamp: new Date() });
    return { status: 'success' };
  }

  @SubscribeMessage('driver:register')
  handleDriverRegister(client: Socket, data: { driverId: number, token: string }) {
    // Here you would validate the driver token
    const { driverId } = data;
    
    this.connectedDrivers.set(driverId, client);
    this.logger.log(`🚗 Driver ${driverId} registered for WebSocket connection`);
    
    // Enviar confirmación específica al conductora
    client.emit('driver:registered', {
      driverId,
      status: 'success',
      message: 'conductora registrado exitosamente',
      timestamp: new Date()
    });
    
    return { status: 'success', message: 'Driver registered successfully' };
  }

  @SubscribeMessage('admin:register')
  handleAdminRegister(client: Socket, data: { token: string }) {
    // Here you would validate the admin token
    
    this.adminClients.add(client);
    this.logger.log(`Admin registered: ${client.id}`);
    
    return { status: 'success', message: 'Admin registered successfully' };
  }

  @SubscribeMessage('driver:updateLocation')
  async handleLocationUpdate(client: Socket, data: any) {
    try {
      this.logger.log(`Recibiendo actualización de ubicación por WebSocket: ${JSON.stringify(data)}`);
      
      let driverId, latitude, longitude, speed, direction, rideId, timestamp;
      
      // Detectar el formato del cuerpo recibido
      if (data.location && data.location.lat && data.location.lng) {
        // Formato: {driverId: 1, location: {lat: 10.4870749, lng: -66.8558558, timestamp: 1747331611175}}
        latitude = data.location.lat;
        longitude = data.location.lng;
        timestamp = data.location.timestamp;
        driverId = data.driverId;
      } else {
        // Formato estándar: {driverId: 1, latitude: 10.4870749, longitude: -66.8558558}
        driverId = data.driverId;
        latitude = data.latitude;
        longitude = data.longitude;
        speed = data.speed;
        direction = data.direction;
        rideId = data.rideId;
      }

      this.logger.log(`Procesando ubicación por WebSocket: lat=${latitude}, lng=${longitude}, driverId=${driverId}`);
      
      // Save location in database
      await this.driverLocationService.saveDriverLocation({
        driverId,
        location: { type: 'Point', coordinates: [longitude, latitude] },
        speed,
        direction,
        rideId
      });

      // Broadcast to all admin clients
      this.adminClients.forEach(adminClient => {
        adminClient.emit('driver:locationUpdated', {
          driverId,
          location: {
            latitude,
            longitude
          },
          speed,
          direction,
          timestamp: timestamp || new Date(),
          rideId
        });
      });

      return { status: 'success' };
    } catch (error) {
      this.logger.error(`Error updating driver location: ${error.message}`, error.stack);
      return { status: 'error', message: error.message };
    }
  }

  /**
   * Notifica a todos los clientes de administración sobre una actualización de ubicación
   * Este método es llamado desde el controlador cuando se actualiza la ubicación vía REST
   */
  notifyAdminsLocationUpdate(data: {
    driverId: number,
    location: {
      latitude: number,
      longitude: number
    },
    speed?: number,
    direction?: number,
    timestamp: Date,
    rideId?: number
  }): void {
    // Broadcast to all admin clients
    this.adminClients.forEach(adminClient => {
      adminClient.emit('driver:locationUpdated', data);
    });
    
    // También podemos usar el servidor para broadcast a un room si organizamos a los admins en rooms
    // this.server.to('admin-room').emit('driver:locationUpdated', data);
    
    this.logger.log(`Location update broadcast for driver ${data.driverId} (from REST API)`);
  }

  @SubscribeMessage('admin:requestDriversLocations')
  async handleAdminRequestDriversLocations(client: Socket) {
    // Get all active drivers' locations
    const driversLocations = await this.driverLocationService.getActiveDriversLocations();
    
    client.emit('admin:driversLocations', driversLocations);
    
    return { status: 'success' };
  }

  /**
   * Notifica a un conductora específico sobre un viaje programado próximo
   */
  notifyDriverScheduledRide(driverId: number, notification: {
    type: string;
    title: string;
    body: string;
    scheduledRideId?: number;
    rideId?: number;
    timestamp: Date;
    urgency?: string;
  }): void {
    const driverSocket = this.connectedDrivers.get(driverId);
    
    if (driverSocket) {
      driverSocket.emit('scheduled-ride:notification', notification);
      this.logger.log(`🔔 Notificación de viaje programado enviada al conductora ${driverId}`);
    } else {
      this.logger.warn(`⚠️ conductora ${driverId} no está conectado para recibir notificación de viaje programado`);
    }
  }

  /**
   * Notifica a un conductora sobre la activación de su viaje programado
   */
  notifyDriverRideActivated(driverId: number, rideInfo: {
    rideId: number;
    origin: string;
    destination: string;
    clientName: string;
    clientPhone: string;
    estimatedDuration?: number;
  }): void {
    const driverSocket = this.connectedDrivers.get(driverId);
    
    if (driverSocket) {
      driverSocket.emit('ride:activated', {
        type: 'ride_activated',
        title: '¡Viaje Activado!',
        body: `Tu viaje programado ha sido activado. Dirígete a ${rideInfo.origin}`,
        rideId: rideInfo.rideId,
        rideInfo: rideInfo,
        timestamp: new Date(),
        urgency: 'high'
      });
      this.logger.log(`🚗 Notificación de viaje activado enviada al conductora ${driverId}`);
    } else {
      this.logger.warn(`⚠️ conductora ${driverId} no está conectado para recibir notificación de viaje activado`);
    }
  }

  @SubscribeMessage('driver:acknowledgeScheduledRide')
  handleDriverAcknowledgeScheduledRide(client: Socket, data: { scheduledRideId: number, driverId: number }) {
    this.logger.log(`✅ conductora ${data.driverId} confirmó recepción de notificación para viaje programado ${data.scheduledRideId}`);
    
    // Confirmar al conductora que se recibió la confirmación
    client.emit('scheduled-ride:acknowledged', {
      scheduledRideId: data.scheduledRideId,
      timestamp: new Date(),
      status: 'acknowledged'
    });
    
    return { status: 'success', message: 'Acknowledgment received' };
  }
} 