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
# Mostly, Asylo needs a more modern GCC (G++) and OCaml. To get this to work,
# though, I ended up adding an unstable Debian channel and running
# `dist-upgrade` which seems to upgrade from Jessie to Buster/Sid.
# This is working (yay!) but perhaps not production-level.
# TODO future options might be:
# - Fork Couch's Dockerfile, and base it on a newer stable Debian
# - Install Asylo & Couch on top of a newer Debian image (without using
#   Couch's Dockerfile)
# - Using something else instead of Couch (which may change this question
#   somewhat fundamentally)
RUN \
	apt-get update && \
	apt-get install -y \
		curl \
		gnupg && \
	echo "deb http://ftp.us.debian.org/debian unstable main contrib non-free" > \
		/etc/apt/sources.list.d/unstable.list && \
	echo "deb [arch=amd64] http://storage.googleapis.com/bazel-apt stable jdk1.8" | \
		tee /etc/apt/sources.list.d/bazel.list && \
	curl https://bazel.build/bazel-release.pub.gpg | apt-key add - && \
	apt-get update && \
	apt-get -y upgrade && \
	apt-get -y dist-upgrade && \
	apt-get -y install \
		bazel \
		build-essential \
		ca-certificates-java \
		cryptsetup-bin \
		m4 \
		ocamlbuild \
		ocaml-nox \
		opam \
		openjdk-8-jre-headless \
		python-jinja2


#################################################################
# Copy our code into the base image
#################################################################
FROM base

ADD . /arcs/asylo

CMD ["/opt/storage/bin/start-couchdb.sh"]
