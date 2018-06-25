# Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
# This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
# The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
# The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
# Code distributed by Google as part of the polymer project is also
# subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt

#################################################################
# Toolchain
# Build on top of couchdb to include the Asylo SGX toolchain.
# This takes a looong time so it's isolated in the base image.
#################################################################
FROM couchdb:latest AS toolchain

# Add packages to build the Asylo SGX toolchain
RUN apt-get update && \
	apt-get install -y \
		bison \
		build-essential \
		flex \
		libisl-dev \
		libmpc-dev \
		libmpfr-dev \
		rsync \
		texinfo \
		wget \
		zlib1g-dev

# Note that the Asylo version is also specified in WORKSPACE
ENV ASYLO_VERSION=0.2.1
RUN wget https://github.com/google/asylo/archive/v${ASYLO_VERSION}.tar.gz && \
	gzip -cd v${ASYLO_VERSION}.tar.gz | tar xvf - && \
	mkdir -p /opt/asylo && \	
	mv asylo-${ASYLO_VERSION}/asylo/distrib /opt/asylo/

# Build and install the toolchain.
RUN /opt/asylo/distrib/sgx_x86_64/install-toolchain \
	--system \
	--prefix /opt/asylo/toolchains/sgx_x86_64


#################################################################
# Base
# Copy out the built toolchain, and iterate on (again) the
# standard couchdb image to include packages necessary to build
# against Asylo.
#################################################################
FROM couchdb:latest AS base

COPY --from=toolchain /opt/asylo/toolchains/ /opt/asylo/toolchains/
COPY --from=toolchain /usr/local/share/asylo/ /usr/local/share/asylo/

# Couch is (currently) based on Debian jessie, so we need to do some work to
# bring that into the future.
# - installing a new OCaml (something, probably Asylo, requires 4.02
#   instead of jessie's 4.01).
# - install GCC-5 (minimum required by Asylo)
# To get this to work, I had to add a `dist-upgrade` line. This ends up
# upgrading the OS from Jessie to Buster/Sid (?), including installing GCC-7.
# The explicit install and use of GCC-5 may not be required.
# TODO - try removing the GCC-5 install. Or, try moving `dist-upgrade` earlier
# (into it's own build stage?) so it runs faster, or try rebasing Couch's
# Dockerfile on a Debian Buster image.
RUN apt-get update && \
	apt-get install -y curl gnupg && \
	echo "deb [arch=amd64] http://storage.googleapis.com/bazel-apt stable jdk1.8" | \
		tee /etc/apt/sources.list.d/bazel.list && \
	curl https://bazel.build/bazel-release.pub.gpg | apt-key add - && \
	echo "deb http://ftp.debian.org/debian jessie-backports main" | \
		tee /etc/apt/sources.list.d/jessie-backports.list && \
	apt-get update && \
	apt-get -y upgrade && \
	apt-get install -y -t jessie-backports openjdk-8-jre-headless ca-certificates-java && \
	apt-get install -y \
		bazel \
		build-essential \
		cryptsetup-bin \
		m4 \
		ocaml-nox \
		opam \
		python-jinja2 && \
	echo "deb http://ftp.us.debian.org/debian unstable main contrib non-free" > \
		/etc/apt/sources.list.d/unstable.list && \
	apt-get update && \
	apt-get install -y gcc-5 g++-5 && \
	apt-get dist-upgrade -y && \
	echo export CC=/usr/bin/gcc-5 >> ~/.bashrc && \
	opam init -a --comp 4.02.3 && \
	echo 'eval `opam config env`' >> ~/.bashrc


# TODO split db & Asylo & node each into their own image;
# and use compose to orchestrate those with the arcs server
# https://docs.docker.com/compose/install

###########################
###### should this be in it's own container? Probably with the WORKDIR arcs from above?
#####
###### install nvm, then use that to install node & npm
#####EXPOSE 80
#####RUN curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash
#####RUN ls -al /root/
#####RUN ["/bin/bash", "-c", "source /root/.bashrc; nvm install 9.2.0"]
######RUN npm install -g npm@6.0.1
#####
#####CMD ["/bin/bash", "-c", "source /root/.bashrc; npm start"]

FROM base


ADD asylo /arcs/asylo

CMD ["/opt/storage/bin/start-couchdb.sh"]
