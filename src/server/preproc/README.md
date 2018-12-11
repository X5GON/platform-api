# Material Processing Pipeline Folder

This folder contains the code base for OER material processing pipeline. The
pipeline is created using qtopology which is a distributed stream processing layer.

**Disclaimer**: The pipeline is NOT yet finished. Feature/information extraction
methods are still missing as well as the components that handle Wikification and
DMoz classification. The latter will be added shortly while the information
extraction components are still pending.

The folder structure is as follows:

| folder name | description |
| ----------- | ----------- |
| `config`    | This folder contains the configurations that are used within the pre-processing pipeline. Since this data is private the folder needs to be created by the developer and populated with the configuration files. Examples of the configurations are found bellow.|

## Config Folder

The `config` folder needs to be created by the developer. It contains private
and vulnerable data such as tokens, usernames and passwords to access databases
and make API calls. To ensure this data is not leaked, we added all configuration
folders to the `.gitignore` file and present how the configuration files should
look like.

### Wikifier Configuration

To extract Wikipedia concepts from OER materials we will use Wikifier. For it to
work the developer will need to create a file `/config/wikiconfig.js`
containing the following lines:

```javascript
module.exports = {
    wikifierUrl: 'url-to-wikifier',
    userKey: 'generated-user-key'
};
```

## Prerequisites

### Apache Kafka and Docker

The material processing pipeline is dependent on Apache Kafka. One can install
an instance of Apache Kafka on their machine - what we prefer is to use a docker
container which includes Apache Kafka.

#### Running Docker on Linux

In the command line run the following commands. This will install and link Docker
to your account.

```bash
sudo apt-get update
sudo apt-get -y install docker.io
sudo ln -sf /usr/bin/docker.io /usr/local/bin/docker
```

Docker Hub contains a container called [spotify/kafka](https://hub.docker.com/r/spotify/kafka/)
which includes Apache Kafka. Running the following command should start a docker
container (in dettach mode `[-d]`). This is required before starting the pipeline.

```bash
sudo docker run -p 2181:2181 -p 9092:9092 -d --env ADVERTISED_HOST=localhost --env ADVERTISED_PORT=9092 --name kafka -h kafka spotify/kafka
```
