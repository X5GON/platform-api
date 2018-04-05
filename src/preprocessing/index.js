// external modules
const qtolopogy = require('qtopology');


const tn = qtolopogy.ln;
const validator = qtolopogy.validation;

// load preprocessing pipeline configuration
let config = require('./topology');

// compile the pipeline - inject variables and perform checks
let compiler = new qtolopogy.compiler.TopologyCompiler(config);
compiler.compile();
config = compiler.getWholeConfig();

// create the pipeline topology
let topology = new tn.TopologyLocal();
topology.init(config, (error) => {
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