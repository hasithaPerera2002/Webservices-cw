FROM node:18

WORKDIR /app

# Copy package.json and package-lock.json to /app
COPY middleware/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to /app
COPY middleware ./

EXPOSE 3000

CMD ["npm", "start"]
