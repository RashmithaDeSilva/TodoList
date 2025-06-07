# Use secure and small base image
FROM nginx:stable-alpine3.21-perl

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom config and app files
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY dist/Todo/browser /usr/share/nginx/html

# Lock file permissions: root-owned, read-only to all
RUN chmod -R 755 /usr/share/nginx/html && \
    chmod -R 644 /etc/nginx/conf.d/default.conf

# Create writable NGINX directories
RUN mkdir -p /var/cache/nginx /var/run && \
    chmod -R 755 /var/cache/nginx /var/run

# Expose port
EXPOSE 80

# Run as root (default)
CMD ["nginx", "-g", "daemon off;"]
