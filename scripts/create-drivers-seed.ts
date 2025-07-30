import { DataSource } from 'typeorm';
import { Driver, DriverStatus } from '../src/entities/driver.entity';
import { DriverLocation } from '../src/entities/driver-location.entity';
import { Ride } from '../src/entities/ride.entity';
import { DriverPendingResponse } from '../src/entities/driver-pending-response.entity';
import { Rating } from '../src/entities/rating.entity';
import { Commission } from '../src/entities/commission.entity';
import { Incident } from '../src/entities/incident.entity';
import { User } from '../src/entities/user.entity';
import { Client } from '../src/entities/client.entity';
import { Comment } from '../src/entities/comment.entity';
import { CancellationReason } from '../src/entities/cancellation-reason.entity';
import { config } from 'dotenv';

// Cargar variables de entorno
config();

// Datos para generar conductoras ficticios
const FIRST_NAMES = [
  'Carlos', 'María', 'José', 'Ana', 'Luis', 'Carmen', 'Miguel', 'Rosa', 'Pedro', 'Elena',
  'John', 'Sarah', 'Michael', 'Jennifer', 'David', 'Lisa', 'Robert', 'Karen', 'William', 'Nancy',
  'Antonio', 'Laura', 'Francisco', 'Patricia', 'Rafael', 'Sandra', 'Manuel', 'Diana', 'Alberto', 'Mónica'
];

const LAST_NAMES = [
  'García', 'Martínez', 'López', 'González', 'Rodríguez', 'Pérez', 'Sánchez', 'Ramírez', 'Cruz', 'Flores',
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernández', 'Jiménez', 'Díaz', 'Torres', 'Vargas', 'Castillo', 'Morales', 'Ortiz', 'Delgado', 'Castro'
];

const VEHICLES = [
  { brand: 'Toyota', model: 'Corolla' },
  { brand: 'Honda', model: 'Civic' },
  { brand: 'Nissan', model: 'Sentra' },
  { brand: 'Hyundai', model: 'Elantra' },
  { brand: 'Chevrolet', model: 'Aveo' },
  { brand: 'Ford', model: 'Focus' },
  { brand: 'Volkswagen', model: 'Jetta' },
  { brand: 'Kia', model: 'Rio' },
  { brand: 'Mazda', model: 'Mazda3' },
  { brand: 'Mitsubishi', model: 'Lancer' }
];

const COLORS = ['Blanco', 'Negro', 'Gris', 'Plata', 'Azul', 'Rojo', 'Dorado', 'Verde'];

// Coordenadas reales para las ciudades
const KANSAS_CITY_LOCATIONS = [
  { name: 'Downtown Kansas City', lat: 39.0997, lng: -94.5786 },
  { name: 'Westport', lat: 39.0611, lng: -94.5969 },
  { name: 'Country Club Plaza', lat: 39.0431, lng: -94.5906 },
  { name: 'Crossroads', lat: 39.0864, lng: -94.5833 },
  { name: 'River Market', lat: 39.1125, lng: -94.5831 },
  { name: 'Crown Center', lat: 39.0786, lng: -94.5844 },
  { name: 'Union Station', lat: 39.0842, lng: -94.5858 },
  { name: 'Power & Light District', lat: 39.1008, lng: -94.5792 },
  { name: 'Overland Park', lat: 38.9822, lng: -94.6708 },
  { name: 'Independence', lat: 39.0911, lng: -94.4155 }
];

const CARACAS_LOCATIONS = [
  { name: 'Centro Caracas', lat: 10.5011, lng: -66.9169 },
  { name: 'Chacao', lat: 10.4928, lng: -66.8531 },
  { name: 'Las Mercedes', lat: 10.4889, lng: -66.8658 },
  { name: 'Altamira', lat: 10.4969, lng: -66.8419 },
  { name: 'La Candelaria', lat: 10.4942, lng: -66.9178 },
  { name: 'Sabana Grande', lat: 10.4939, lng: -66.8856 },
  { name: 'El Rosal', lat: 10.5003, lng: -66.8581 },
  { name: 'Catia', lat: 10.5197, lng: -66.9617 },
  { name: 'Petare', lat: 10.4758, lng: -66.8019 },
  { name: 'Maracay', lat: 10.4697, lng: -66.8189 },
  { name: 'San Bernardino', lat: 10.5047, lng: -66.9089 },
  { name: 'Baruta', lat: 10.4333, lng: -66.8739 }
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generatePhoneNumber(isVenezuela: boolean): string {
  if (isVenezuela) {
    // Formato venezolano: +58XXXXXXXXX
    const codes = ['412', '414', '416', '424', '426'];
    const code = getRandomElement(codes);
    const number = Math.floor(1000000 + Math.random() * 9000000);
    return `+58${code}${number}`;
  } else {
    // Formato estadounidense: +1XXXXXXXXXX
    const areaCode = Math.floor(200 + Math.random() * 800);
    const number = Math.floor(1000000 + Math.random() * 9000000);
    return `+1${areaCode}${number}`;
  }
}

function generateLicensePlate(isVenezuela: boolean): string {
  if (isVenezuela) {
    // Formato venezolano: AAA123
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const letter1 = letters[Math.floor(Math.random() * letters.length)];
    const letter2 = letters[Math.floor(Math.random() * letters.length)];
    const letter3 = letters[Math.floor(Math.random() * letters.length)];
    const numbers = Math.floor(100 + Math.random() * 900);
    return `${letter1}${letter2}${letter3}${numbers}`;
  } else {
    // Formato estadounidense: ABC1234
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const letter1 = letters[Math.floor(Math.random() * letters.length)];
    const letter2 = letters[Math.floor(Math.random() * letters.length)];
    const letter3 = letters[Math.floor(Math.random() * letters.length)];
    const numbers = Math.floor(1000 + Math.random() * 9000);
    return `${letter1}${letter2}${letter3}${numbers}`;
  }
}

function generateCoordinatesNearLocation(location: { lat: number, lng: number }, radiusKm: number = 3): string {
  // Generar coordenadas aleatorias dentro de un radio
  const lat = location.lat + (Math.random() - 0.5) * (radiusKm / 111); // 1 grado ≈ 111 km
  const lng = location.lng + (Math.random() - 0.5) * (radiusKm / 111);
  
  // Retornar en formato WKT (Well-Known Text) que es más compatible
  return `POINT(${lng} ${lat})`;
}

async function createDriversSeed() {
  console.log('🚗 Iniciando script de creación de conductoras...');
  
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'taxirosa',
    entities: [
      Driver, 
      DriverLocation, 
      Ride, 
      DriverPendingResponse, 
      Rating, 
      Commission, 
      Incident, 
      User, 
      Client, 
      Comment, 
      CancellationReason
    ],
    synchronize: process.env.NODE_ENV !== 'production',
    logging: false,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔌 Conectando a la base de datos...');
    await dataSource.initialize();
    console.log('✅ Conexión establecida');

    const driverRepository = dataSource.getRepository(Driver);

    // Verificar conductoras existentes
    const existingDriversCount = await driverRepository.count();
    console.log(`📊 Conductoras existentes en la base de datos: ${existingDriversCount}`);

    // Combinar todas las ubicaciones
    const allLocations = [
      ...KANSAS_CITY_LOCATIONS.map(loc => ({ ...loc, isVenezuela: false })),
      ...CARACAS_LOCATIONS.map(loc => ({ ...loc, isVenezuela: true }))
    ];

    console.log(`📍 ${allLocations.length} ubicaciones disponibles`);
    console.log(`🇺🇸 Kansas City: ${KANSAS_CITY_LOCATIONS.length} zonas`);
    console.log(`🇻🇪 Caracas: ${CARACAS_LOCATIONS.length} zonas`);

    // Generar 100 conductoras
    console.log('👥 Generando 100 conductoras...');
    const drivers = [];
    const usedPhones = new Set<string>();
    const usedPlates = new Set<string>();
    const usedEmails = new Set<string>();

    for (let i = 0; i < 100; i++) {
      const firstName = getRandomElement(FIRST_NAMES);
      const lastName = getRandomElement(LAST_NAMES);
      const location = getRandomElement(allLocations);
      const vehicle = getRandomElement(VEHICLES);
      const color = getRandomElement(COLORS);
      const year = 2015 + Math.floor(Math.random() * 9); // Años 2015-2023
      
      // Generar datos únicos
      let phoneNumber, licensePlate, email;
      
      do {
        phoneNumber = generatePhoneNumber(location.isVenezuela);
      } while (usedPhones.has(phoneNumber));
      usedPhones.add(phoneNumber);

      do {
        licensePlate = generateLicensePlate(location.isVenezuela);
      } while (usedPlates.has(licensePlate));
      usedPlates.add(licensePlate);

      do {
        email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@${location.isVenezuela ? 'gmail.com' : 'email.com'}`;
      } while (usedEmails.has(email));
      usedEmails.add(email);

      const driver = driverRepository.create({
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        email: email,
        vehicle: `${vehicle.brand} ${vehicle.model}`,
        model: vehicle.model,
        color: color,
        year: year,
        license_plate: licensePlate,
        driver_license: `DL${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
        id_document: `ID${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
        status: Math.random() > 0.3 ? DriverStatus.AVAILABLE : DriverStatus.OFFLINE,
        current_location: generateCoordinatesNearLocation({ lat: location.lat, lng: location.lng }),
        last_update: new Date(),
        average_rating: 3.5 + Math.random() * 1.5, // Calificación entre 3.5 y 5.0
        active: true,
        verified: Math.random() > 0.1, // 90% verificados
      });

      drivers.push(driver);
    }

    // Guardar conductoras usando SQL crudo para manejar las coordenadas
    console.log('💾 Guardando conductoras en la base de datos...');
    let saved = 0;

    for (const driver of drivers) {
      try {
        await driverRepository.query(`
          INSERT INTO drivers (
            first_name, last_name, phone_number, email, vehicle, model, color, year,
            license_plate, driver_license, id_document, status, current_location,
            last_update, average_rating, active, verified
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 
            ST_GeomFromText($13, 4326)::geography, $14, $15, $16, $17
          )
        `, [
          driver.first_name,
          driver.last_name,
          driver.phone_number,
          driver.email,
          driver.vehicle,
          driver.model,
          driver.color,
          driver.year,
          driver.license_plate,
          driver.driver_license,
          driver.id_document,
          driver.status,
          driver.current_location, // Ya está en formato WKT
          driver.last_update,
          driver.average_rating,
          driver.active,
          driver.verified
        ]);
        
        saved++;
        if (saved % 10 === 0) {
          console.log(`✅ Guardados ${saved}/${drivers.length} conductoras`);
        }
      } catch (error) {
        console.error(`❌ Error al guardar conductora ${driver.first_name} ${driver.last_name}:`, error.message);
      }
    }
    
    console.log(`✅ Guardados ${saved}/${drivers.length} conductoras totales`);

    // Estadísticas finales
    const totalDrivers = await driverRepository.count();
    
    // Contar conductoras por región usando coordenadas aproximadas
    const kansasDrivers = await driverRepository
      .createQueryBuilder('driver')
      .where('ST_DWithin(driver.current_location, ST_Point(-94.5786, 39.0997), 100000)') // 100km radius
      .getCount();
    
    const caracasDrivers = await driverRepository
      .createQueryBuilder('driver')
      .where('ST_DWithin(driver.current_location, ST_Point(-66.9169, 10.5011), 100000)') // 100km radius
      .getCount();

    console.log('\n📊 RESUMEN:');
    console.log(`✅ Total de conductoras en la base de datos: ${totalDrivers}`);
    console.log(`🇺🇸 Conductoras en Kansas City: ${kansasDrivers}`);
    console.log(`🇻🇪 Conductoras en Caracas: ${caracasDrivers}`);
    console.log(`📱 Conductoras disponibles: ${drivers.filter(d => d.status === DriverStatus.AVAILABLE).length}`);
    console.log(`📴 Conductoras desconectados: ${drivers.filter(d => d.status === DriverStatus.OFFLINE).length}`);
    console.log(`✅ Conductoras verificados: ${drivers.filter(d => d.verified).length}`);
    console.log('\n🎉 ¡Script completado exitosamente!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 No se puede conectar a PostgreSQL. Verifique la conexión.');
    } else if (error.code === '23505') {
      console.log('⚠️  Conflicto de datos únicos (teléfono, email o placa duplicada)');
    } else {
      console.log('💡 Error:', error.code || 'UNKNOWN');
      console.log('💡 Mensaje completo:', error);
    }
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('🔌 Conexión cerrada');
    }
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  createDriversSeed().catch(console.error);
}

export { createDriversSeed }; 