# Engine

This folder contains models and core components for development of the Recommendation Engine. 
The folder structure is as follows:

- `models` folder contains the models used for Recommendation Engine development
- `x5recommend` file contains the core Recommendation Engine code 

## x5recommend Module

This file is contains the Recommendation Engine module which is used to recommend OER material based
on the materials the user has viewed. It is implemented in a way where we can push real-time user activity 
data and update the recommendation models, load and create the models as well as recommend the material
based on the user input. 

When initializing the module the following attributes need to be present in the input JavaScript object:

| Attribute | Optional | Description |
| --------- | -------- | ----------- |
| `mode`    |          | The database creation mode. Possible options are `create`, `open` and `readOnly` |
| `path`    |          | The path where the database is/will be stored |