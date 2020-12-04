# X5GON Platform API

![Node][programming-language]
![Node.js CI][github-action]
[![Linux Build][linux-build]][linux-build-status]
[![OSX Build][osx-build]][osx-build-status]
[![License][license]][license-link]


The X5GON project stands for easily implemented freely available innovative technology elements that
will converge currently scattered Open Educational Resources (OER) available in various modalities
across Europe and the globe.

![preprocessing pipeline](readme/platform.png)

This project contains the code base used to setup the main component that connects different services
together. The project contains various services:

- **Platform API.** Contains the Platform API and redirections to other microservices. 
  The code is found in the [platform](./platform) folder. In addition, the platform service
  also serves the frontend, which can be found in `./platform/frontend` folder. The frontend is 
  a submodule whose code base is found [here](https://github.com/X5GON/platform-ui/tree/master).
  
- **Recommender Engine.** Contains the code for providing recommendations. The code is found
  in the [recsys](./recsys) folder.
  
- **Search API.** The Search API is included as a submodule. The code will be stored in the 
  [search](./search) folder, but The whole documentation and code of the service is found 
  [here](https://github.com/X5GON/search-api).
  
A component that is not included within this repository is the
[X5GON Processing Pipelines](https://github.com/X5GON/processing-pipeline-api). The code
is separated so that the data processing part can be done on another machine. The communication between
the Platform and Processing Pipelines is done through the Apache Kafka, which is part of the 
Processing Pipeline code base.


## Prerequisites

- A running Elasticsearch service (one can download and install it from [here][elasticsearch-download] 
  or use a [docker image][elasticsearch-docker]). **NOTE:** Required for the Search API
- PostgreSQL version 10 or greater
- NodeJS version 10 or greater

  To test that your nodejs version is correct, run `node --version` in the command line.

## Installation

- Have a running PostgreSQL database and Elasticsearch service

- Make a clone of this repository

  ```bash
  git clone https://github.com/X5GON/platform-api.git
  # navigate into the project
  cd platform-api
  ```

- Recursively download all submodules (i.e. the `search` and `frontend`).
  ```bash
  git submodule update --init
  ```

- Create an `.env` file in the [/env](./env) folder (see [instructions](./env)).

- Install the nodejs dependencies and prepare submodule dependencies:
  
  ```bash
  npm run build
  ```
  
- Configure submodule dependencies:

  - **Search API.** Follow the [instructions](https://github.com/X5GON/search-api).
  - **Processing API.** Follow the [instructions](https://github.com/X5GON/processing-pipeline-api).

- Create the `x5gon` database where all of the data is going to be stored:

  ```bash
  # switch to the postgres user and create the 'x5gon' database
  sudo su postgres && createdb x5gon && exit
  # create the tables in the database
  npm run postgres:create
  ```

- Create the recommendation models:

  ```bash
  npm run recsys:create  
  ```

## Running the Services

The easiest way to run the services is with [PM2](https://pm2.keymetrics.io/). This will run them 
in the background, will automatically restart if the services crash and is fully configurable through the 
[./ecosystem.config.services.yml](./ecosystem.config.services.yml) file.

To install PM2 one must run

```bash
# global install PM2
npm install -g pm2
```

To run the service using PM2 one must simply run the following command:

```bash
pm2 start ecosystem.config.services.yml --env production
```
   
This will also run the pipelines in the background. To control the pm2 services please see
their [documentation](https://pm2.keymetrics.io/docs/usage/quick-start/).


[programming-language]: https://img.shields.io/badge/node-%3E%3D%2010.0.0-green.svg
[github-action]: https://github.com/X5GON/platform-api/workflows/Node.js%20CI/badge.svg
[linux-build]: https://img.shields.io/travis/X5GON/platform-api/master.svg?label=linux
[linux-build-status]: https://travis-ci.com/X5GON/platform-api
[osx-build]: https://img.shields.io/travis/X5GON/platform-api/master.svg?label=mac
[osx-build-status]: https://travis-ci.com/X5GON/platform-api
[license]: https://img.shields.io/badge/License-BSD%202--Clause-green.svg
[license-link]: https://opensource.org/licenses/BSD-2-Clause

[elasticsearch]: https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html
[elasticsearch-download]: https://www.elastic.co/downloads/elasticsearch
[elasticsearch-docker]: https://hub.docker.com/_/elasticsearch
