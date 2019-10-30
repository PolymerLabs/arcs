# Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
# This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
# The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
# The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
# Code distributed by Google as part of the polymer project is also
# subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt

FROM node:10

# Create app directory
WORKDIR /usr/src/app

# First copy over the just the package.json files
# so we can build a cached base image that only has node_modules
COPY package.json package-lock.json ./
COPY server/package.json server/package-lock.json server/
RUN npm install && npm --prefix=server install

# Copy Everything Else
COPY . .

# Build and test everything
RUN ./tools/sigh && npm run build:rollup
RUN npm --prefix=server test

EXPOSE 8080
CMD [ "npm", "--prefix=server", "start" ]
