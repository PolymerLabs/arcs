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
###### should this be in it's own container?
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
