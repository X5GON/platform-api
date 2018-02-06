// external modules
const async = require('async');

// prepare postgresql connection to the database
const pg = require('../lib/postgresQL')(require('../config/pgconfig'));

// prepare commands we want to execute
let commands = [
    'CREATE TABLE IF NOT EXISTS client_activity (id serial PRIMARY KEY, provider varchar NOT NULL, referrer varchar NOT NULL, timestamp timestamp with time zone DEFAULT NOW());',
    'CREATE INDEX IF NOT EXISTS client_activity_provider ON client_activity(provider);',
    'CREATE INDEX IF NOT EXISTS client_activity_id ON client_activity(id);'
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
