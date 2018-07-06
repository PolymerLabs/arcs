# Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
# This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
# The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
# The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
# Code distributed by Google as part of the polymer project is also
# subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt

###################################################################
### Toolchain
### Build on top of couchdb to include the Asylo SGX toolchain.
###################################################################

FROM couchdb:latest AS toolchain


##
### Commented out is an alternate approach, to combine both our Ayslo-enclaved
### code and Couch into a single image. This is eventually probably the correct
### approach, but I ran into several problems (I believe mostly related to
### different Debian versions) that made this cumbersome.
##
### To try this approach again, remove the `##` prefix from these lines and
### the asylo-specific `docker run` from `start-couch.sh`.
##
##
### Couch is based off an old version of Debian, so let's upgrade to Buster
### (what's currently used in Asylo's default image).
##RUN \
##	sed -i 's/jessie/stretch/g' /etc/apt/sources.list && \
##	apt-get update && \
##	apt-get -y upgrade && \
##	apt-get -y dist-upgrade && \
##	apt-get -y autoremove
##
##RUN \
##	apt-get update && \
##	apt-get install -y \
##		curl \
##		gnupg && \
##	echo "deb [arch=amd64] http://storage.googleapis.com/bazel-apt stable jdk1.8" | \
##		tee /etc/apt/sources.list.d/bazel.list && \
##	curl https://bazel.build/bazel-release.pub.gpg | apt-key add - && \
##	apt-get update && \
##	apt-get -y upgrade
##
##RUN apt-get update && \
##	apt-get install -y \
##		bazel \
##		bison \
##		build-essential \
##		ca-certificates-java \
##		cryptsetup-bin \
##		flex \
##		libisl-dev \
##		libmpc-dev \
##		libmpfr-dev \
##		m4 \
##		ocaml-nox \
##		opam \
##		openjdk-8-jre-headless \
##		python-jinja2 \
##		rsync \
##		texinfo \
##		wget \
##		zlib1g-dev
###ocamlbuild \
##
### Note that the Asylo version is also specified in WORKSPACE
##ENV ASYLO_VERSION=0.2.1
##RUN wget https://github.com/google/asylo/archive/v${ASYLO_VERSION}.tar.gz && \
##	gzip -cd v${ASYLO_VERSION}.tar.gz | tar xvf - && \
##	mkdir -p /opt/asylo && \	
##	mv asylo-${ASYLO_VERSION}/asylo/distrib /opt/asylo/
##
### Build and install the toolchain.
##RUN /opt/asylo/distrib/sgx_x86_64/install-toolchain \
##	--system \
##	--prefix /opt/asylo/toolchains/sgx_x86_64
##
### In Asylo's default, they pause here to copy out just the built artifacts
### into a new image. I've dispensed with that because I ran into issues keeping
### library versions in sync between those two images and I'm not concerned with
### container size yet.
### Future optimizations could bring that back, remove the sources, or perhaps
### Couch will upgrade their internal version.

RUN apt-get update && \
	apt-get install -y \
		cryptsetup-bin

CMD ["/arcs/enclave/bin/start-couchdb.sh"]

ADD . /arcs/enclave
