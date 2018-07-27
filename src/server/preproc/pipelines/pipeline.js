// external modules
const qtopology = require('qtopology');
const argv = require('minimist')(process.argv.slice(2));

// load preprocessing pipeline configuration

let config = require(`./${argv.topology}`);

// compile the pipeline - inject variables and perform checks
let compiler = new qtopology.TopologyCompiler(config);
compiler.compile();
config = compiler.getWholeConfig();

// create the pipeline topology
let topology = new qtopology.TopologyLocal();
topology.init('uuid.oer-processing', config, (error) => {
    if (error) { console.log(error); return; }
    // the topology has initialized - run topology
    console.log('Topology running!');
    topology.run();
});

/**
 * @description Shutdowns qtopology.
 * @param {Object} error - Uncaught exception.
 */
function shutdown(error) {
    if (error){
        console.log("ERROR", error);
    }
    if (topology) {
        topology.shutdown((xerror) => {
            if (xerror) {
                console.log("Error", xerror);
                process.exit(1);
            } else { process.exit(0); }
        });
        topology = null;
    }
}

// do something when app is closing
process.on('exit', shutdown);

// catches ctrl+c event
process.on('SIGINT', shutdown);

// catches uncaught exceptions
process.on('uncaughtException', shutdown);