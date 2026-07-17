FROM node:24-alpine

WORKDIR /opt/app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . ./
RUN chown -R node:node /opt/app

USER node

EXPOSE 1337

CMD ["npm", "run", "develop"]
