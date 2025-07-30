# PRODUCT CONTEXT - TAXI ROSA

## 🚀 VISIÓN DEL PRODUCTO

Taxi Rosa es una plataforma integral de taxis que conecta conductoras y pasajeros de manera eficiente, proporcionando tracking en tiempo real, gestión automatizada de carreras y comunicación fluida via WhatsApp.

## 🎯 PROPUESTA DE VALOR

### Para Conductoras
- **Registro simplificado** con validación automática de documentos
- **Autenticación segura** vía OTP sin necesidad de passwords
- **Recepción automática** de carreras cercanas
- **Tracking automático** de ubicación y carreras
- **Notificaciones WhatsApp** para actualizaciones importantes
- **Gestión de estados** de carrera (en camino → completado)

### Para Clientes
- **Seguimiento público** de carreras con código de tracking
- **Información en tiempo real** de la conductora y ubicación
- **Estimación de tiempos** y distancias
- **Comunicación directa** con soporte

### Para Operadores
- **Panel administrativo** completo
- **Monitoreo en tiempo real** de conductoras activos
- **Gestión de carreras** y asignación manual
- **Análisis de datos** y estadísticas
- **Resolución de incidentes**

## 🔄 FLUJO DE TRABAJO PRINCIPAL

### 1. Registro de conductora
```
Registro → Validación datos → Mensaje bienvenida WhatsApp → Estado: Offline
```

### 2. Autenticación
```
Solicitar OTP → SMS Twilio → Verificar código → Token sesión → Estado: Available
```

### 3. Ciclo de Carrera
```
Solicitud cliente → Asignación conductora → In Progress → On The Way → Completed
                                      ↘ Cancelled (con notificación WhatsApp)
```

### 4. Tracking Público
```
Código tracking → Validación 12hrs → Información conductora + ubicación → Vista tiempo real
```

## 📱 FUNCIONALIDADES CORE

### Autenticación y Seguridad
- **OTP via SMS** para conductoras
- **JWT tokens** para sesiones
- **Validación de documentos** únicos
- **Guards específicos** para roles

### Gestión de Conductoras
- CRUD completo con validaciones
- Estados: `available`, `busy`, `offline`, `on_the_way`
- Verificación manual por admins
- Estadísticas y métricas personales

### Sistema de Carreras
- Estados: `pending`, `in_progress`, `on_the_way`, `completed`, `cancelled`
- Asignación automática por proximidad
- Tracking codes únicos para seguimiento
- Cálculo automático de tarifas y distancias

### Tracking en Tiempo Real
- Ubicación GPS de conductoras
- WebSockets para actualizaciones live
- Historial de ubicaciones
- Validación de coordenadas geográficas

### Notificaciones WhatsApp
- **Mensaje de bienvenida** para nuevos conductoras
- **Cancelación de carreras** con detalles
- **Mensajes personalizados** con emojis
- **Enlaces directos** a la aplicación

## 🎨 EXPERIENCIA DE USUARIO

### Para Conductoras
1. **Onboarding rápido** con mensaje de bienvenida
2. **Login sin contraseña** usando OTP
3. **Interfaz simple** para gestionar carreras
4. **Feedback inmediato** de estado de carreras

### Para Clientes
1. **Seguimiento transparente** de su carrera
2. **Información completa** de la conductora asignado
3. **Estimaciones precisas** de tiempo y ubicación
4. **Acceso público** sin necesidad de login

### Para Administradores
1. **Dashboard completo** con métricas
2. **Gestión eficiente** de conductoras
3. **Monitoreo en tiempo real** de operaciones
4. **Herramientas de soporte** integradas

## 🔗 INTEGRACIONES CLAVE

### Evolution API (WhatsApp)
- **Endpoint:** https://back-evolution-api.l4h6aa.easypanel.host
- **Instancia:** "Test Agente"
- **Funciones:** Bienvenida, cancelaciones, notificaciones

### Twilio (SMS)
- **Función:** Envío de códigos OTP
- **Configuración:** Números internacionales
- **Seguridad:** Códigos de 6 dígitos con expiración

### Google Maps
- **Geocoding:** Conversión direcciones ↔ coordenadas
- **Routing:** Cálculo de rutas y distancias
- **Estimaciones:** Tiempo de viaje

## 📊 INDICADORES DE ÉXITO

### Operacionales
- Tiempo promedio de asignación de carrera < 2 minutos
- Tasa de cancelación < 10%
- Tiempo de respuesta de conductora < 30 segundos
- Precisión de ubicación > 95%

### Técnicos
- Uptime del sistema > 99.5%
- Tiempo de respuesta API < 500ms
- Entrega de notificaciones WhatsApp > 95%
- Precisión de cálculo de tarifas > 99%

### Negocio
- Número de carreras completadas diarias
- Número de conductoras activos
- Satisfacción del cliente (ratings)
- Tiempo promedio de carrera 