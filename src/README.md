# Source Folder

This folder contains source code used to run the X5GON platform, preprocessing 
pipeline and the recommendation engine. The folder structure is as follows:

| folder name | description |
| ----------- | ----------- | 
| `config`    | This folder contains the configurations that are common to all of the components. Since this data is private                  the folder needs to be created by the developer and populated with the configuration files. Examples of the                   configurations are found bellow.|
| `lib`       | The folder containing modules common to all of the components. |
| `load`      | Scripts used to load data into databases are located here. |
| `server`    | The folder containing the source code for the platform, preprocessing pipeline and recommendation engine. |
| `test`      | Test scripts for ensuring stable code. |


## Config Folder

The `config` folder needs to be created by the developer. It contains private 
and vulnerable data such as tokens, usernames and passwords to access databases 
and make API calls. To ensure this data is not leaked, we added all configuration 
folders to the `.gitignore` file and present how the configuration files should 
look like.

### Postgres Configuration

The database used for storing user activity and OER material data is PostgresQL. 
To initialize a connection to the local database the developer needs to install
and initialize the database on his or her machine and create a file `/config/psconfig.js`
containing the following lines:

```javascript
module.exports = {
    user: 'username',
    database: 'x5gon',
    password: 'password',
    host: 'localhost',
    port: 5432,
    max: 10,
    idleTimeoutMillis: 30000
};
```

Then, create a database named `x5gon`. To create the required tables run

```bash
node ./load/create-postgres-tables.js
```

This will create the required tables and the components will be ready to connect.