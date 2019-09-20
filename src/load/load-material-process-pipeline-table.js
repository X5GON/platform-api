// async values handler
const async = require('async');

// configurations
const config = require('../config/config');
const pg = require('@library/postgresQL')(config.pg);

pg.selectLarge({}, 'urls', 10,
    (error, rows, callback) => {
        if (error) { console.log(error); return; }

        let tasks = []
        for (let row of rows) {
            if (!row.material_id) { continue; }
            const {
                url,
                material_id
            } = row;

            tasks.push(xcallback => {
                pg.upsert({ url, material_id, status: 'finished' }, { url: null }, 'material_process_pipeline', function (xerror) {
                    xcallback(xerror);
                });
            });
        }

        async.series(tasks, function (xerror) {
            if (xerror) { console.log(xerror); }
            callback();
        });

    }, (error) => {
        if (error) { console.log(error); }
        pg.close();
    }
);