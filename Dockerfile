FROM oven/bun:latest

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --production

# Copy source code
COPY src ./src
COPY db ./db

# Expose port
EXPOSE 3000

# Start the application
CMD ["bun", "run", "src/backend/index.ts"]
