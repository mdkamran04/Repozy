# ----------------------------------------------------------------
# Stage 1: Build the Next.js application
# ----------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy lock files and install dependencies
# This step is crucial for Docker layer caching optimization
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Generate Prisma Client
# This must happen before the 'next build'
RUN npx prisma generate

# Build the Next.js application
# Use the 'build' script defined in your package.json
RUN npm run build

# ----------------------------------------------------------------
# Stage 2: Create the final, lean production image
# ----------------------------------------------------------------
FROM node:20-alpine AS runner

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Set working directory
WORKDIR /app

# The Next.js standalone output feature is great for minimal images,
# but since you're using 'npm start', we'll stick to a standard copy:

# 1. Copy essential runtime files
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# 2. Install production dependencies only (often smaller)
# This uses the package.json from the 'builder' stage, but installs fresh
# production-only node_modules to ensure no dev dependencies are present.
RUN npm install --omit=dev

# 3. Copy the Next.js build output
COPY --from=builder /app/.next ./.next

# 4. Copy the Prisma schema, required for deployment migrations
COPY --from=builder /app/prisma ./prisma

# 5. Copy the entrypoint script
COPY ./docker-entrypoint.sh /usr/local/bin/

# Make the script executable
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose the application port
EXPOSE 3000

# Use the custom entrypoint script
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]