FROM node:14

# Create app directory
WORKDIR /usr/src/app


# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json /usr/src/app/
COPY cert.pem /usr/src/app/
COPY privkey.pem /usr/src/app/
CoPY chain.pem /usr/src/app/

WORKDIR /usr/src/app/views
CoPY index.vash /usr/src/app/views

WORKDIR /usr/src/app

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY server.js ./

EXPOSE 3000:3000

CMD [ "npm", "start" ]
