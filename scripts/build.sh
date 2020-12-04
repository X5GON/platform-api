# go to project base
cd ..

###########################################################
# Cleanup all of the processes
###########################################################

# install all node packages
npm install

###########################################################
# Prepare submodule components
###########################################################

# prepare the search engine
cd ./search
npm install
npm run build
cd ../

# prepare the processing pipeline
cd ./platform/frontend
npm install
npm run build
cd ../../
