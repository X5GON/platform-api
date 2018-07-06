// external modules
const qtopology = require('qtopology');
const argv = require('minimist')(process.argv.slice(2));

// load preprocessing pipeline configuration

let config = require(`./${argv['topology-config']}`);

// compile the pipeline - inject variables and perform checks
let compiler = new qtopology.TopologyCompiler(config);
compiler.compile();
config = compiler.getWholeConfig();

// create the pipeline topology
let topology = new qtopology.TopologyLocal();
topology.init('uuid.text', config, (error) => {
    if (error) { 
        // TODO: log error within topology
        console.log(error); return;
    }
    // the topology has initialized - run topology
    console.log('Topology running!');
    topology.run();
});

// if process ends - shutdown the pipeline
process.on('SIGINT', () => {
    if (topology) {
        topology.shutdown((error) => {
            if (error) {
                // TODO: log error within topology
                console.log(error);
            }
            console.log('Topology shutdown');
            process.exit();
        });
    }
});