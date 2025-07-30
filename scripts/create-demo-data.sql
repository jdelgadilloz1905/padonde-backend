-- ========================================
-- SCRIPT PARA CREAR DATOS DEMO - APPLE TESTFLIGHT
-- ========================================
-- Propósito: Crear credenciales demo para que Apple reviewers puedan probar la app
-- Teléfono Demo: +15550123
-- Código OTP: 123456 (bypass en backend)

-- ========================================
-- 1. CREAR conductora DEMO
-- ========================================
INSERT INTO drivers (
    first_name,
    last_name,
    phone_number,
    email,
    vehicle,
    model,
    color,
    year,
    license_plate,
    driver_license,
    id_document,
    status,
    average_rating,
    active,
    verified,
    is_demo_account,
    registration_date
) VALUES (
    'Demo',
    'Driver',
    '+15550123',
    'demo@taxirosa.com',
    'Toyota',
    'Camry',
    'Blanco',
    2022,
    'DEMO-123',
    'DEMO-LIC-001',
    'DEMO-ID-001',
    'available',
    4.8,
    true,
    true,
    true,  -- 🎭 FLAG DEMO: Importante para bypass
    NOW()
) ON CONFLICT (phone_number) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    vehicle = EXCLUDED.vehicle,
    model = EXCLUDED.model,
    color = EXCLUDED.color,
    year = EXCLUDED.year,
    license_plate = EXCLUDED.license_plate,
    is_demo_account = true,
    verified = true,
    active = true;

-- ========================================
-- 2. CREAR CLIENTES DEMO PARA HISTORIAL
-- ========================================
INSERT INTO clients (
    first_name,
    last_name,
    phone_number,
    email,
    active,
    registration_date
) VALUES 
('Sarah', 'Johnson', '+1-555-0001', 'sarah.demo@example.com', true, NOW()),
('Mike', 'Chen', '+1-555-0002', 'mike.demo@example.com', true, NOW()),
('Emma', 'Wilson', '+1-555-0003', 'emma.demo@example.com', true, NOW()),
('Robert', 'Davis', '+1-555-0004', 'robert.demo@example.com', true, NOW()),
('Lisa', 'Rodriguez', '+1-555-0005', 'lisa.demo@example.com', true, NOW()),
('Alex', 'Morgan', '+1-555-0006', 'alex.demo@example.com', true, NOW())
ON CONFLICT (phone_number) DO NOTHING;

-- ========================================
-- 3. CREAR VIAJES DEMO HISTÓRICOS
-- ========================================

-- Variables para IDs (PostgreSQL syntax)
DO $$
DECLARE
    demo_driver_id INTEGER;
    client_sarah_id INTEGER;
    client_mike_id INTEGER;
    client_emma_id INTEGER;
    client_robert_id INTEGER;
    client_lisa_id INTEGER;
    client_alex_id INTEGER;
BEGIN
    -- Obtener IDs
    SELECT id INTO demo_driver_id FROM drivers WHERE phone_number = '+15550123' AND is_demo_account = true;
    SELECT id INTO client_sarah_id FROM clients WHERE phone_number = '+1-555-0001';
    SELECT id INTO client_mike_id FROM clients WHERE phone_number = '+1-555-0002';
    SELECT id INTO client_emma_id FROM clients WHERE phone_number = '+1-555-0003';
    SELECT id INTO client_robert_id FROM clients WHERE phone_number = '+1-555-0004';
    SELECT id INTO client_lisa_id FROM clients WHERE phone_number = '+1-555-0005';
    SELECT id INTO client_alex_id FROM clients WHERE phone_number = '+1-555-0006';

    -- Viaje 1: Aeropuerto a Hotel (Miami coords)
    INSERT INTO rides (
        client_id,
        driver_id,
        origin,
        destination,
        origin_coordinates,
        destination_coordinates,
        request_date,
        assignment_date,
        start_date,
        end_date,
        status,
        price,
        commission_percentage,
        commission_amount,
        distance,
        duration,
        tracking_code,
        payment_method,
        driver_rating,
        client_rating
    ) VALUES (
        client_sarah_id,
        demo_driver_id,
        'Miami International Airport, Terminal 1',
        'Downtown Hotel Plaza, 123 Biscayne Blvd',
        ST_GeogFromText('POINT(-80.1918 25.7617)'),  -- Airport
        ST_GeogFromText('POINT(-80.1937 25.7743)'),  -- Downtown
        NOW() - INTERVAL '2 hours',
        NOW() - INTERVAL '2 hours' + INTERVAL '5 minutes',
        NOW() - INTERVAL '2 hours' + INTERVAL '10 minutes',
        NOW() - INTERVAL '1 hour 35 minutes',
        'completed',
        45.50,
        10.00,
        4.55,
        12.3,
        25,
        'DEMO001',
        'cash',
        5,
        5
    );

    -- Viaje 2: Mall a Universidad
    INSERT INTO rides (
        client_id,
        driver_id,
        origin,
        destination,
        origin_coordinates,
        destination_coordinates,
        request_date,
        assignment_date,
        start_date,
        end_date,
        status,
        price,
        commission_percentage,
        commission_amount,
        distance,
        duration,
        tracking_code,
        payment_method,
        driver_rating,
        client_rating
    ) VALUES (
        client_mike_id,
        demo_driver_id,
        'Central Mall, 456 Shopping Way',
        'University Campus, 789 College Ave',
        ST_GeogFromText('POINT(-80.2000 25.7700)'),
        ST_GeogFromText('POINT(-80.1900 25.7800)'),
        NOW() - INTERVAL '4 hours',
        NOW() - INTERVAL '4 hours' + INTERVAL '3 minutes',
        NOW() - INTERVAL '4 hours' + INTERVAL '8 minutes',
        NOW() - INTERVAL '3 hours 45 minutes',
        'completed',
        18.75,
        10.00,
        1.88,
        5.8,
        15,
        'DEMO002',
        'card',
        4,
        5
    );

    -- Viaje 3: Hospital a Residencia
    INSERT INTO rides (
        client_id,
        driver_id,
        origin,
        destination,
        origin_coordinates,
        destination_coordinates,
        request_date,
        assignment_date,
        start_date,
        end_date,
        status,
        price,
        commission_percentage,
        commission_amount,
        distance,
        duration,
        tracking_code,
        payment_method,
        driver_rating,
        client_rating
    ) VALUES (
        client_emma_id,
        demo_driver_id,
        'General Hospital, 321 Health St',
        'Residential Area, 654 Quiet Lane',
        ST_GeogFromText('POINT(-80.2100 25.7900)'),
        ST_GeogFromText('POINT(-80.1800 25.8000)'),
        NOW() - INTERVAL '6 hours',
        NOW() - INTERVAL '6 hours' + INTERVAL '2 minutes',
        NOW() - INTERVAL '6 hours' + INTERVAL '7 minutes',
        NOW() - INTERVAL '5 hours 40 minutes',
        'completed',
        28.25,
        10.00,
        2.83,
        7.2,
        20,
        'DEMO003',
        'cash',
        5,
        4
    );

    -- Viaje 4: Centro a Aeropuerto (ayer)
    INSERT INTO rides (
        client_id,
        driver_id,
        origin,
        destination,
        origin_coordinates,
        destination_coordinates,
        request_date,
        assignment_date,
        start_date,
        end_date,
        status,
        price,
        commission_percentage,
        commission_amount,
        distance,
        duration,
        tracking_code,
        payment_method,
        driver_rating,
        client_rating
    ) VALUES (
        client_robert_id,
        demo_driver_id,
        'Business District, 987 Corporate Blvd',
        'Miami International Airport, Terminal 2',
        ST_GeogFromText('POINT(-80.1950 25.7750)'),
        ST_GeogFromText('POINT(-80.1918 25.7617)'),
        NOW() - INTERVAL '1 day 8 hours',
        NOW() - INTERVAL '1 day 8 hours' + INTERVAL '4 minutes',
        NOW() - INTERVAL '1 day 8 hours' + INTERVAL '9 minutes',
        NOW() - INTERVAL '1 day 7 hours 32 minutes',
        'completed',
        42.00,
        10.00,
        4.20,
        11.8,
        28,
        'DEMO004',
        'card',
        4,
        5
    );

    -- Viaje 5: Restaurante a Casa (ayer noche)
    INSERT INTO rides (
        client_id,
        driver_id,
        origin,
        destination,
        origin_coordinates,
        destination_coordinates,
        request_date,
        assignment_date,
        start_date,
        end_date,
        status,
        price,
        commission_percentage,
        commission_amount,
        distance,
        duration,
        tracking_code,
        payment_method,
        driver_rating,
        client_rating
    ) VALUES (
        client_lisa_id,
        demo_driver_id,
        'Oceanview Restaurant, 159 Beach Rd',
        'Suburb Home, 753 Family Street',
        ST_GeogFromText('POINT(-80.1300 25.7600)'),
        ST_GeogFromText('POINT(-80.2200 25.8100)'),
        NOW() - INTERVAL '18 hours',
        NOW() - INTERVAL '18 hours' + INTERVAL '6 minutes',
        NOW() - INTERVAL '18 hours' + INTERVAL '12 minutes',
        NOW() - INTERVAL '17 hours 37 minutes',
        'completed',
        35.50,
        10.00,
        3.55,
        9.4,
        23,
        'DEMO005',
        'cash',
        5,
        5
    );

    -- Viaje 6: CARRERA ACTIVA PARA DEMOSTRAR FUNCIONALIDAD
    INSERT INTO rides (
        client_id,
        driver_id,
        origin,
        destination,
        origin_coordinates,
        destination_coordinates,
        request_date,
        assignment_date,
        status,
        price,
        commission_percentage,
        commission_amount,
        distance,
        duration,
        tracking_code,
        payment_method
    ) VALUES (
        client_alex_id,
        demo_driver_id,
        'City Center Mall, 123 Main Street',
        'Residential Complex, 456 Oak Avenue',
        ST_GeogFromText('POINT(-80.1900 25.7750)'),
        ST_GeogFromText('POINT(-80.1700 25.7850)'),
        NOW() - INTERVAL '10 minutes',
        NOW() - INTERVAL '5 minutes',
        'in_progress',  -- 🎯 Estado activo para demostrar
        22.50,
        10.00,
        2.25,
        3.2,
        12,
        'DEMO006',
        'card'
    );

END $$;

-- ========================================
-- 4. VERIFICACIÓN DE DATOS CREADOS
-- ========================================
SELECT 
    '🎭 conductora DEMO CREADO' as status,
    id,
    first_name,
    last_name,
    phone_number,
    email,
    is_demo_account
FROM drivers 
WHERE phone_number = '+15550123';

SELECT 
    '📊 VIAJES DEMO CREADOS' as status,
    COUNT(*) as total_rides,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_rides,
    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as active_rides,
    SUM(CASE WHEN status = 'completed' THEN price ELSE 0 END) as total_earnings
FROM rides r
JOIN drivers d ON r.driver_id = d.id
WHERE d.phone_number = '+15550123' AND d.is_demo_account = true; 