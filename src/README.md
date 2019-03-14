# Source Folder

This folder contains source code used to run the X5GON platform, preprocessing
pipeline and the recommendation engine. The folder structure is as follows:

| folder name | description |
| ----------- | ----------- |
| `config`    | This folder contains the configurations that are common to all of the components. Since this data is private the folder needs to be created by the developer and populated with the configuration files. Examples of the configurations are found bellow.|
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

Check this [readme](./config/README.md) to find what is required from the
developer to create.
