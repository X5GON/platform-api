# go to project base
cd ..

###########################################################
# Cleanup all of the processes
###########################################################

# install all node packages
npm install

###########################################################
# Reload docker containers
###########################################################

# reload the docker container (with persistent data)
cd docker/
sh run-docker.sh
cd ..

###########################################################
# Prepare submodule components
###########################################################

# prepare the search engine
cd ./search
npm install
npm run build
cd ../

# prepare the processing pipeline
cd ./preproc
npm install
npm run build
cd ../
