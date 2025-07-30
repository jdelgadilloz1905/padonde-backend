# Scripts de Base de Datos - Taxi Rosa

Este directorio contiene scripts utilitarios para inicializar y poblar la base de datos de Taxi Rosa.

## Scripts Disponibles

### 1. 🔐 Crear Usuario Administrador
```bash
npm run create-admin
```
Crea un usuario administrador por defecto con las siguientes credenciales:
- **Email**: `admin@taxirosa.com`
- **Contraseña**: `TaxiRosa2025!`
- **Rol**: `admin`

**Nota importante**: Cambie la contraseña después del primer login.

### 2. 🔄 Migrar Contraseñas de Usuarios
```bash
npm run migrate-passwords
```
Script para migrar contraseñas de usuarios existentes (útil para actualizaciones del sistema).

### 3. 🚗 Crear Conductoras de Prueba (NUEVO)
```bash
npm run seed-drivers
```
**Genera 100 conductoras ficticios** distribuidos entre Kansas City y Caracas con las siguientes características:

#### Características de los Conductoras Generados:
- **Nombres**: Combinación de nombres en español e inglés
- **Ubicaciones**: Distribuidos en diferentes zonas de ambas ciudades
- **Vehículos**: Variedad de marcas y modelos (Toyota, Honda, Nissan, etc.)
- **Estados**: 70% disponibles, 30% desconectados
- **Verificación**: 90% verificados
- **Calificaciones**: Entre 3.5 y 5.0 estrellas

#### Zonas de Kansas City (8 zonas):
- Downtown Kansas City
- Westport
- Country Club Plaza
- Crossroads
- River Market
- Crown Center
- Union Station
- Power & Light District

#### Zonas de Caracas (10 zonas):
- Centro Caracas
- Chacao
- Las Mercedes
- Altamira
- La Candelaria
- Sabana Grande
- El Rosal
- Catia
- Petare
- Maracay

#### Datos Generados Automáticamente:
- **Teléfonos**: Formato venezolano (+58) y estadounidense (+1)
- **Placas**: Formato local de cada país
- **Emails**: Únicos para cada conductora
- **Licencias de conducir**: Generadas automáticamente
- **Coordenadas**: Ubicaciones realistas dentro del radio de cada zona
- **Vehículos**: Años 2015-2023 con colores variados

## Requisitos Previos

### Variables de Entorno
Asegúrese de tener configuradas las siguientes variables en su archivo `.env`:

```env
# Base de Datos
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=su_contraseña
DB_DATABASE=taxirosa

# Opcional para producción
NODE_ENV=development
```

### Base de Datos
1. **PostgreSQL** debe estar ejecutándose
2. La base de datos `taxirosa` debe existir
3. **PostGIS** debe estar habilitado para funciones geoespaciales

## Uso Recomendado

### Para Desarrollo
```bash
# 1. Crear usuario administrador
npm run create-admin

# 2. Poblar con conductoras de prueba
npm run seed-drivers
```

### Para Pruebas
```bash
# Generar datos de prueba
npm run seed-drivers
```

## Características Técnicas

### Script de Conductoras (`create-drivers-seed.ts`)
- **Conexión**: TypeORM con PostgreSQL
- **Entidades**: Driver, Zone
- **Validaciones**: Datos únicos (teléfono, email, placa)
- **Geolocalización**: Coordenadas PostGIS
- **Procesamiento**: Por lotes de 10 conductoras
- **Logging**: Progreso detallado y estadísticas finales

### Salida del Script
Al ejecutar `npm run seed-drivers`, verá:
```
🚗 Iniciando script de creación de conductoras...
🔌 Conectando a la base de datos...
✅ Conexión establecida
📊 Conductoras existentes en la base de datos: 0
🗺️  Verificando zonas...
📍 Creando zona: Downtown Kansas City
...
👥 Generando 100 conductoras...
💾 Guardando conductoras en la base de datos...
✅ Guardados 10/100 conductoras
...
📊 RESUMEN:
✅ Total de conductoras en la base de datos: 100
🇺🇸 Conductoras en Kansas City (aprox): 45
🇻🇪 Conductoras en Caracas (aprox): 55
📍 Zonas disponibles: 18
🎉 ¡Script completado exitosamente!
```

## Solución de Problemas

### Error de Conexión
```
❌ Error: ECONNREFUSED
```
**Solución**: Verifique que PostgreSQL esté ejecutándose y las credenciales sean correctas.

### Error de Datos Duplicados
```
❌ Error: 23505
```
**Solución**: El script maneja automáticamente la generación de datos únicos. Si persiste, limpie la tabla de conductoras.

### Error de PostGIS
**Solución**: Asegúrese de que PostGIS esté instalado y habilitado:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

## Limpieza de Datos

Para limpiar los datos de prueba:
```sql
-- Eliminar conductoras de prueba
DELETE FROM drivers WHERE email LIKE '%gmail.com' OR email LIKE '%email.com';

-- Eliminar zonas de prueba (opcional)
DELETE FROM zones WHERE name LIKE '%Kansas City%' OR name LIKE '%Caracas%';
```

## Personalización

Puede modificar el script `create-drivers-seed.ts` para:
- Cambiar la cantidad de conductoras (línea 184)
- Agregar nuevas zonas o ciudades
- Modificar los datos generados (nombres, vehículos, etc.)
- Ajustar las tarifas por zona 