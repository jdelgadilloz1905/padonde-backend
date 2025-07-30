import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Client } from '@googlemaps/google-maps-services-js';
import axios from 'axios';

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly googleMapsClient: Client;
  private readonly googleMapsApiKey: string;

  constructor() {
    this.googleMapsClient = new Client({});
    // La API key se puede pasar como variable de entorno
    this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  }

  /**
   * Calcula distancia y duración usando Google Maps Directions API
   */
  async calculateDistanceAndDurationWithGoogleMaps(
    originLat: number,
    originLon: number,
    destLat: number,
    destLon: number
  ): Promise<{ distance: number, duration: number }> {
    try {
      if (!this.googleMapsApiKey) {
        throw new Error('Google Maps API key no configurada');
      }

      this.logger.log(`Calculando ruta con Google Maps de [${originLat}, ${originLon}] a [${destLat}, ${destLon}]`);

      const response = await this.googleMapsClient.directions({
        params: {
          origin: `${originLat},${originLon}`,
          destination: `${destLat},${destLon}`,
          mode: 'driving' as any,
          key: this.googleMapsApiKey,
          units: 'metric' as any,
          avoid: ['tolls'] as any, // Evitar peajes para obtener la ruta más común
          traffic_model: 'best_guess' as any,
          departure_time: 'now' as any, // Considera tráfico actual
        },
      });

      if (!response.data.routes || response.data.routes.length === 0) {
        throw new BadRequestException('No se pudo encontrar una ruta entre origen y destino con Google Maps');
      }

      const route = response.data.routes[0];
      const leg = route.legs[0]; // Tomamos la primera etapa

      if (!leg.distance || !leg.duration) {
        throw new BadRequestException('Google Maps no devolvió información completa de distancia y duración');
      }

      // Distancia en metros, convertir a kilómetros con 2 decimales
      const distance = parseFloat((leg.distance.value / 1000).toFixed(2));
      
      // Duración en segundos, convertir a minutos redondeando hacia arriba
      let duration = Math.ceil(leg.duration.value / 60);

      // Si hay información de tráfico, usarla
      if (leg.duration_in_traffic && leg.duration_in_traffic.value > leg.duration.value) {
        duration = Math.ceil(leg.duration_in_traffic.value / 60);
        this.logger.log(`Google Maps: Usando duración con tráfico: ${duration} minutos`);
      }

      this.logger.log(`Google Maps - Distancia: ${distance}km, Duración: ${duration} minutos`);

      return { distance, duration };

    } catch (error) {
      this.logger.error(`Error en Google Maps Directions API: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Geocodifica una dirección a coordenadas WKT usando Google Maps (principal) o OpenStreetMap (fallback)
   */
  async geocodeAddress(address: string, contextCoordinates?: string, isOrigin?: boolean): Promise<string> {
    try {
      this.logger.log(`Geocodificando dirección: ${address}`);
      
      // Intentar primero con Google Maps si tenemos API key
      if (this.googleMapsApiKey) {
        try {
          return await this.geocodeWithGoogleMaps(address, contextCoordinates, isOrigin);
        } catch (error) {
          this.logger.warn(`Error con Google Maps, intentando con OpenStreetMap: ${error.message}`);
        }
      }
      
      // Fallback a OpenStreetMap
      return await this.geocodeWithOpenStreetMap(address, contextCoordinates, isOrigin);
      
    } catch (error) {
      this.logger.error(`Error al geocodificar dirección: ${error.message}`, error.stack);
      throw new BadRequestException(`No se pudo geocodificar la dirección: ${address}`);
    }
  }

  /**
   * Geocodificación usando Google Maps API
   */
  private async geocodeWithGoogleMaps(address: string, contextCoordinates?: string, isOrigin?: boolean): Promise<string> {
    try {
      this.logger.log(`Usando Google Maps para geocodificar: ${address}`);
      
      const request: any = {
        params: {
          address: address,
          key: this.googleMapsApiKey,
        },
      };

      // Si tenemos coordenadas de contexto, añadimos bias de ubicación
      if (contextCoordinates) {
        const coords = this.extractCoordsFromWKT(contextCoordinates);
        request.params.bounds = `${coords.latitude - 0.01},${coords.longitude - 0.01}|${coords.latitude + 0.01},${coords.longitude + 0.01}`;
      }

      const response = await this.googleMapsClient.geocode(request);

      if (!response.data.results || response.data.results.length === 0) {
        if (contextCoordinates && isOrigin) {
          return contextCoordinates;
        }
        throw new BadRequestException(`No se encontraron resultados para: ${address}`);
      }

      const result = response.data.results[0];
      const location = result.geometry.location;

      // Si tenemos coordenadas de contexto, verificar distancia
      if (contextCoordinates) {
        const contextCoords = this.extractCoordsFromWKT(contextCoordinates);
        const distance = this.calculateHaversineDistance(
          contextCoords.latitude,
          contextCoords.longitude,
          location.lat,
          location.lng
        );

        if (distance > 50) { // 50km máximo
          this.logger.warn(`Google Maps: Ubicación encontrada está a ${distance}km de las coordenadas proporcionadas`);
          if (isOrigin) {
            return contextCoordinates;
          }
          throw new BadRequestException(`La dirección está muy lejos de la ubicación esperada`);
        }
      }

      this.logger.log(`Google Maps geocodificó exitosamente: ${location.lng}, ${location.lat}`);
      return `POINT(${location.lng} ${location.lat})`;

    } catch (error) {
      this.logger.error(`Error en Google Maps geocoding: ${error.message}`);
      throw error;
    }
  }

  /**
   * Geocodificación usando OpenStreetMap (fallback)
   */
  private async geocodeWithOpenStreetMap(address: string, contextCoordinates?: string, isOrigin?: boolean): Promise<string> {
    try {
      this.logger.log(`Usando OpenStreetMap para geocodificar: ${address}`);
      
      const encodedAddress = encodeURIComponent(address);
      let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`;
      
      // Si tenemos coordenadas de contexto, las usamos para mejorar la precisión
      if (contextCoordinates) {
        const coords = this.extractCoordsFromWKT(contextCoordinates);
        url += `&viewbox=${coords.longitude - 0.5},${coords.latitude + 0.5},${coords.longitude + 0.5},${coords.latitude - 0.5}&bounded=1`;
      }
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'TaxiRosaApp/1.0'
        }
      });
      
      if (!response.data || response.data.length === 0) {
        if (contextCoordinates && isOrigin) {
          return contextCoordinates;
        }
        throw new BadRequestException(`No se pudo geocodificar con OpenStreetMap: ${address}`);
      }

      // Si tenemos coordenadas de contexto, verificamos distancia
      if (contextCoordinates) {
        const contextCoords = this.extractCoordsFromWKT(contextCoordinates);
        const resultCoords = {
          longitude: parseFloat(response.data[0].lon),
          latitude: parseFloat(response.data[0].lat)
        };

        const distance = this.calculateHaversineDistance(
          contextCoords.latitude,
          contextCoords.longitude,
          resultCoords.latitude,
          resultCoords.longitude
        );

        if (distance > 50) {
          this.logger.warn(`OpenStreetMap: Ubicación encontrada está a ${distance}km de las coordenadas proporcionadas`);
          if (isOrigin) {
            return contextCoordinates;
          }
          throw new BadRequestException(`La dirección está muy lejos de la ubicación esperada`);
        }
      }
      
      const { lon, lat } = response.data[0];
      this.logger.log(`OpenStreetMap geocodificó exitosamente: ${lon}, ${lat}`);
      return `POINT(${lon} ${lat})`;
      
    } catch (error) {
      this.logger.error(`Error en OpenStreetMap geocoding: ${error.message}`);
      throw error;
    }
  }

  /**
   * Geocodificación inversa para obtener dirección desde coordenadas
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<{ street: string, fullAddress: string }> {
    try {
      this.logger.log(`Geocodificación inversa para: ${latitude}, ${longitude}`);
      
      // Intentar primero con Google Maps si tenemos API key
      if (this.googleMapsApiKey) {
        try {
          return await this.reverseGeocodeWithGoogleMaps(latitude, longitude);
        } catch (error) {
          this.logger.warn(`Error con Google Maps reverso, intentando con OpenStreetMap: ${error.message}`);
        }
      }
      
      // Fallback a OpenStreetMap
      return await this.reverseGeocodeWithOpenStreetMap(latitude, longitude);
      
    } catch (error) {
      this.logger.error(`Error en geocodificación inversa: ${error.message}`, error.stack);
      throw new BadRequestException('No se pudo obtener información de la dirección para estas coordenadas');
    }
  }

  /**
   * Geocodificación inversa con Google Maps
   */
  private async reverseGeocodeWithGoogleMaps(latitude: number, longitude: number): Promise<{ street: string, fullAddress: string }> {
    const response = await this.googleMapsClient.reverseGeocode({
      params: {
        latlng: `${latitude},${longitude}`,
        key: this.googleMapsApiKey,
      },
    });

    if (!response.data.results || response.data.results.length === 0) {
      throw new BadRequestException('No se encontró información de dirección');
    }

    const result = response.data.results[0];
    const fullAddress = result.formatted_address;
    
    // Extraer el nombre de la calle
    const streetComponent = result.address_components.find(
      component => component.types.includes('route' as any)
    );
    
    const street = streetComponent ? streetComponent.long_name : 'Dirección no especificada';

    this.logger.log(`Google Maps geocodificación inversa exitosa: ${street}`);
    return { street, fullAddress };
  }

  /**
   * Geocodificación inversa con OpenStreetMap
   */
  private async reverseGeocodeWithOpenStreetMap(latitude: number, longitude: number): Promise<{ street: string, fullAddress: string }> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'TaxiRosaApp/1.0'
      }
    });
    
    if (!response.data || !response.data.address) {
      throw new BadRequestException('No se encontró información de dirección');
    }
    
    const address = response.data.address;
    const fullAddress = response.data.display_name;
    
    // Intentar obtener el nombre de la calle de diferentes campos
    const street = address.road || 
                  address.pedestrian || 
                  address.path || 
                  address.footway || 
                  address.cycleway || 
                  'Dirección no especificada';

    this.logger.log(`OpenStreetMap geocodificación inversa exitosa: ${street}`);
    return { street, fullAddress };
  }

  /**
   * Extraer coordenadas de formato WKT Point
   */
  private extractCoordsFromWKT(wktPoint: string): { longitude: number, latitude: number } {
    try {
      const coordsString = wktPoint.replace('POINT(', '').replace(')', '');
      const [lon, lat] = coordsString.split(' ').map(Number);
      return { longitude: lon, latitude: lat };
    } catch (error) {
      this.logger.error(`Error al extraer coordenadas de WKT: ${error.message}`);
      throw new BadRequestException('Formato de coordenadas inválido');
    }
  }

  /**
   * Calcular distancia usando fórmula de Haversine
   */
  private calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en kilómetros
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return parseFloat(distance.toFixed(2));
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }
} 