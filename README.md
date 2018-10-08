# X5GON

[![Build Status](https://travis-ci.com/JozefStefanInstitute/x5gon.svg?branch=master)](https://travis-ci.com/JozefStefanInstitute/x5gon)

## Cross Modal, Cross Cultural, Cross Lingual, Cross Domain, and Cross Site Global OER Network

The X5GON project stands for easily implemented freely available innovative technology elements that
will converge currently scattered Open Educational Resources (OER) available in various modalities
across Europe and the globe.

This repository contains the technology that will realize the vision set within the X5GON project.
All of the source code is found in the `src` folder. The folder is structured such that files with
similar roles or functionalities are found in subfolders making it easier to navigate through the
project.

## Prerequisites

- node.js v6.0 and npm 5.3 or higher

    To test that your node.js version is correct, run `node --version` and `npm --version`.

- postgres 9.6 or higher


## Install

To install the project run

```bash
npm install
```

## Run Components
Before you run any of the components you must first create an `.env` file containing the process
environments. For more detail see [src/config/README.md](./src/config/README.md).

### Platform Component

To start the platform run the following command:

```bash
npm run start:platform
```

To run the platform in debug mode:

```bash
npm run start:platformInspect
```

The source code of the platform component is found in [src/server/platform](./src/server/platform).

### Recommender Engine Component

To start the recommender engine component run the following command:

```bash
npm run start:recsys
```

To run the recommender engine in debug mode:

```bash
npm run start:recsysInspect
```

The source code of the platform component is found in [src/server/recsys](./src/server/recsys).
