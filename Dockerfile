FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8080 DATA_DIR=/app/data
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY src ./src
COPY public ./public
RUN mkdir -p /app/data && chown -R node:node /app
USER node
EXPOSE 8080
HEALTHCHECK --interval=60s --timeout=5s --start-period=30s CMD node -e "fetch('http://127.0.0.1:8080/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/server.js"]
