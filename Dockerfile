# Dockerfile para aplicación NestJS

# Etapa 1: Build
FROM node:18-alpine AS builder

# Establece el directorio de trabajo
WORKDIR /app

# Copia los archivos de configuración de dependencias
COPY package*.json ./

# Instala las dependencias
RUN npm ci --only=production

# Copia el código fuente
COPY . .

# Construye la aplicación
RUN npm run build

# Etapa 2: Producción
FROM node:18-alpine AS production

# Establece el directorio de trabajo
WORKDIR /app

# Copia los archivos de configuración de dependencias
COPY package*.json ./

# Instala solo las dependencias de producción
RUN npm ci --only=production && npm cache clean --force

# Copia la aplicación construida desde la etapa de build
COPY --from=builder /app/dist ./dist

# Crea un usuario no root para ejecutar la aplicación
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Cambia la propiedad de los archivos al usuario nestjs
RUN chown -R nestjs:nodejs /app
USER nestjs

# Expone el puerto 3000
EXPOSE 3000

# Comando para ejecutar la aplicación
CMD ["node", "dist/main"]