FROM node:10

# Create app directory
WORKDIR /usr/src/app

# First copy over the just the package.json files
# so we can build a cached base image that only has node_modules
# use the 'npm ci' command to get reproducable builds
COPY package.json package-lock.json ./
COPY server/package.json server/package-lock.json server/
RUN npm ci && npm --prefix server ci 

# Copy Everything Else
COPY . .

# Build and test everything
RUN ./tools/sigh && npm run build:rollup
RUN npm --prefix server test

#RUN npm install --no-package-lock && npm install --package-lock-only

EXPOSE 8080
CMD [ "npm", "--prefix", "server", "start" ]
