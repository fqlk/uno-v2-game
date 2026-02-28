# Base image
FROM node:20-slim

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# Copy package.json and package-lock.json first for better caching
COPY package*.json ./

RUN npm install --production

# Bundle app source
COPY . .

# Your app binds to port 3000 by default (or process.env.PORT)
EXPOSE 3000

# Start the server
CMD [ "npm", "start" ]
