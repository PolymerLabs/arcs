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

# This odd npm syntax solves a problem installing with an empty
# node_modules directory: See https://npm.community/t/518
RUN npm install --no-package-lock && npm install --package-lock-only

RUN npm test

EXPOSE 8080
CMD [ "npm", "start" ]
