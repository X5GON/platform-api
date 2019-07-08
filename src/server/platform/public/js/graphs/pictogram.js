/**
 * @class PictogramGraph
 * @classdesc Creates an interactive svg pictogram graph.
 * @param {Object} _params - The initialization parameters.
 */
function Pictogram(_params) {

    // self reference
    var self = this;

    /**
     * @name GraphParams
     * @description The graph parameters.
     * @property {String} containerName - The name of the graph container.
     * @property {Object} style - The graph style dictionary.
     * @property {Object} style.stroke - The stroke color.
     */
    var params = $.extend({
        containerName: null,
        width: '100%',
        height: '100%',
        style: {
            node: '#181715',
            edge: '#191E32',
            triangle: '#294461'
        },
        sorting: function(a, b) {
            return (b.known_user + b.unknown_user) - (a.known_user + a.unknown_user);
        }
    }, _params);

    /**
     * @description Returns the graph parameters.
     * @returns {GraphParams} The graph parameters.
     */
    this.getParams = function () {
        return params;
    };

    /**
     * @description Changes some of the graph parameters.
     * @param {Object} _params - The graph parameters.
     */
    this.setParams = function (_params) {
        if (!_params) { throw Error('PictogramGraph.setParams: no parameters given'); }
        params = $.extend(params, _params);
    };

    /**
     * @name GraphData
     * @description Graph pictogram data container.
     * @property {Object[]} instances - The instances of the list.
     */
    var graphData = {
        instances: null
    };

    /**
     * @description Returns the graph data.
     * @returns {GraphData} The graph data currently in use.
     */
    this.getData = function () {
        return graphData;
    };

    /**
     * @description Sets the graph data.
     * @param {Object} _data - The data for the graph.
     * @param {Object[]} [_data.instances] - The graph triangles.
     */
    this.setData = function (_data) {
        if (!_data) { throw Error('GraphNetwork.setData: no data given'); }
        graphData = $.extend(graphData, _data);

    };

    /**
     * Class attributes.
     */
    var vis = null;
    var fontSize = 24;
    var legendX = 410;
    var legendY = null;(index && index > 5 ? index - (type === 'unknown' ? 5 : 2) : list.length) * (fontSize + 8) + 32;
    var legendSpace = 20;
    var legendTitle = "Legend";
    var legendData = null; [
        { name: 'known visits - ' + known, color: '#1a4c4b' },
        { name: 'unknown visits - ' + unknown, color: '#3eb5b1' }
    ];
    /**
     * @description Initalizes the graph container.
     * @param {Boolean} [drawGraph=true] - Flag if you want the graph to be also
     * drawn.
     */
    this.initGraph = function (drawGraph=true) {
        // removes previous svg element
        d3.select(params.containerName + ' svg').remove();

        // initializes the graph container
        vis = d3.select(params.containerName)
            .append('svg')
            .attr('width', params.width)
            .attr('height', params.height)
            .attr('version', '1.0')
            .attr('xmlns', 'http://www.w3.org/2000/svg');

        // set the canvas width
        canvasWidth = parseFloat(vis.style('width').replace('px',''));

        if (drawGraph) { self.drawGraph(); }
    };

    /**
     * @description Draws the graph into the container.
     */
    this.drawGraph = function () {
        var data = this._prepareData(graphData);
        this.__plotPictogramChart(data);
    };

    /**
     * @description Draws the graph into the container.
     */
    this._prepareData = function (graphData) {
        let data = graphData.instances;

        var maxCount = data.map(item => item.known_user + item.unknown_user)
            .reduce((prev, curr) => prev + curr);

        const numberWithCommas = (x) => {
            return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        };

        var known = numberWithCommas(data.map(item => item.known_user)
            .reduce((prev, curr) => prev + curr));
        var unknown = numberWithCommas(data.map(item => item.unknown_user)
            .reduce((prev, curr) => prev + curr));

        var index;
        if (data.length > 9) {
            for (var i = 0; i < data.length; i++) {
                if ((data[i].known_user + data[i].unknown_user) / maxCount * 100 < 1) {
                    index = i; break;
                }
            }
            data = data.slice(0, index);
        }

        if (index) {
            var rest = {
                name: 'Other',
                version: '',
                known_user: graphData.instances.slice(index)
                    .map(item => item.known_user)
                    .reduce((prev, curr) => prev + curr),
                unknown_user: graphData.instances.slice(index)
                    .map(item => item.unknown_user)
                    .reduce((prev, curr) => prev + curr)
            };

            data.push(rest);
        }

        legendY = (index && index > 5 ? index-2 : list.length) * (fontSize + 8) + 32;
        legendData = [
            { name: 'known visits - ' + known, color: '#1a4c4b' },
            { name: 'unknown visits - ' + unknown, color: '#3eb5b1' }
        ];

        return data;
    };

    this._plotPictogramChart = function (data) {

        var element = vis.selectAll("g")
            .data(data).enter()
            .append("g")
            .attr('class', function (d, i) {
                return 'attribute' + i;
            });

        element.append("text")
            .attr("x", type === 'unknown' ? 1060 : 160)
            .attr("y", function (d, i) {
                return i * (fontSize + 8) + 30;
            })
            .attr('font-family', 'Calibri')
            .attr('font-size', fontSize - 8)
            .attr('alignment-baseline', 'center')
            .attr('text-anchor', 'end')
            .attr("fill", function (d, i) {
                return "#5b95a5";
            })
            .text(function (d) {
                return d.name || 'undefined';
            });

        for (var attrId = 0; attrId < data.length; attrId++) {
            var known_user = Math.ceil(data[attrId].known_user / maxCount * 80);
            var unknown_user = Math.ceil((data[attrId].known_user + data[attrId].unknown_user) / maxCount * 80);

            var attribute = vis.select('.attribute' + attrId);

            var i;
            for (i = 0; i < known_user; i++) {
                attribute.append("circle")
                    .attr("cx", 190 + i * 20)
                    .attr("cy",attrId * (fontSize + 8) + 24)
                    .attr("r", 8)
                    .attr("fill", "#1a4c4b");
            }

            for (i; i < unknown_user; i++) {
                attribute.append("circle")
                    .attr("cx", 190 + i * 20)
                    .attr("cy", attrId * (fontSize + 8) + 24)
                    .attr("r", 8)
                    .attr("fill", "#3eb5b1");
            }
        }

        var legend = vis.append('g')
            .attr('class', 'legend')
            .attr('transform', function (d, i) {
                return "translate(" + legendX + ", " + legendY + ")";
            });

        legend.append("text")
            .attr("transform", "translate(0, 0)")
            .attr('font-family', 'Calibri')
            .attr('font-size', fontSize - 4)
            .attr('alignment-baseline', 'center')
            .attr("fill", "#5b95a5")
            .text(legendTitle);

        var legendItems = legend.selectAll("g")
            .data(legendData).enter()
            .append("g")
            .attr("class", "item")
            .attr("transform", function (d, i) {
                return "translate(0, " + (i * legendSpace + fontSize) + ")";
            });

        legendItems.append("circle")
            .attr("cx", 10)
            .attr("cy", function (d, i) {
                return i * 12;
            })
            .attr("r", 8)
            .attr("fill", function (d) { return d.color; });

        legendItems.append("text")
            .attr("transform", function (d, i) {
                return "translate(30," + (i * 12 + 5) + ")";
            })
            .attr('font-family', 'Calibri')
            .attr('font-size', fontSize - 8)
            .attr('alignment-baseline', 'center')
            .text(function (d) { return d.name; });
    };
}
