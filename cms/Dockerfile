FROM node:24-alpine

WORKDIR /opt/app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . ./
RUN npm run build
RUN chown -R node:node /opt/app

USER node

EXPOSE 1337

CMD ["npm", "run", "start"]
