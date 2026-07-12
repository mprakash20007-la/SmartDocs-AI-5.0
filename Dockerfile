# Stage 1: Build the client assets and server bundle
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install all dependencies (including devDependencies for build tools)
COPY package*.json ./
RUN npm install

# Copy all project source code
COPY . .

# Run the build script (vite build and esbuild server.ts compilation)
RUN npm run build

# Stage 2: Production runtime environment
FROM node:20-alpine

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled assets and server code from the builder stage
COPY --from=builder /app/dist ./dist

# Copy the pre-seeded local database folder
COPY data ./data

# Expose the default Cloud Run port
EXPOSE 8080

# Start the application
CMD ["node", "dist/server.cjs"]
