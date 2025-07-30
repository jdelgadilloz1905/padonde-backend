# PROJECT BRIEF - TAXI ROSA BACKEND

## 🚗 INFORMACIÓN GENERAL

**Nombre del Proyecto:** Taxi Rosa Backend
**Tipo:** API REST Backend para plataforma de taxis
**Tecnología Principal:** NestJS + TypeScript + PostgreSQL
**Estado:** En desarrollo activo
**URL Frontend:** https://taxi-front.toucan-talent-health.us/login-conductora

## 🎯 PROPÓSITO Y OBJETIVOS

### Objetivo Principal
Desarrollar un backend robusto para una plataforma de taxis que gestione conductoras, clientes, carreras y tracking en tiempo real.

### Objetivos Específicos
- Gestión completa de conductoras con autenticación OTP
- Sistema de tracking de ubicación en tiempo real
- Gestión de carreras desde solicitud hasta completado
- Notificaciones automáticas vía WhatsApp
- Vista pública de seguimiento de carreras
- Panel administrativo para operadores

## 👥 STAKEHOLDERS

**Usuario Final - Conductoras:**
- Registro y autenticación
- Recepción de carreras
- Tracking de ubicación
- Gestión de viajes

**Usuario Final - Clientes:**
- Solicitud de carreras
- Seguimiento público de carreras
- Calificación de servicio

**Administradores/Operadores:**
- Gestión de conductoras
- Monitoreo de carreras
- Análisis de datos
- Resolución de incidentes

## 🏗️ ARQUITECTURA BASE

```
Frontend (React) ←→ Backend API (NestJS) ←→ Database (PostgreSQL)
                         ↕
                  WhatsApp API (Evolution)
                         ↕
                  WebSocket (Real-time)
```

## 📋 MÓDULOS PRINCIPALES

1. **Drivers** - Gestión de conductoras
2. **Clients** - Gestión de clientes  
3. **Rides** - Gestión de carreras
4. **Tracking** - Sistema de ubicación
5. **Auth** - Autenticación y autorización
6. **Notifications** - WhatsApp y notificaciones
7. **Uploads** - Gestión de archivos

## 🔧 STACK TECNOLÓGICO

- **Backend:** NestJS, TypeScript
- **Base de Datos:** PostgreSQL con PostGIS
- **Autenticación:** JWT + OTP (Twilio)
- **WebSockets:** Socket.IO
- **Notificaciones:** Evolution API (WhatsApp)
- **Documentación:** Swagger
- **Validación:** Class-validator
- **ORM:** TypeORM

## 🌐 INTEGRACIONES EXTERNAS

- **Twilio:** SMS OTP
- **Evolution API:** WhatsApp
- **Google Maps:** Geocoding y rutas
- **AWS S3:** Almacenamiento de archivos

## 📊 MÉTRICAS CLAVE

- Tiempo de respuesta de API < 500ms
- Uptime > 99.5%
- Precisión de ubicación < 10m
- Tiempo de notificación WhatsApp < 30s 