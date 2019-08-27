# Docker
This folder contains the configuration file for running docker images - more precisely the [docker-kafka](https://wurstmeister.github.io/kafka-docker/).

## Preliminaries
docker v18 or higher, docker-compose v1.23 or higher

## Running docker 

To initialize KAFKA using docker execute the following command
```bash
sudo IP="machine-network-id" docker-compose up -d
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
sudo docker-compose down -d
```



## docker-compose.yml
The docker-compose file contains the configurations for running the kafka service. It initializes two services - kafka and zookeeper. The configuration enables connecting the platfrom with the kafka service.

```docker
version: '2'
services:
  zookeeper:
    image: wurstmeister/zookeeper
    ports:
      - "2181:2181"
  kafka:
    image: wurstmeister/kafka
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_ADVERTISED_HOST_NAME: ${IP}
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_CREATE_TOPICS_SEPARATOR: "$$'\n'"
      KAFKA_CREATE_TOPICS: |
        PROCESSING.MATERIAL.VIDEO:3:1
        PROCESSING.MATERIAL.TEXT:5:1
        STORING.MATERIAL.COMPLETE:5:1
        STORING.MATERIAL.PARTIAL:3:1
        STORING.RECSYS.TRANSITIONS:3:1
        STORING.RECSYS.SELECTIONS:3:1
        STORING.USERACTIVITY.VISIT:3:1
        STORING.USERACTIVITY.VIDEO:3:1
        STORING.PROVIDERS:2:1
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```