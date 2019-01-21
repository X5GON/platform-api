# Configuration

This folder contains the configuration files.

## Environment Variables

To avoid storing vulnerable data in the repository (such as authentication tokens
and secrets) we have adopted the `.env` approach to feed the vulnerable data to
different components of the platform.

This approach requires the `dotenv` module (which is installed by running the
`npm install` command) and an `.env` file saved in this folder. One must create the
`.env` file by hand since it is ignored in the project.

### .env
What follows is an example of the `.env` file. To get the right tokens contact
one of the developers contributing to this project.


```bash
#######################################
### Production variables
#######################################

######################################
# Platform

# platform session secret
PROD_PLATFORM_SESSION_SECRET=platform-session-key

# monitor session secret
PROD_MONITOR_SESSION_SECRET=monitor-session-key
# monitor admin token - used to access the monitor
PROD_MONITOR_ADMIN_TOKEN=admin-token

# postgres database password
PROD_PG_PASSWORD=postgres-password

# postgres database options
PROD_PG_SCHEMA=postgres-database-schema(optional)
PROD_PG_VERSION=postgres-database-version(optional)


#######################################
### Development variables
#######################################

# platform session secret
DEV_PLATFORM_SESSION_SECRET=platform-session-key

# monitor session secret
DEV_MONITOR_SESSION_SECRET=monitor-session-key
# monitor admin token - used to access the monitor
DEV_MONITOR_ADMIN_TOKEN=admin-token

# postgres database password
DEV_PG_PASSWORD=postgres-password

# postgres database options
DEV_PG_SCHEMA=postgres-database-schema(optional)
DEV_PG_VERSION=postgres-database-version(optional)

#######################################
### Test variables
#######################################

# platform session secret
TEST_PLATFORM_SESSION_SECRET=platform-session-key

# monitor session secret
TEST_MONITOR_SESSION_SECRET=monitor-session-key
# monitor admin token - used to access the monitor
TEST_MONITOR_ADMIN_TOKEN=admin-token

# postgres database password
TEST_PG_PASSWORD=postgres-password

# postgres database options
TEST_PG_SCHEMA=postgres-database-schema(optional)
TEST_PG_VERSION=postgres-database-version(optional)


######################################
# Common variables
######################################

# Google Recaptcha
GOOGLE_RECAPTCHA_SITEKEY=platform-google-recaptcha-sitekey
GOOGLE_RECAPTCHA_SECRET=platform-google-recaptcha-secret

# videolectures api key - for data retrieval
RETRIEVERS_VL_APIKEY=videolectures-apikey

# wikifier url and userkey - required for concept extraction
PREPROC_WIKIFIER_URL=http://www.wikifier.org
PREPROC_WIKIFIER_USERKEY=wikifier-userkey

# UPV MLLP-TTP
PREPROC_TTP_USER=ttp-user
PREPROC_TTP_TOKEN=ttp-token

```

