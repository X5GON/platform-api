# Configuration

This folder contains the configuration files.

## Environment Variables

To avoid storing vulnerable data in the repository, such as authentication tokens
and secrets, we have adopted the `.env` approach to feed the vulnerable data to
different components of the platform.

This approach requires the `dotenv` module (which is installed by running the
`npm install` command) and a `.env` file saved in this folder. One must create the
`.env` file by hand since it is added in `.gitignore`.

### .env
What follows is an example of the `.env` content. To get the right tokens contact
one of the fellow developers contributing to this project.

```bash
#######################################
### Production variables
#######################################

######################################
# Platform

# session secret
PROD_PLATFORM_SESSION_SECRET=platform-session-key

# google recaptcha site key and secret - used for OER application form
PROD_PLATFORM_GOOGLE_RECAPTCHA_SITEKEY=platform-google-recaptcha-sitekey
PROD_PLATFORM_GOOGLE_RECAPTCHA_SECRET=platform-google-recaptcha-secret

######################################
# Preprocessing

# videolectures api key - for data retrieval
PROD_PREPROC_RETRIEVERS_VL_APIKEY=videolectures-apikey

# wikifier url and userkey - required for concept extraction
PROD_PREPROC_WIKIFIER_URL=http://www.wikifier.org
PROD_PREPROC_WIKIFIER_USERKEY=wikifier-userkey

######################################
# Monitor

# session secret
PROD_MONITOR_SESSION_SECRET=monitor-session-key

# admin token - used to access the monitor
PROD_MONITOR_ADMIN_TOKEN=admin-token

######################################
# PostgresQL

## postgres database password
PROD_PG_PASSWORD=postgres-password

## postgres database options
PROD_PG_SCHEMA=postgres-database-schema(optional)
PROD_PG_VERSION=postgres-database-version(optional)


#######################################
### Development variables
#######################################

######################################
# Platform

# session secret
DEV_PLATFORM_SESSION_SECRET=platform-session-key

DEV_PLATFORM_GOOGLE_RECAPTCHA_SITEKEY=platform-google-recaptcha-sitekey
DEV_PLATFORM_GOOGLE_RECAPTCHA_SECRET=platform-google-recaptcha-secret

######################################
# Preprocessing
DEV_PREPROC_RETRIEVERS_VL_APIKEY=videolectures-apikey

DEV_PREPROC_WIKIFIER_URL=http://www.wikifier.org
DEV_PREPROC_WIKIFIER_USERKEY=wikifier-userkey

######################################
# Monitor
DEV_MONITOR_SESSION_SECRET=monitor-session-key
DEV_MONITOR_ADMIN_TOKEN=admin-token

######################################
# PostgresQL

## postgres database password
DEV_PG_PASSWORD=postgres-password

## postgres database options
DEV_PG_SCHEMA=postgres-database-schema(optional)
DEV_PG_VERSION=postgres-database-version(optional)

#######################################
### Test variables
#######################################

######################################
# Platform

# session secret
TEST_PLATFORM_SESSION_SECRET=platform-session-key

TEST_PLATFORM_GOOGLE_RECAPTCHA_SITEKEY=platform-google-recaptcha-sitekey
TEST_PLATFORM_GOOGLE_RECAPTCHA_SECRET=platform-google-recaptcha-secret

######################################
# Preprocessing
TEST_PREPROC_RETRIEVERS_VL_APIKEY=videolectures-apikey

TEST_PREPROC_WIKIFIER_URL=http://www.wikifier.org
TEST_PREPROC_WIKIFIER_USERKEY=wikifier-userkey

######################################
# Monitor
TEST_MONITOR_SESSION_SECRET=monitor-session-key
TEST_MONITOR_ADMIN_TOKEN=admin-token

######################################
# PostgresQL

## postgres database password
TEST_PG_PASSWORD=postgres-password

## postgres database options
TEST_PG_SCHEMA=postgres-database-schema(optional)
TEST_PG_VERSION=postgres-database-version(optional)
```

