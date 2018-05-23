FROM gcr.io/asylo-framework/asylo:latest

WORKDIR /arcs
ADD . /arcs

EXPOSE 80

# install nvm, then use that to install node & npm
RUN apt-get install -y curl
RUN curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash
RUN ls -al /root/
RUN ["/bin/bash", "-c", "source /root/.bashrc; nvm install 9.2.0"]
#RUN npm install -g npm@6.0.1

CMD ["/bin/bash", "-c", "source /root/.bashrc; npm start"]
