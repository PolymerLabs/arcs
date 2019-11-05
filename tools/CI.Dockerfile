FROM timbru31/java-node:11-alpine

# Install Bazel
#  Reference: https://github.com/davido/bazel-alpine-package)
ADD https://raw.githubusercontent.com/davido/bazel-alpine-package/master/david@ostrovsky.org-5a0369d6.rsa.pub \
    /etc/apk/keys/david@ostrovsky.org-5a0369d6.rsa.pub
ADD https://github.com/davido/bazel-alpine-package/releases/download/0.26.1/bazel-0.26.1-r0.apk \
    /tmp/bazel-0.26.1-r0.apk
RUN apk add /tmp/bazel-0.26.1-r0.apk

# Set up workspace
RUN mkdir -p /usr/src/app
ENV WORKSPACE /usr/src/app
WORKDIR /usr/src/app


# Install programs for runtime use (e.g. by Bazel, Node-GYP)
RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh python g++ make

# Install Project
COPY package.json /usr/src/app/package.json
RUN npm install

# Copy over Arcs project
COPY . .