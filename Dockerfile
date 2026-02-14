# ── Build Stage ──
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first (cache layer)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source code
COPY . .

# Build args for Vite environment variables
ARG VITE_API_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Set env vars for Vite build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Build both dashboard and widget
RUN npm run build:all

# ── Serve Stage ──
FROM nginx:alpine

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built dashboard files
COPY --from=build /app/dist/dashboard /usr/share/nginx/html/bug-reporter

# Copy built widget file
COPY --from=build /app/dist/widget/widget.iife.js /usr/share/nginx/html/bug-reporter/widget.js

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
