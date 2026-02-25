# ----------------------------------------------------------------
# Stage 1: Build the Next.js application
# ----------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# 1. Declare the build argument
ARG DATABASE_URL
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY 
# 2. Set the argument as an environment variable for the builder stage
ENV DATABASE_URL=$DATABASE_URL
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY


COPY prisma ./prisma

COPY package.json package-lock.json ./
RUN npm install
# -------------------------------------------------------------

# Copy the rest of the application code
COPY . .

# Generate Prisma Client (explicit run, if postinstall didn't fully cover it)
RUN npx prisma generate

# Build the Next.js application (This will now succeed)
# Use the 'build' script defined in your package.json
RUN npx next build --no-lint 


# ----------------------------------------------------------------
# Stage 2: Create the final, lean production image
# ----------------------------------------------------------------
FROM node:20-alpine AS runner

ARG DATABASE_URL
ARG DATABASE_URL_UNPOOLED

ENV DATABASE_URL=$DATABASE_URL
ENV DATABASE_URL_UNPOOLED=$DATABASE_URL_UNPOOLED

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Set working directory
WORKDIR /app

# 1. Copy essential runtime files
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# 2. Copy the Prisma schema first (CRITICAL FIX FOR RUNNER)
# This must happen BEFORE npm install runs the postinstall script (prisma generate).
COPY --from=builder /app/prisma ./prisma

# 3. Install production dependencies only (This will now succeed)
RUN npm install --omit=dev

# 4. Copy the Next.js build output
COPY --from=builder /app/.next ./.next

# 5. Copy the entrypoint script
COPY ./docker-entrypoint.sh /usr/local/bin/

# Make the script executable
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose the application port
EXPOSE 3000

# Use the custom entrypoint script
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]