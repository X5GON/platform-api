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

# Platform
PROD_PLATFORM_SESSION_SECRET=platform-session-key

PROD_PLATFORM_GOOGLE_RECAPTCHA_SITEKEY=platform-google-recaptcha-sitekey
PROD_PLATFORM_GOOGLE_RECAPTCHA_SECRET=platform-google-recaptcha-secret

# Preprocessing
PROD_PREPROC_RETRIEVERS_VL_APIKEY=videolectures-apikey

PROD_PREPROC_WIKIFIER_URL=http://www.wikifier.org
PROD_PREPROC_WIKIFIER_USERKEY=wikifier-userkey

# Monitor
PROD_MONITOR_SESSION_SECRET=monitor-session-key
PROD_MONITOR_ADMIN_TOKEN=admin-token

# PostgresQL
PROD_PG_PASSWORD=postgres-password


#######################################
### Development variables
#######################################

# Platform
DEV_PLATFORM_SESSION_SECRET=platform-session-key

DEV_PLATFORM_GOOGLE_RECAPTCHA_SITEKEY=platform-google-recaptcha-sitekey
DEV_PLATFORM_GOOGLE_RECAPTCHA_SECRET=platform-google-recaptcha-secret

# Preprocessing
DEV_PREPROC_RETRIEVERS_VL_APIKEY=videolectures-apikey

DEV_PREPROC_WIKIFIER_URL=http://www.wikifier.org
DEV_PREPROC_WIKIFIER_USERKEY=wikifier-userkey

# Monitor
DEV_MONITOR_SESSION_SECRET=monitor-session-key
DEV_MONITOR_ADMIN_TOKEN=admin-token

# PostgresQL
DEV_PG_PASSWORD=postgres-password

#######################################
### Test variables
#######################################

# Platform
TEST_PLATFORM_SESSION_SECRET=platform-session-key

TEST_PLATFORM_GOOGLE_RECAPTCHA_SITEKEY=platform-google-recaptcha-sitekey
TEST_PLATFORM_GOOGLE_RECAPTCHA_SECRET=platform-google-recaptcha-secret

# Preprocessing
TEST_PREPROC_RETRIEVERS_VL_APIKEY=videolectures-apikey

TEST_PREPROC_WIKIFIER_URL=http://www.wikifier.org
TEST_PREPROC_WIKIFIER_USERKEY=wikifier-userkey

# Monitor
TEST_MONITOR_SESSION_SECRET=monitor-session-key
TEST_MONITOR_ADMIN_TOKEN=admin-token

# PostgresQL
TEST_PG_PASSWORD=postgres-password
```

