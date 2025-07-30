# TECH CONTEXT - TAXI ROSA BACKEND

## 🛠️ STACK TECNOLÓGICO COMPLETO

### Core Framework
- **NestJS 11.x**: Framework principal con arquitectura modular
- **TypeScript**: Lenguaje principal con tipado estático
- **Node.js**: Runtime environment

### Base de Datos
- **PostgreSQL**: Base de datos relacional principal
- **PostGIS**: Extensión para datos geográficos
- **TypeORM 0.3.x**: ORM para gestión de datos

### Autenticación y Seguridad
- **JWT**: Tokens para administradores
- **Passport**: Middleware de autenticación
- **bcrypt**: Hashing de passwords y tokens
- **class-validator**: Validación de datos

### Comunicación Externa
- **Twilio**: Servicio SMS para OTP
- **Evolution API**: WhatsApp Business API
- **Google Maps API**: Geocoding y routing
- **AWS S3**: Almacenamiento de archivos

### Real-time y WebSockets
- **Socket.IO**: WebSockets para updates en tiempo real
- **@nestjs/websockets**: Integración NestJS-Socket.IO

### Documentación y Testing
- **Swagger/OpenAPI**: Documentación automática de API
- **Jest**: Framework de testing

## 🏗️ ARQUITECTURA DE DEPLOYMENT

### Estructura de Archivos
```
├── src/
│   ├── modules/           # Módulos de negocio
│   ├── entities/          # Modelos de base de datos
│   ├── config/           # Configuraciones
│   ├── guards/           # Guards de seguridad
│   └── main.ts           # Entry point
├── memory-bank/          # Documentación del proyecto
├── package.json          # Dependencias
├── tsconfig.json         # Configuración TypeScript
└── docker-compose.yml    # Orquestación de servicios
```

### Variables de Entorno Requeridas
```bash
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=taxi_rosa

# JWT
JWT_SECRET=your-jwt-secret

# Twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Google Maps
GOOGLE_MAPS_API_KEY=your-google-maps-key

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=your-region
AWS_S3_BUCKET=your-bucket-name

# Evolution API (WhatsApp)
EVOLUTION_API_URL=https://back-evolution-api.l4h6aa.easypanel.host
EVOLUTION_API_KEY=B024C16A482D-47DF-8030-94A22BA14846
```

## 📊 ESTRUCTURA DE BASE DE DATOS

### Entidades Principales
```sql
-- Conductoras
drivers: id, first_name, last_name, phone_number, email, vehicle, license_plate, 
         status, current_location(geography), verified, active, session_token,
         max_passengers(integer, default 4), has_child_seat(boolean, default false)

-- Clientes  
clients: id, first_name, last_name, phone_number, email, active

-- Carreras
rides: id, client_id, driver_id, origin, destination, 
       origin_coordinates(geography), destination_coordinates(geography),
       status, price, distance, duration, tracking_code, passenger_count,
       has_children_under_5

-- Ubicaciones de conductoras
locations: id, driver_id, ride_id, location(geography), speed, direction, timestamp

-- Incidentes
incidents: id, driver_id, ride_id, incident_type, title, description, status

-- Respuestas pendientes de conductoras
driver_pending_response: id, driver_id, ride_id, created_at
```

### Índices y Optimizaciones
```sql
-- Índices geográficos para búsquedas de proximidad
CREATE INDEX idx_drivers_location ON drivers USING GIST (current_location);
CREATE INDEX idx_locations_geography ON locations USING GIST (location);

-- Índices para consultas frecuentes
CREATE INDEX idx_drivers_phone ON drivers (phone_number);
CREATE INDEX idx_rides_tracking_code ON rides (tracking_code);
CREATE INDEX idx_rides_status ON rides (status);
```

## 🔌 INTEGRACIONES TÉCNICAS

### Evolution API (WhatsApp)
```typescript
// Configuración
const evolutionApiUrl = 'https://back-evolution-api.l4h6aa.easypanel.host';
const apiKey = 'B024C16A482D-47DF-8030-94A22BA14846';
const instance = 'Test Agente';

// Endpoint para enviar mensajes
POST /message/sendText/{instance}
Headers: { apikey: string }
Body: { number: string, text: string }
```

### Twilio SMS
```typescript
// Configuración
const twilioClient = twilio(accountSid, authToken);

// Envío de OTP
await twilioClient.messages.create({
  body: `Tu código de verificación es: ${otpCode}`,
  from: process.env.TWILIO_PHONE_NUMBER,
  to: phoneNumber
});
```

### Google Maps API
```typescript
// Geocoding: dirección → coordenadas
const geocodeResult = await googleMapsClient.geocode({
  params: { address, key: apiKey }
});

// Reverse geocoding: coordenadas → dirección
const reverseResult = await googleMapsClient.reverseGeocode({
  params: { latlng: [lat, lng], key: apiKey }
});
```

## 🔄 PATRONES DE DESARROLLO

### Módulo Estándar NestJS
```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Entity])],
  controllers: [Controller],
  providers: [Service],
  exports: [Service]
})
export class ModuleName {}
```

### Controlador con Guards
```typescript
@Controller('endpoint')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class Controller {
  @Get()
  @ApiOperation({ summary: 'Description' })
  async method() {}
}
```

### Servicio con Repository
```typescript
@Injectable()
export class Service {
  constructor(
    @InjectRepository(Entity)
    private repository: Repository<Entity>
  ) {}
}
```

## 🚀 PERFORMANCE Y ESCALABILIDAD

### Optimizaciones Implementadas
- **Lazy Loading**: Carga de relaciones bajo demanda
- **Pagination**: Limitación de resultados con offset/limit
- **Geographic Indexing**: PostGIS para consultas espaciales eficientes
- **Connection Pooling**: Pool de conexiones a base de datos

### Métricas de Performance
```typescript
// Targets de rendimiento
API Response Time: < 500ms (95th percentile)
Database Query Time: < 100ms (average)
WebSocket Latency: < 100ms
Memory Usage: < 512MB (per instance)
```

### Monitoreo y Logging
```typescript
// Logger estructurado
private readonly logger = new Logger(ClassName.name);

// Niveles de log
this.logger.log('Info message');
this.logger.warn('Warning message');  
this.logger.error('Error message', error.stack);
```

## 🔐 SEGURIDAD Y VALIDACIÓN

### Validación de Datos
```typescript
// DTO con validaciones
export class CreateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsPhoneNumber()
  phone: string;
}
```

### Sanitización de Respuestas
```typescript
// Remover campos sensibles
return {
  ...driver,
  session_token: null,
  otp_code: null,
  otp_expiry: null
};
```

### Rate Limiting y CORS
```typescript
// Configuración en main.ts
app.enableCors({
  origin: ['http://localhost:3000', 'https://taxi-front.toucan-talent-health.us'],
  credentials: true
});
```

## 🧪 TESTING STRATEGY

### Unit Tests
```typescript
describe('Service', () => {
  let service: Service;
  let repository: Repository<Entity>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        Service,
        { provide: getRepositoryToken(Entity), useValue: mockRepository }
      ]
    }).compile();

    service = module.get<Service>(Service);
  });
});
```

### Integration Tests
```typescript
// Testing con base de datos en memoria
beforeEach(async () => {
  const module = await Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot({
        type: 'sqlite',
        database: ':memory:',
        entities: [Entity],
        synchronize: true
      })
    ]
  }).compile();
});
```

## 📦 DEPENDENCIAS CLAVE

### Production Dependencies
```json
{
  "@nestjs/common": "^11.1.1",
  "@nestjs/typeorm": "^11.0.0",
  "typeorm": "^0.3.24",
  "pg": "^8.16.0",
  "socket.io": "^4.8.1",
  "axios": "^1.9.0",
  "twilio": "^5.6.1",
  "bcrypt": "^6.0.0",
  "passport-jwt": "^4.0.1"
}
```

### Development Dependencies
```json
{
  "@types/node": "^20.x",
  "typescript": "^5.x",
  "jest": "^29.x",
  "prettier": "^3.x",
  "eslint": "^8.x"
}
```

## 🔧 COMANDOS DE DESARROLLO

### Scripts Principales
```bash
# Desarrollo
npm run start:dev          # Modo desarrollo con watch
npm run start:debug        # Modo debug

# Producción
npm run build              # Compilar TypeScript
npm run start:prod         # Ejecutar en producción

# Testing
npm run test               # Unit tests
npm run test:e2e           # Integration tests
npm run test:cov           # Coverage report

# Code Quality
npm run lint               # ESLint
npm run format             # Prettier
```

### Base de Datos
```bash
# Sincronización automática en desarrollo
synchronize: true

# ⚠️ IMPORTANTE: SYNCHRONIZE = TRUE CONFIGURADO
# La aplicación usa synchronize: true en desarrollo
# Esto significa que TypeORM modifica automáticamente el esquema de la base de datos
# para coincidir con las entidades TypeScript
#
# VENTAJAS:
# - Desarrollo rápido sin migraciones manuales
# - Cambios en entidades se aplican automáticamente
# - Ideal para desarrollo y prototyping
#
# DESVENTAJAS:
# - Puede causar pérdida de datos en producción
# - No hay control de versioning de esquema
# - Cambios destructivos se aplican sin confirmación
#
# RECOMENDACIÓN PARA PRODUCCIÓN:
# - Usar synchronize: false
# - Implementar migraciones manuales con TypeORM
# - Control de versiones de esquema de base de datos

# Migraciones en producción
npm run migration:generate
npm run migration:run
```