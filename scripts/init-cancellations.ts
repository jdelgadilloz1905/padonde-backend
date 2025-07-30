import { DataSource } from 'typeorm';
import { CancellationReason } from '../src/entities/cancellation-reason.entity';

// Configuración de base de datos (ajustar según sea necesario)
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'taxi_rosa',
  entities: [CancellationReason],
  synchronize: false,
  logging: true,
});

const cancellationReasons = [
  // Motivos para clientes
  {
    reason: 'Cliente no se presentó',
    description: 'El cliente no llegó al punto de encuentro',
    userType: 'driver',
  },
  {
    reason: 'Cliente cambió de opinión',
    description: 'El cliente decidió cancelar el viaje',
    userType: 'driver',
  },
  {
    reason: 'Problemas de comportamiento del cliente',
    description: 'El cliente tuvo un comportamiento inapropiado',
    userType: 'driver',
  },
  
  // Motivos para conductoras
  {
    reason: 'conductora no se presentó',
    description: 'El conductora no llegó al punto de encuentro',
    userType: 'client',
  },
  {
    reason: 'Problema mecánico del vehículo',
    description: 'El vehículo presentó fallas técnicas',
    userType: 'client',
  },
  {
    reason: 'conductora cambió de opinión',
    description: 'El conductora decidió no realizar el viaje',
    userType: 'client',
  },
  {
    reason: 'Problemas de comportamiento de la conductora',
    description: 'El conductora tuvo un comportamiento inapropiado',
    userType: 'client',
  },
  
  // Motivos para ambos
  {
    reason: 'Condiciones climáticas adversas',
    description: 'El clima no permite realizar el viaje de forma segura',
    userType: 'both',
  },
  {
    reason: 'Emergencia personal',
    description: 'Situación de emergencia que impide continuar',
    userType: 'both',
  },
  {
    reason: 'Problemas de tráfico',
    description: 'Tráfico excesivo que impide el servicio',
    userType: 'both',
  },
  {
    reason: 'Problema de comunicación',
    description: 'No se pudo establecer contacto',
    userType: 'both',
  },
  {
    reason: 'Tarifa incorrecta',
    description: 'Desacuerdo con el precio del viaje',
    userType: 'both',
  },
];

async function initCancellationReasons() {
  try {
    await AppDataSource.initialize();
    console.log('Conexión a la base de datos establecida');

    const cancellationReasonRepository = AppDataSource.getRepository(CancellationReason);

    // Verificar si ya existen datos
    const existingReasons = await cancellationReasonRepository.count();
    if (existingReasons > 0) {
      console.log('Los motivos de cancelación ya existen en la base de datos');
      return;
    }

    // Insertar motivos de cancelación
    for (const reasonData of cancellationReasons) {
      const reason = cancellationReasonRepository.create(reasonData);
      await cancellationReasonRepository.save(reason);
      console.log(`Motivo creado: ${reasonData.reason}`);
    }

    console.log('✅ Motivos de cancelación inicializados correctamente');
  } catch (error) {
    console.error('❌ Error al inicializar motivos de cancelación:', error);
  } finally {
    await AppDataSource.destroy();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  initCancellationReasons();
}

export default initCancellationReasons; 