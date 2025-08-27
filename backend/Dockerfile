# Use the standard, more compatible Node.js 18 image
FROM node:18

# Suppress npm update notices
ENV NPM_CONFIG_UPDATE_NOTIFIER=false

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first for better Docker caching
COPY package*.json ./

# Install app dependencies. bcrypt will compile correctly in this environment.
RUN npm ci --only=production && npm cache clean --force

# Copy the rest of the application code
COPY . .

# Create a non-root user for security
RUN groupadd -g 1001 appuser && \
    useradd -r -u 1001 -g appuser appuser && \
    chown -R appuser:appuser /usr/src/app

# Switch to the non-root user
USER appuser

# Your app binds to port 3001
EXPOSE 3001

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Define the command to run your app
CMD [ "npm", "start" ]
