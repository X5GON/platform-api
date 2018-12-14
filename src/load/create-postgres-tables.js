// configurations
const config = require('../config/config');

// external modules
const async = require('async');

// prepare postgresql connection to the database
const pg = require('../lib/postgresQL')(config.pg);

// prepare commands we want to execute
let commands = [
    ///////////////////////////////////////////////////////
    // snippet user activity data table
    `CREATE TABLE IF NOT EXISTS client_activity (id serial PRIMARY KEY, uuid varchar NOT NULL,
        provider varchar NOT NULL, url varchar NOT NULL, visitedOn timestamp with time zone NOT NULL,
        referrer varchar NOT NULL, userAgent varchar NOT NULL, language varchar NOT NULL);`,

    'CREATE INDEX IF NOT EXISTS client_activity_id ON client_activity(id);',
    'CREATE INDEX IF NOT EXISTS client_activity_userid ON client_activity(uuid);',
    'CREATE INDEX IF NOT EXISTS client_activity_provider ON client_activity(provider);',
    'CREATE INDEX IF NOT EXISTS client_activity_visitedOn ON client_activity(visitedOn);',

    ///////////////////////////////////////////////////////
    // repository contact and token
    `CREATE TABLE IF NOT EXISTS repositories (id serial PRIMARY KEY, name varchar NOT NULL,
        domain varchar NOT NULL, contact varchar NOT NULL, token varchar NOT NULL);`,

    'CREATE INDEX IF NOT EXISTS repositories_name_idx ON repositories(name);',
    'CREATE INDEX IF NOT EXISTS repositories_domain_idx ON repositories(domain);',
    'CREATE INDEX IF NOT EXISTS repositories_contact_idx ON repositories(contact);',
    'CREATE INDEX IF NOT EXISTS repositories_token_idx ON repositories(token);',

    ///////////////////////////////////////////////////////
    // oer materials production and metadata
    `CREATE TABLE IF NOT EXISTS oer_materials (id serial PRIMARY KEY, title varchar NOT NULL,
        description varchar, providerUri varchar NOT NULL,
        materialUrl varchar NOT NULL UNIQUE, author varchar, language varchar NOT NULL,
        dateCreated timestamp with time zone, dateRetrieved timestamp with time zone,
        type jsonb, providerMetadata jsonb NOT NULL, materialMetadata jsonb NOT NULL,
        license varchar);`,

    'CREATE INDEX IF NOT EXISTS oer_materials_materialUrl_idx ON oer_materials(materialUrl);',
    'CREATE INDEX IF NOT EXISTS oer_materials_type_idx ON oer_materials(type);',

    'ALTER TABLE oer_materials ADD COLUMN IF NOT EXISTS license varchar;',
    'ALTER TABLE oer_materials_update ADD CONSTRAINT materialurl_unique UNIQUE (materialUrl);',
    ///////////////////////////////////////////////////////
    // oer materials partial table and metadata
    `CREATE TABLE IF NOT EXISTS oer_materials_partial (id serial PRIMARY KEY,
        title varchar, description varchar, providerUri varchar, materialUrl varchar,
        author varchar, language varchar, dateCreated timestamp with time zone,
        dateRetrieved timestamp with time zone, type jsonb, providerMetadata jsonb,
        materialMetadata jsonb, license varchar, message varchar);`,

    'CREATE INDEX IF NOT EXISTS oer_materials_partial_materialUrl_idx ON oer_materials_partial(materialUrl);',
    'CREATE INDEX IF NOT EXISTS oer_materials_partial_type_idx ON oer_materials_partial(type);',

    'ALTER TABLE oer_materials_partial ADD COLUMN IF NOT EXISTS license varchar;',
    'ALTER TABLE oer_materials_partial ADD COLUMN IF NOT EXISTS message varchar;',
    ///////////////////////////////////////////////////////
    // oer materials development table and metadata
    `CREATE TABLE IF NOT EXISTS oer_materials_dev (id serial PRIMARY KEY, title varchar NOT NULL,
        description varchar, providerUri varchar NOT NULL,
        materialUrl varchar NOT NULL, author varchar, language varchar NOT NULL,
        dateCreated timestamp with time zone, dateRetrieved timestamp with time zone,
        type jsonb, providerMetadata jsonb NOT NULL, materialMetadata jsonb NOT NULL,
        license varchar);`,

    'CREATE INDEX IF NOT EXISTS oer_materials_dev_materialUrl_idx ON oer_materials_dev(materialUrl);',
    'CREATE INDEX IF NOT EXISTS oer_materials_dev_type_idx ON oer_materials_dev(type);',

    'ALTER TABLE oer_materials_dev ADD COLUMN IF NOT EXISTS license varchar;',
    ///////////////////////////////////////////////////////
    // oer queue - for materials not yet retrieved
    `CREATE TABLE IF NOT EXISTS oer_queue (id serial NOT NULL,
        materialUrl varchar NOT NULL PRIMARY KEY, providerUri varchar NOT NULL,
        inserted timestamp with time zone DEFAULT NOW());`,

    `CREATE INDEX IF NOT EXISTS oer_queue_materialUrl_idx ON oer_queue(materialUrl);`,
    `CREATE INDEX IF NOT EXISTS oer_queue_inserted_idx ON oer_queue(inserted);`
];

// execute them one by one
async.eachSeries(
    commands,
    (command, callback) => {
        console.log(`Executing:\n ${command}`);
        pg.execute(
            command, [],
            (err) => {
                if (err) { console.log('Error on execution', err.message); }
                callback();
            }
        );
    },
    () => { console.log('Tables created'); pg.close(); }
);
