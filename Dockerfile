FROM node:10

# Create app directory
WORKDIR /usr/src/app

# copy output
COPY . .

# Install npm packages
# TODO use --only=production flag
#
RUN npm install

RUN ./tools/sigh && npm run build:rollup

WORKDIR /usr/src/app/server
RUN npm install
RUN npm test

EXPOSE 8080
CMD [ "npm", "start" ]
