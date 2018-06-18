# Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
# This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
# The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
# The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
# Code distributed by Google as part of the polymer project is also
# subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt

FROM couchdb:latest

#TODO it's not clear that this image needs all of arcs; just arcs/asylo might be enough
#WORKDIR /arcs
#ADD . /arcs

RUN apt-get update
RUN apt-get -y upgrade
RUN apt-get install -y curl cryptsetup-bin

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

CMD ["/opt/storage/bin/start-couchdb.sh"]
