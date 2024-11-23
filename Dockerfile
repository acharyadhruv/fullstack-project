# Use the official Node.js 18 image as the base image
FROM node:18

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Expose the application port (default: 3000)
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Define the command to run the application
CMD ["node", "app.js"]
