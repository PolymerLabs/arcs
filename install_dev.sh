#!/usr/bin/env bash

# 1. Install nvm
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash

# 1.1 ensure nvm is in your current process
source ~/.nvm/nvm.sh

# 2. Install node
nvm install 10

# 3. Update npm to later version
npm install -g npm

# 4. Install node_modules
npm install


# 5. Build the project
./tools/sigh

