// external modules
const express = require('express');
const bodyParser = require('body-parser');

// parameters given to the process
const argv = require('minimist')(process.argv.slice(2));
// parameters used on the express app
const PORT = argv.PORT || 7111;

// create express app
let app = express();

// configure application
app.use(bodyParser.json());     // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
}));


app.use(express.static(__dirname + '/public/'));

app.get('/', (req, res) => {
    return res.send('/public/index.html');
});

// start the server
app.listen(PORT, () => console.log(`server listening on port ${PORT}`));