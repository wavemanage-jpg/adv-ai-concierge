FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund \
  && npm cache clean --force
COPY server.mjs knowledge.json ./
COPY lib ./lib
COPY public ./public
USER node
ENV NODE_ENV=production PORT=8080 HOST=0.0.0.0
EXPOSE 8080
CMD ["node", "server.mjs"]
