# Professional Dockerfile for Carbone + LibreOffice
FROM node:20-slim

# Install dependencies for Carbone and LibreOffice
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice \
    libreoffice-java-common \
    default-jre \
    fonts-dejavu \
    fonts-liberation \
    fonts-noto \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install app dependencies
RUN npm install --production

# Copy app source
COPY . .

# Create templates directory if it doesn't exist
RUN mkdir -p templates

# Expose port (default 3000)
EXPOSE 3000

# Start the application
CMD [ "npm", "start" ]
