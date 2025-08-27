# Use the standard, more compatible Node.js 18 image
FROM node:18

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies. bcrypt will compile correctly in this environment.
RUN npm install

# Bundle app source
COPY . .

# Your app binds to port 3001
EXPOSE 3001

# Define the command to run your app
CMD [ "npm", "start" ]
