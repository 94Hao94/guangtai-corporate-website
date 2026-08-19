FROM node:22-alpine

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=5180

WORKDIR /app

COPY --chown=node:node server.mjs ./server.mjs
COPY --chown=node:node lib/ ./lib/

USER node

EXPOSE 5180

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5180/healthz').then((response)=>{if(!response.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server.mjs"]
