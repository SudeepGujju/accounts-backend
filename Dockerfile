FROM node:fermium as express-server

WORKDIR /usr/share/backend/

COPY package.json package-lock.json ./

RUN npm install

COPY . .

# CMD [ "npm", "run", "start:prod" ]

CMD npm run start:prod