function Timeline (_params) {

    // set parameters
    this.params = $.extend({
        selector: undefined,
        dataSizeMax: 1000,
        margin: {
            top: 35,
            right: 15,
            bottom: 20,
            left: 15
        }
    }, _params);

    // set data container
    this.data = { values: [] };

    this.getData = function () {
        return this.data;
    };

    this.addDataInstance = function (instance) {
        if (instance === undefined) { return; }
        // add instance to the list
        this.data.values.push(instance);

        if (this.data.values.length > this.params.dataSizeMax) {
            // remove the first instance
            this.data.values.shift();
        }
    };

    this.updateParams = function(_params) {
        this.params = $.extend(this.params, _params);
    };

    this.drawGraph = function () {
        // get the height and width of the container
        let totalWidth  = $(this.params.selector).width();
        let totalHeight = $(this.params.selector).height();

        // set the height and width of the graph container
        let width = totalWidth - this.params.margin.left - this.params.margin.right,
            height = totalHeight - this.params.margin.top - this.params.margin.bottom;

        // get the container object
        let container = d3.select(this.params.selector);

        console.log(container);

        // remove the previous elements of the container
        container.selectAll('svg').remove();

        // create a new content container
        this._content = container.append('svg')
            .attr('width', totalWidth)
            .attr('height', totalHeight)
          .append('g')
            .attr('transform', 'translate(' + this.params.margin.left + ',' + this.params.margin.top +')');

        // get timeline data
        let data = this.data;

        // set horizontal scale
        this._x = d3.scaleTime()
            .domain(d3.extent(data.values, function (d) { return new Date(d.date); }))
            .range([0, width - this.params.margin.left])
            .nice();

        // set vertical scale
        this._y = d3.scaleLinear()
            .domain([0, data.max])
            .rangeRound([height, 0])
            .nice();

        // initialize timeline creation function
        let timeline = d3.line()
            .x(function (d) { return this._x(new Date(d.date)); })
            .y(function (d) { return this._y(d.value); })
            .curve(d3.curveMonotoneX);

        let chart = this._content.append('g')
            .attr('class', 'chart')
            .attr('transform', `translate(${this.params.margin.left},0)`);

        // draw the timeline
        chart.append('path')
            .datum(data.values)
            .attr('class', 'timeline')
            .attr('fill', 'none')
            .attr('stroke', 'steelblue')
            .attr('stroke-linejoin', 'round')
            .attr('stroke-linecap', 'round')
            .attr('stroke-width', 1.5)
            .attr('d', timeline);

        // set horizontal axis
        chart.append('g')
            .attr('transform', 'translate(0,' + height + ')')
            .attr("class", 'x axis')
            .call(d3.axisBottom(this._x)
                .ticks(width < 400 ? 5 : 10)
            );

        // set vertical axis
        chart.append('g')
            .style('font-family', 'Open Sans')
            .attr("class", 'y axis')
            .call(d3.axisLeft(this._y)
                .ticks(height < 400 ? 5 : 10)
                .tickFormat(function (tick) { return tick <= 10 ? tick : d3.format(".2s")(tick); })
            );

    };

    return this;
}