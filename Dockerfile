# Use the official Node parent image
FROM node:22-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package files and install with npm (no Bun required)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the application code
COPY . .

# Build the application
RUN npm run build

# Inform Docker that the container is listening on port 7896 at runtime
EXPOSE 7896

# Run the application
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "7896"]
