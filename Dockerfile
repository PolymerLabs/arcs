FROM gcr.io/asylo-framework/asylo:latest

WORKDIR /arcs
ADD . /arcs

RUN apt-get install -y curl

# TODO split db & Asylo & node each into their own image;
# and use compose to orchestrate those with the arcs server
# https://docs.docker.com/compose/install

# encrypt fs
# https://launchbylunch.com/posts/2014/Jan/13/encrypting-docker-on-digitalocean/

# Attempt at CouchDB
# # TODO Couch stored on an encrypted filesystem, using a key from Asylo
# RUN echo "deb https://apache.bintray.com/couchdb-deb stretch main" \
#     | tee -a /etc/apt/sources.list
# RUN curl -L https://couchdb.apache.org/repo/bintray-pubkey.asc \
#     | apt-key add -
# RUN apt-get update && apt-get install -y couchdb

# # Cassandra
# RUN echo "deb http://www.apache.org/dist/cassandra/debian 311x main" | \
# 	tee -a /etc/apt/sources.list.d/cassandra.sources.list
# RUN curl https://www.apache.org/dist/cassandra/KEYS | apt-key add -
# RUN apt-get update && apt-get install -y cassandra

# put Cassandra on it's own filesystem

# install nvm, then use that to install node & npm
EXPOSE 80
RUN curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash
RUN ls -al /root/
RUN ["/bin/bash", "-c", "source /root/.bashrc; nvm install 9.2.0"]
#RUN npm install -g npm@6.0.1

CMD ["/bin/bash", "-c", "source /root/.bashrc; npm start"]
