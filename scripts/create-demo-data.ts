import { DataSource } from 'typeorm';
import { Driver, DriverStatus } from '../src/entities/driver.entity';
import { Client } from '../src/entities/client.entity';
import { Ride, RideStatus } from '../src/entities/ride.entity';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });
async function createDemoData() {
  console.log('🎭 Creando datos demo para Apple TestFlight...');

  // Configuración de la base de datos
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'taxi_rosa',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    synchronize: true,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Conexión a base de datos establecida');

    const driverRepo = dataSource.getRepository(Driver);
    const clientRepo = dataSource.getRepository(Client);
    const rideRepo = dataSource.getRepository(Ride);

    // 1. Crear/actualizar conductora demo
    console.log('👤 Creando conductora demo...');
    
    let demoDriver = await driverRepo.findOne({ 
      where: { phone_number: '+15550123' } 
    });

    if (demoDriver) {
      // Actualizar conductora existente
      await driverRepo.update(demoDriver.id, {
        first_name: 'Demo',
        last_name: 'Driver',
        email: 'demo@taxirosa.com',
        vehicle: 'Toyota',
        model: 'Camry',
        color: 'Blanco',
        year: 2022,
        license_plate: 'DEMO-123',
        driver_license: 'DEMO-LIC-001',
        id_document: 'DEMO-ID-001',
        is_demo_account: true,
        verified: true,
        active: true,
        status: DriverStatus.AVAILABLE,
        average_rating: 4.8
      });
      console.log('✅ conductora demo actualizado');
    } else {
      // Crear nuevo conductora demo usando raw SQL para evitar problemas de tipos
      await dataSource.query(`
        INSERT INTO drivers (
          first_name, last_name, phone_number, email, vehicle, model, color, year,
          license_plate, driver_license, id_document, status, average_rating,
          active, verified, is_demo_account, registration_date
        ) VALUES (
          'Demo', 'Driver', '+15550123', 'demo@taxirosa.com', 'Toyota', 'Camry', 'Blanco', 2022,
          'DEMO-123', 'DEMO-LIC-001', 'DEMO-ID-001', 'available', 4.8,
          true, true, true, NOW()
        )
      `);
      
      demoDriver = await driverRepo.findOne({ 
        where: { phone_number: '+15550123' } 
      });
      console.log('✅ conductora demo creado');
    }

    // 2. Crear clientes demo
    console.log('👥 Creando clientes demo...');
    
    const demoClients = [
      { first_name: 'Sarah', last_name: 'Johnson', phone_number: '+1-555-0001', email: 'sarah.demo@example.com' },
      { first_name: 'Mike', last_name: 'Chen', phone_number: '+1-555-0002', email: 'mike.demo@example.com' },
      { first_name: 'Emma', last_name: 'Wilson', phone_number: '+1-555-0003', email: 'emma.demo@example.com' },
      { first_name: 'Robert', last_name: 'Davis', phone_number: '+1-555-0004', email: 'robert.demo@example.com' },
      { first_name: 'Lisa', last_name: 'Rodriguez', phone_number: '+1-555-0005', email: 'lisa.demo@example.com' },
      { first_name: 'Alex', last_name: 'Morgan', phone_number: '+1-555-0006', email: 'alex.demo@example.com' }
    ];

    const createdClients = [];
    for (const clientData of demoClients) {
      let client = await clientRepo.findOne({ 
        where: { phone_number: clientData.phone_number } 
      });
      
      if (!client) {
        // Usar raw SQL para crear cliente
        await dataSource.query(`
          INSERT INTO clients (first_name, last_name, phone_number, email, active, registration_date)
          VALUES ('${clientData.first_name}', '${clientData.last_name}', '${clientData.phone_number}', '${clientData.email}', true, NOW())
        `);
        
        client = await clientRepo.findOne({ 
          where: { phone_number: clientData.phone_number } 
        });
        console.log(`  ✅ Cliente creado: ${client.first_name} ${client.last_name}`);
      } else {
        console.log(`  ℹ️ Cliente ya existe: ${client.first_name} ${client.last_name}`);
      }
      createdClients.push(client);
    }

    // 3. Crear rides demo históricos
    console.log('🚗 Creando viajes demo...');

    const now = new Date();
    const demoRides = [
      {
        client: createdClients[0],
        origin: 'Miami International Airport, Terminal 1',
        destination: 'Downtown Hotel Plaza, 123 Biscayne Blvd',
        origin_coordinates: 'POINT(-80.1918 25.7617)',
        destination_coordinates: 'POINT(-80.1937 25.7743)',
        request_date: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 horas atrás
        assignment_date: new Date(now.getTime() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000),
        start_date: new Date(now.getTime() - 2 * 60 * 60 * 1000 + 10 * 60 * 1000),
        end_date: new Date(now.getTime() - 1 * 60 * 60 * 1000 - 35 * 60 * 1000),
        status: RideStatus.COMPLETED,
        price: 45.50,
        commission_percentage: 10.00,
        commission_amount: 4.55,
        distance: 12.3,
        duration: 25,
        tracking_code: 'DEMO001',
        payment_method: 'cash',
        driver_rating: 5,
        client_rating: 5
      },
      {
        client: createdClients[1],
        origin: 'Central Mall, 456 Shopping Way',
        destination: 'University Campus, 789 College Ave',
        origin_coordinates: 'POINT(-80.2000 25.7700)',
        destination_coordinates: 'POINT(-80.1900 25.7800)',
        request_date: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        assignment_date: new Date(now.getTime() - 4 * 60 * 60 * 1000 + 3 * 60 * 1000),
        start_date: new Date(now.getTime() - 4 * 60 * 60 * 1000 + 8 * 60 * 1000),
        end_date: new Date(now.getTime() - 3 * 60 * 60 * 1000 - 45 * 60 * 1000),
        status: RideStatus.COMPLETED,
        price: 18.75,
        commission_percentage: 10.00,
        commission_amount: 1.88,
        distance: 5.8,
        duration: 15,
        tracking_code: 'DEMO002',
        payment_method: 'card',
        driver_rating: 4,
        client_rating: 5
      },
      {
        client: createdClients[2],
        origin: 'General Hospital, 321 Health St',
        destination: 'Residential Area, 654 Quiet Lane',
        origin_coordinates: 'POINT(-80.2100 25.7900)',
        destination_coordinates: 'POINT(-80.1800 25.8000)',
        request_date: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        assignment_date: new Date(now.getTime() - 6 * 60 * 60 * 1000 + 2 * 60 * 1000),
        start_date: new Date(now.getTime() - 6 * 60 * 60 * 1000 + 7 * 60 * 1000),
        end_date: new Date(now.getTime() - 5 * 60 * 60 * 1000 - 40 * 60 * 1000),
        status: RideStatus.COMPLETED,
        price: 28.25,
        commission_percentage: 10.00,
        commission_amount: 2.83,
        distance: 7.2,
        duration: 20,
        tracking_code: 'DEMO003',
        payment_method: 'cash',
        driver_rating: 5,
        client_rating: 4
      },
      {
        client: createdClients[3],
        origin: 'Business District, 987 Corporate Blvd',
        destination: 'Miami International Airport, Terminal 2',
        origin_coordinates: 'POINT(-80.1950 25.7750)',
        destination_coordinates: 'POINT(-80.1918 25.7617)',
        request_date: new Date(now.getTime() - 32 * 60 * 60 * 1000), // Ayer
        assignment_date: new Date(now.getTime() - 32 * 60 * 60 * 1000 + 4 * 60 * 1000),
        start_date: new Date(now.getTime() - 32 * 60 * 60 * 1000 + 9 * 60 * 1000),
        end_date: new Date(now.getTime() - 31 * 60 * 60 * 1000 - 32 * 60 * 1000),
        status: RideStatus.COMPLETED,
        price: 42.00,
        commission_percentage: 10.00,
        commission_amount: 4.20,
        distance: 11.8,
        duration: 28,
        tracking_code: 'DEMO004',
        payment_method: 'card',
        driver_rating: 4,
        client_rating: 5
      },
      {
        client: createdClients[4],
        origin: 'Oceanview Restaurant, 159 Beach Rd',
        destination: 'Suburb Home, 753 Family Street',
        origin_coordinates: 'POINT(-80.1300 25.7600)',
        destination_coordinates: 'POINT(-80.2200 25.8100)',
        request_date: new Date(now.getTime() - 18 * 60 * 60 * 1000),
        assignment_date: new Date(now.getTime() - 18 * 60 * 60 * 1000 + 6 * 60 * 1000),
        start_date: new Date(now.getTime() - 18 * 60 * 60 * 1000 + 12 * 60 * 1000),
        end_date: new Date(now.getTime() - 17 * 60 * 60 * 1000 - 37 * 60 * 1000),
        status: RideStatus.COMPLETED,
        price: 35.50,
        commission_percentage: 10.00,
        commission_amount: 3.55,
        distance: 9.4,
        duration: 23,
        tracking_code: 'DEMO005',
        payment_method: 'cash',
        driver_rating: 5,
        client_rating: 5
      },
      // Carrera activa para demostrar funcionalidad
      {
        client: createdClients[5],
        origin: 'City Center Mall, 123 Main Street',
        destination: 'Residential Complex, 456 Oak Avenue',
        origin_coordinates: 'POINT(-80.1900 25.7750)',
        destination_coordinates: 'POINT(-80.1700 25.7850)',
        request_date: new Date(now.getTime() - 10 * 60 * 1000),
        assignment_date: new Date(now.getTime() - 5 * 60 * 1000),
        status: RideStatus.IN_PROGRESS,
        price: 22.50,
        commission_percentage: 10.00,
        commission_amount: 2.25,
        distance: 3.2,
        duration: 12,
        tracking_code: 'DEMO006',
        payment_method: 'card'
      }
    ];

    for (const rideData of demoRides) {
      // Verificar si el ride ya existe
      const existingRide = await rideRepo.findOne({
        where: { tracking_code: rideData.tracking_code }
      });

      if (!existingRide) {
        // Usar raw SQL para evitar problemas de tipos
        const endDateSql = rideData.end_date ? `'${rideData.end_date.toISOString()}'` : 'NULL';
        const startDateSql = rideData.start_date ? `'${rideData.start_date.toISOString()}'` : 'NULL';
        const driverRatingSql = rideData.driver_rating || 'NULL';
        const clientRatingSql = rideData.client_rating || 'NULL';

        await dataSource.query(`
          INSERT INTO rides (
            client_id, driver_id, origin, destination,
            origin_coordinates, destination_coordinates,
            request_date, assignment_date, start_date, end_date,
            status, price, commission_percentage, commission_amount,
            distance, duration, tracking_code, payment_method,
            driver_rating, client_rating
          ) VALUES (
            ${rideData.client.id}, ${demoDriver.id}, '${rideData.origin}', '${rideData.destination}',
            ST_GeogFromText('${rideData.origin_coordinates}'), ST_GeogFromText('${rideData.destination_coordinates}'),
            '${rideData.request_date.toISOString()}', '${rideData.assignment_date.toISOString()}',
            ${startDateSql}, ${endDateSql},
            '${rideData.status}', ${rideData.price}, ${rideData.commission_percentage}, ${rideData.commission_amount},
            ${rideData.distance}, ${rideData.duration}, '${rideData.tracking_code}', '${rideData.payment_method}',
            ${driverRatingSql}, ${clientRatingSql}
          )
        `);

        console.log(`  ✅ Viaje creado: ${rideData.tracking_code} (${rideData.status})`);
      } else {
        console.log(`  ℹ️ Viaje ya existe: ${rideData.tracking_code}`);
      }
    }

    // 4. Verificación final
    console.log('\n🔍 Verificación de datos creados:');
    
    const finalDriver = await driverRepo.findOne({ 
      where: { phone_number: '+15550123' } 
    });
    
    const totalRides = await rideRepo.count({ 
      where: { driver_id: finalDriver.id } 
    });
    
    const completedRides = await rideRepo.count({ 
      where: { driver_id: finalDriver.id, status: RideStatus.COMPLETED } 
    });
    
    const activeRides = await rideRepo.count({ 
      where: { driver_id: finalDriver.id, status: RideStatus.IN_PROGRESS } 
    });

    const totalEarnings = await rideRepo
      .createQueryBuilder('ride')
      .select('SUM(ride.price)', 'total')
      .where('ride.driver_id = :driverId AND ride.status = :status', { 
        driverId: finalDriver.id, 
        status: RideStatus.COMPLETED 
      })
      .getRawOne();

    console.log('🎭 conductora DEMO:');
    console.log(`  ID: ${finalDriver.id}`);
    console.log(`  Nombre: ${finalDriver.first_name} ${finalDriver.last_name}`);
    console.log(`  Teléfono: ${finalDriver.phone_number}`);
    console.log(`  Email: ${finalDriver.email}`);
    console.log(`  Es Demo: ${finalDriver.is_demo_account}`);
    console.log(`  Verificado: ${finalDriver.verified}`);
    console.log(`  Activo: ${finalDriver.active}`);

    console.log('\n📊 ESTADÍSTICAS DEMO:');
    console.log(`  Total viajes: ${totalRides}`);
    console.log(`  Viajes completados: ${completedRides}`);
    console.log(`  Viajes activos: ${activeRides}`);
    console.log(`  Ganancias totales: $${totalEarnings?.total || 0}`);

    console.log('\n✅ ¡Datos demo creados exitosamente para Apple TestFlight!');
    console.log('\n📱 INSTRUCCIONES PARA APPLE TESTERS:');
    console.log('1. Abrir app Taxi Rosa');
    console.log('2. Introducir teléfono: +15550123');
    console.log('3. Usar código OTP: 123456 (o cualquier código de 6 dígitos)');
    console.log('4. Explorar todas las funcionalidades disponibles');

  } catch (error) {
    console.error('❌ Error creando datos demo:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('✅ Conexión a base de datos cerrada');
  }
}

// Ejecutar el script
if (require.main === module) {
  createDemoData()
    .then(() => {
      console.log('🎉 Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en script:', error);
      process.exit(1);
    });
}

export default createDemoData; 