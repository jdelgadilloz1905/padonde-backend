# Taxi Rosa Backend

Backend para la aplicación de Taxi Rosa con sistema de seguimiento de conductoras en tiempo real.

## Requisitos

- Node.js (v14 o superior)
- PostgreSQL con extensión PostGIS para datos geoespaciales
- npm o yarn

## Configuración

1. Clona el repositorio

```bash
git clone https://github.com/your-username/taxi-rosa-backend.git
cd taxi-rosa-backend
```

2. Instala las dependencias

```bash
npm install
```

3. Configuración de la base de datos

Asegúrate de tener PostgreSQL instalado con soporte para PostGIS:

```bash
# En Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib postgis

# En Windows
# Descarga PostgreSQL con el instalador desde https://www.postgresql.org/download/windows/
# Luego instala PostGIS usando Stack Builder
```

4. Crea un archivo .env en la raíz del proyecto con la siguiente configuración:

```
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=tu_contraseña
DB_DATABASE=taxirosa

# JWT Authentication
JWT_SECRET=secreto_super_seguro_cambiar_en_produccion
JWT_EXPIRATION=1d

# Server settings
PORT=3000
NODE_ENV=development
```

5. Crea la base de datos y ejecuta el script SQL inicial:

```bash
psql -U postgres -c "CREATE DATABASE taxirosa"
psql -U postgres -d taxirosa -c "CREATE EXTENSION postgis"
psql -U postgres -d taxirosa -f taxirosa-database-english.sql
```

## Ejecución

Para desarrollo:

```bash
npm run start:dev
```

Para producción:

```bash
npm run build
npm run start:prod
```

## Funcionalidades principales

### Registro y gestión de conductoras

El sistema permite registrar conductoras y administrar sus perfiles.

#### Endpoints para conductoras

- `POST /api/v1/drivers` - Registrar un nuevo conductora
- `GET /api/v1/drivers` - Obtener listado de todos los conductoras (protegido: admin, operator)
- `GET /api/v1/drivers/active` - Obtener conductoras activos (protegido: admin, operator)
- `GET /api/v1/drivers/:id` - Obtener detalles de un conductora por ID (protegido: admin, operator)
- `PATCH /api/v1/drivers/:id` - Actualizar datos de un conductora (protegido: admin, operator)
- `DELETE /api/v1/drivers/:id` - Desactivar un conductora (protegido: admin)
- `PATCH /api/v1/drivers/:id/verify` - Verificar un conductora (protegido: admin)
- `PATCH /api/v1/drivers/:id/status` - Actualizar estado de un conductora (protegido: admin, operator)

#### Ejemplo de registro de conductora

```javascript
// Registrar un nuevo conductora
const response = await fetch('http://localhost:3000/api/v1/drivers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    first_name: 'Juan',
    last_name: 'Pérez',
    phone_number: '+5219876543210',
    email: 'juan.perez@example.com',
    vehicle: 'Nissan',
    model: 'Versa',
    color: 'Blanco',
    year: 2020,
    license_plate: 'ABC123',
    driver_license: 'DL123456',
    id_document: 'ID987654'
  })
});

const newDriver = await response.json();
console.log('conductora registrado:', newDriver);
```

### Autenticación

El sistema utiliza JWT (JSON Web Tokens) para la autenticación de usuarios.

#### Endpoints de autenticación

- `POST /api/v1/auth/login` - Iniciar sesión con correo y contraseña
- `GET /api/v1/auth/profile` - Obtener perfil del usuario autenticado
- `POST /api/v1/auth/validate-token` - Validar un token JWT

#### Ejemplo de uso

```javascript
// Iniciar sesión
const response = await fetch('http://localhost:3000/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@example.com', password: 'password' })
});
const data = await response.json();
const token = data.access_token;

// Uso del token para solicitudes autenticadas
const profileResponse = await fetch('http://localhost:3000/api/v1/auth/profile', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Rastreo de conductoras en tiempo real

El sistema permite rastrear la ubicación de los conductoras en tiempo real utilizando WebSockets.

#### Endpoints API

- `GET /api/v1/tracking/drivers/active` - Obtener todos los conductoras activos con sus ubicaciones actuales
- `GET /api/v1/tracking/driver/:id/locations` - Obtener las ubicaciones recientes de un conductora
- `GET /api/v1/tracking/driver/:id/history` - Obtener el historial de ubicaciones de un conductora

#### Conexión WebSocket

```javascript
// Ejemplo del lado del cliente (JavaScript)
const socket = io('http://localhost:3000');

// Para conductoras: enviar actualización de ubicación
socket.emit('driver:register', { driverId: 1, token: 'token_de_autenticacion' });
socket.emit('driver:updateLocation', { 
  driverId: 1, 
  latitude: 19.4326, 
  longitude: -99.1332 
});

// Para administradores: suscribirse a actualizaciones
socket.emit('admin:register', { token: 'token_de_administrador' });
socket.on('driver:locationUpdated', (data) => {
  console.log('Ubicación de la conductora actualizada:', data);
});
socket.emit('admin:requestDriversLocations');
socket.on('admin:driversLocations', (data) => {
  console.log('Ubicaciones de conductoras:', data);
});
```

## Control de acceso basado en roles

El sistema implementa un control de acceso basado en roles (RBAC):

- **admin**: Acceso completo a todas las funcionalidades.
- **operator**: Acceso al panel de control para gestionar viajes y monitorizar conductoras.

Para proteger un endpoint con roles específicos:

```typescript
@Controller('ejemplo')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EjemploController {
  
  @Get()
  @Roles('admin') // Solo los administradores pueden acceder
  getExample() {
    return { message: 'Sólo para administradores' };
  }
  
  @Get('operadores')
  @Roles('admin', 'operator') // Admins y operadores pueden acceder
  getForOperators() {
    return { message: 'Para admins y operadores' };
  }
}
```

## Estructura del proyecto

```
/src
  /config        - Configuración de la aplicación
  /entities      - Modelos de la base de datos (TypeORM)
  /modules
    /auth        - Autenticación y autorización
    /drivers     - Registro y gestión de conductoras
    /tracking    - Módulo de seguimiento de ubicación
    /clients     - Gestión de clientes
    /rides       - Gestión de viajes
  /utils         - Utilidades y funciones auxiliares
```

## Próximas características

- Integración con Amazon Cognito
- Panel de administración
- Notificaciones en tiempo real
- Sistema de pagos

## 🔄 Cambio Importante en Endpoints - Coordenadas Separadas

### ⚠️ Actualización de Endpoints para Coordenadas

Los endpoints que usan `@UseGuards(ApiKeyGuard)` han sido actualizados para recibir las coordenadas de origen por separado en lugar de un solo parámetro `origin_coordinates`. Esto soluciona el problema de orden de coordenadas que a veces ocurría con el agente de n8n.

### Endpoints Afectados

#### 1. POST `/rides` - Crear una nueva carrera

**Antes:**
```json
{
  "phone_number": "+573178263741",
  "origin": "Av. Principal 123",
  "destination": "Calle Secundaria 456",
  "origin_coordinates": "POINT(-99.12345 19.43215)",
  "payment_method": "cash"
}
```

**Ahora:**
```json
{
  "phone_number": "+573178263741",
  "origin": "Av. Principal 123",
  "destination": "Calle Secundaria 456",
  "origin_latitude": 19.43215,
  "origin_longitude": -99.12345,
  "payment_method": "cash"
}
```

#### 2. POST `/rides/estimate-fare` - Calcular tarifa estimada

**Antes:**
```json
{
  "phone_number": "+573178263741",
  "origin": "Av. Principal 123",
  "destination": "Calle Secundaria 456",
  "origin_coordinates": "POINT(-99.12345 19.43215)"
}
```

**Ahora:**
```json
{
  "phone_number": "+573178263741",
  "origin": "Av. Principal 123",
  "destination": "Calle Secundaria 456",
  "origin_latitude": 19.43215,
  "origin_longitude": -99.12345
}
```

#### 3. GET `/rides/find-nearest-driver` - Buscar conductora más cercano 🆕

Este nuevo endpoint permite al agente de n8n encontrar el conductora disponible más cercano a una carrera específica.

**Parámetros de consulta:**
- `rideId` (opcional): ID de la carrera
- `phone` (opcional): Número de teléfono del cliente para buscar carrera pendiente

**Ejemplo de uso:**
```bash
# Buscar por ID de carrera
GET /rides/find-nearest-driver?rideId=123

# Buscar por número de teléfono
GET /rides/find-nearest-driver?phone=+573178263741
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "driver": {
    "id": 15,
    "name": "Juan Pérez",
    "phone": "+573187654321",
    "vehicle": "Toyota Corolla Blanco",
    "plate": "ABC123",
    "status": "available",
    "location": {
      "latitude": 19.4326,
      "longitude": -99.1332
    },
    "distance": 2.5,
    "estimatedArrival": 5
  },
  "rideInfo": {
    "id": 123,
    "origin": "Av. Principal 123",
    "destination": "Calle Secundaria 456",
    "client": "María González",
    "trackingCode": "ABC12345"
  }
}
```

**Respuesta cuando no hay conductoras:**
```json
{
  "success": false,
  "message": "No hay conductoras disponibles en este momento"
}
```

### 💡 Ventajas del Cambio

1. **Orden Consistente**: No importa en qué orden envíe n8n las coordenadas, ahora están claramente etiquetadas
2. **Menos Errores**: Elimina problemas de parsing del formato WKT Point
3. **Mejor Validación**: TypeScript puede validar que ambas coordenadas son números
4. **Compatibilidad**: El servicio interno mantiene compatibilidad con el formato anterior por si es necesario

### 🛠️ Configuración en n8n

Cuando configures los nodos en n8n, asegúrate de mapear correctamente:
- `latitude` del GPS → `origin_latitude`
- `longitude` del GPS → `origin_longitude`

**Para el endpoint de buscar conductora más cercano:**
- Header requerido: `x-api-key: tu_api_key`
- Método: GET
- URL: `/rides/find-nearest-driver`
- Query params: `rideId` OR `phone`

### 🎯 Características del Endpoint de Búsqueda de conductora

El endpoint `/rides/find-nearest-driver` implementa las siguientes funcionalidades:

1. **Búsqueda Flexible**: Acepta tanto ID de carrera como número telefónico
2. **Filtrado Inteligente**: Solo considera conductoras con status `available`
3. **Cálculo de Distancia**: Usa la fórmula de Haversine para precisión geográfica
4. **Estimación de Tiempo**: Calcula tiempo de llegada basado en velocidad promedio urbana (30 km/h)
5. **Información Completa**: Retorna datos de la conductora y contexto de la carrera
6. **Manejo de Errores**: Respuestas claras cuando no hay conductoras disponibles

**Casos de Uso:**
- Asignación automática de conductoras en n8n
- Notificación al cliente sobre conductora asignado
- Cálculo de tiempos de espera
- Optimización de rutas y asignaciones

### Notas Técnicas

- El formato interno sigue siendo WKT Point para compatibilidad con PostGIS
- Las coordenadas se validan como números en el DTO
- El servicio construye automáticamente el WKT Point desde las coordenadas separadas
- El algoritmo de búsqueda prioriza distancia sobre otros factores
- Las ubicaciones de conductoras se actualizan en tiempo real vía WebSockets
