# SYSTEM PATTERNS - TAXI ROSA BACKEND

## 🏗️ ARQUITECTURA GENERAL

### Patrón Arquitectónico: Hexagonal + DDD
```
┌─────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                  │
│  Controllers | Guards | Decorators | DTOs | Swagger    │
└─────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                    │
│        Services | Modules | Use Cases | Business Logic  │
└─────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE LAYER                  │
│   TypeORM | Entities | Repositories | External APIs    │
└─────────────────────────────────────────────────────────┘
```

### Módulos por Dominio
```
src/
├── modules/
│   ├── drivers/          # Gestión de conductoras
│   ├── clients/          # Gestión de clientes
│   ├── rides/            # Gestión de carreras
│   ├── tracking/         # Sistema de ubicación
│   ├── auth/             # Autenticación y autorización
│   ├── uploads/          # Gestión de archivos
│   ├── twilio/           # Integración SMS
│   └── commissions/      # Gestión de comisiones
├── entities/             # Modelos de base de datos
├── config/              # Configuraciones
└── guards/              # Seguridad global
```

## 🔐 PATRONES DE SEGURIDAD

### Autenticación Multi-Capa
```typescript
// Admin/Operator Authentication
JWT Token → JwtAuthGuard → RolesGuard → @Roles(['admin', 'operator'])

// Driver Authentication  
Phone + OTP → DriverAuthGuard → @CurrentDriver() decorator

// Public Endpoints
No auth required → API Key for internal services
```

### Guards Implementados
- **JwtAuthGuard**: Validación de tokens JWT para admins
- **DriverAuthGuard**: Validación de sesión de conductoras
- **RolesGuard**: Control de acceso basado en roles
- **ApiKeyGuard**: Protección para servicios internos (n8n)

## 📊 PATRONES DE DATOS

### Entity Relationships
```
Driver 1:N Rides (conductora puede tener múltiples carreras)
Client 1:N Rides (cliente puede tener múltiples carreras)
Driver 1:N Incidents (conductora puede reportar incidentes)
Driver 1:N DriverLocations (historial de ubicaciones)
Ride 1:N DriverLocations (ubicaciones durante carrera)
Driver 1:N DriverPendingResponse (carreras pendientes)
```

### Gestión de Estados
```typescript
// Driver States
type DriverStatus = 'available' | 'busy' | 'offline' | 'on_the_way';

// Ride States  
enum RideStatus {
  PENDING = 'pending',        // Carrera creada, sin conductora
  IN_PROGRESS = 'in_progress', // conductora asignado, en camino al cliente
  ON_THE_WAY = 'on_the_way',   // conductora recogió cliente, en ruta
  COMPLETED = 'completed',     // Carrera finalizada
  CANCELLED = 'cancelled'      // Carrera cancelada
}
```

### Validación de Datos
```typescript
// Uso de Class-Validator para DTOs
export class CreateDriverDto {
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsPhoneNumber()
  phone_number: string;

  @IsEmail()
  @IsOptional()
  email?: string;
}
```

## 🌐 PATRONES DE COMUNICACIÓN

### API REST + WebSocket Híbrido
```
REST API: CRUD operations, business logic
WebSocket: Real-time updates, location tracking
WhatsApp: External notifications
SMS: OTP verification
```

### Response Standardization
```typescript
// Success Response Pattern
{
  success: true,
  data: T,
  message?: string
}

// Error Response Pattern  
{
  success: false,
  error: string,
  details?: any
}
```

### Notification Patterns
```typescript
// WhatsApp Integration
Evolution API → Formatted Messages → Error Handling → Logging

// Real-time Updates
WebSocket Gateway → Room Management → Broadcast Events
```

## 🗃️ PATRONES DE PERSISTENCIA

### TypeORM con Repository Pattern
```typescript
@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver)
    private driversRepository: Repository<Driver>
  ) {}
}
```

### Geographical Data Handling
```sql
-- PostGIS para datos geográficos
location: geography(Point, 4326)

-- Formato WKT para coordenadas
POINT(longitude latitude)
```

### Auditoría Automática
```typescript
@CreateDateColumn()
created_at: Date;

@UpdateDateColumn() 
updated_at: Date;
```

## 🔄 PATRONES DE WORKFLOW

### State Machine para Carreras
```
[pending] → assignDriver() → [in_progress]
[in_progress] → startTrip() → [on_the_way]  
[on_the_way] → completeTrip() → [completed]
[any] → cancelRide() → [cancelled]
```

### Event-Driven Updates
```typescript
// Driver state changes trigger notifications
updateDriverStatus() → WhatsApp notification (if needed)
cancelRide() → WhatsApp to driver + client notification
```

## 🔧 PATRONES DE CONFIGURACIÓN

### Environment-Based Config
```typescript
// Configuración por entorno
@Injectable()
export class ConfigService {
  get(key: string): string {
    return process.env[key];
  }
}
```

### Service Injection Pattern
```typescript
// Inyección de dependencias consistente
constructor(
  private readonly serviceA: ServiceA,
  private readonly serviceB: ServiceB,
) {}
```

## 📝 PATRONES DE LOGGING

### Structured Logging
```typescript
private readonly logger = new Logger(ServiceName.name);

// Diferentes niveles
this.logger.log('Operation successful');
this.logger.warn('Warning condition');
this.logger.error('Error details', error.stack);
```

### Error Handling Pattern
```typescript
try {
  // Business logic
} catch (error) {
  this.logger.error(`Context: ${error.message}`, error.stack);
  throw new BadRequestException('User-friendly message');
}
```

## 🧪 PATRONES DE TESTING

### Service Testing Pattern
```typescript
describe('DriversService', () => {
  let service: DriversService;
  let repository: Repository<Driver>;

  beforeEach(() => {
    // Mock setup
  });
});
```

## 📈 PATRONES DE ESCALABILIDAD

### Lazy Loading de Relaciones
```typescript
// Solo cargar datos cuando sea necesario
relations: ['client', 'driver']
```

### Paginación Estándar
```typescript
// Patrón consistente de paginación
{
  data: T[],
  total: number,
  page: number,
  limit: number,
  totalPages: number
}
```

### Caching Strategy
```typescript
// Cache en nivel de aplicación para datos geográficos
// Cache de sesiones para tokens de conductoras
```

## 🔒 PATRONES DE PRIVACIDAD

### Data Masking
```typescript
// Ocultar números telefónicos en respuestas públicas
phone_number: phone.substring(0, 3) + '****' + phone.substring(7)
```

### Time-Based Access Control
```typescript
// Acceso limitado a tracking (12 horas)
const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
``` 