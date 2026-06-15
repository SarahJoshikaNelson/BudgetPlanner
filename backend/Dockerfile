# Stage 1: Build the TypeScript backend
FROM node:22-alpine AS build
# Install system build dependencies required for native C++ modules
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Run the production application
FROM node:22-alpine
# Native SQLite drivers require compilation tools to install properly
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/app.js"]
