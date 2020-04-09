# Docker
This folder contains the configuration file for running docker images - more precisely the [docker-kafka](https://wurstmeister.github.io/kafka-docker/).

## Preliminaries
- docker v18 or higher, docker-compose v1.23 or higher
- the `docker-compose.yml` file in this folder (see bellow for file schema)

## Running docker

To initialize KAFKA using docker execute the following command
```bash
sudo docker-compose up -d
```


To check if the kafka service has been successfully initialized, run the following command:
```bash
sudo docker ps
# should return something similar to this
CONTAINER ID  IMAGE                   COMMAND                    CREATED      STATUS      PORTS                                               NAMES
591cf7e8e0fb  wurstmeister/kafka      "start-kafka.sh"           2 hours ago  Up 2 hours  0.0.0.0:9092->9092/tcp                              docker_kafka_1
ef8613361a00  wurstmeister/zookeeper  "/bin/sh -c '/usr/sb...'"  2 hours ago  Up 2 hours  22/tcp, 2888/tcp, 3888/tcp, 0.0.0.0:2181->2181/tcp  docker_zookeeper_1
```

To stop KAFKA execute the following command
```bash
sudo docker-compose down
```

## Reloading docker containers
If there are changes done in the `docker-compose.yml` file one will need to reload the docker containers with the new configurations. To do this, execute:

```bash
sudo docker-compose down
sudo docker-compose up -d
```

To also check if there are new or updated docker images one will need to run a series of commands. These are all available in the `run-docker.sh` file and can be easily executed with:

```bash
sh run-docker.sh
```


## docker-compose.yml
The docker-compose file contains the configurations for running the kafka service. It initializes two services - kafka and zookeeper. The configuration enables connecting the platfrom with the kafka service. Create this file and insert the appropriate values in the `${parts}` of the file.

```docker
version: '3'
services:
  zookeeper:
    image: wurstmeister/zookeeper
    restart: always
    ports:
      - "2181:2181"
  kafka:
    image: wurstmeister/kafka
    restart: always
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_ADVERTISED_HOST_NAME: ${insert-machine-local-ip}
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'false'
      KAFKA_REPLICA_FETCH_MAX_BYTES: 15000000
      KAFKA_MESSAGE_MAX_BYTES: 20000000

      KAFKA_CREATE_TOPICS_SEPARATOR: "$$'\n'"
      KAFKA_CREATE_TOPICS: |
        PREPROC_MATERIAL_TEXT_INDEXING:5:1
        PREPROC_MATERIAL_TEXT_TRANSLATION:5:1
        PREPROC_MATERIAL_VIDEO_TRANSLATION:3:1
        UPDATE_MATERIAL_TEXT:5:1
        UPDATE_MATERIAL_VIDEO:4:1
        UPDATE_MATERIAL_CONTENT:2:1
        STORE_MATERIAL_CONTENT:2:1
        STORE_MATERIAL_COMPLETE:5:1
        STORE_MATERIAL_INCOMPLETE:3:1
        STORE_RECSYS_SELECTION:3:1
        STORE_USERACTIVITY_VISIT:3:1
        STORE_USERACTIVITY_VIDEO:3:1
        STORE_PROVIDER:2:1

    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ${path-to-the-external-kafka-folder-for-persistence}:/kafka
```