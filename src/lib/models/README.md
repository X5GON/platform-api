# Models

This folder contains models that are used for the purpose of creating a recommendation engine.

## Nearest Neighbour Model
The `nearest-neighbour.js` file contains the QMiner Nearest Neighbour implementation class and it's corresponding methods. To create an instance of the model we must provide a JavaScript Object containing the following attributes:

| Attribute   | Optional | Description | 
| ---------   | -------- | ----------- |
| `mode`      |          | The model creation mode. Possible options are `create` and `load` |
| `base`      |          | The QMiner base containing all of the data |
| `modelPath` |          | The path to the model file or where the model is saved |
| `store`     | Yes      | The QMiner store containing the records of interest. Required when `mode=create` |
| `features`  | Yes      | Array of QMiner features used in feature space creation. Required when `mode=create` |

## User Model

The `user-model.js` file contains the implementation of the User Model and its corresponding methods. To create an instance of the model we must provide a JavaScript Object containing the following attributes:

| Attribute | Optional | Description | 
| --------- | -------- | ----------- |
| `userId`  |          | The user id - given by the X5GON user tracking library |
| `users`   |          | The QMiner store containing all of the users and user information |
