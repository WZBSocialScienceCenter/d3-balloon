function minOfMat(mat) {
    return d3.min(mat, function(row) { return d3.min(row); });
}

function maxOfMat(mat) {
    return d3.max(mat, function(row) { return d3.max(row); })
}


function setAxisTicks(axis, labels) {
    return axis.tickValues(d3.range(labels.length))
        .tickFormat(function (d, i) { return labels[i]; });
}

function balloonplot(w, h) {
    var top = 1;
    var right = 2;
    var bottom = 3;
    var left = 4;


    var plotW = w;
    var plotH = h;
    var axisW = null;
    var axisH = null;
    var position = null;
    var rRange = null;

    var data = null;

    var colorScale = null;
    var colorScaleDirection = null;   // "x" or "y"

    var xAxis = null;
    var xAxisOrient = null;
    var yAxis = null;
    var yAxisOrient = null;

    var x = null;
    var y = null;
    var r = null;

    function bp() {
        if (data === null) throw "data must be set before";

        function getColorFromScale(row, col) {
            if (colorScale !== null) {
                if (colorScaleDirection === 'x') {
                    return colorScale(col);
                } else if (colorScaleDirection === 'y') {
                    return colorScale(row);
                }
            }

            return '#000000';
        }

        function applyColorScaleToAxis(axGrp) {
            axGrp.selectAll('g.tick text')
                .style("fill", function (_, i) { return colorScale(i); });
        }

        var g = d3.select(document.createElementNS(d3.namespaces.svg, "g"));

        g.attr("class", "plotroot").attr("transform", "translate(" + position.join(',') + ")");

        if (xAxis !== null) {
            var xAxisPosY = xAxisOrient === top ? -axisH : plotH + axisH;
            var xAxisGroup = g.append("g")
                .attr("class", "x_axis")
                .attr("transform", "translate(0, " + xAxisPosY + ")")
                .call(xAxis);

            if (colorScale !== null && colorScaleDirection === 'x') {
                applyColorScaleToAxis(xAxisGroup);
            }
        }

        if (yAxis !== null) {
            var yAxisPosX = xAxisOrient === left ? -axisW : plotW + axisW;
            var yAxisGroup = g.append("g")
                .attr("class", "y_axis")
                .attr("transform", "translate(" + yAxisPosX + ", 0)")
                .call(yAxis);

            if (colorScale !== null && colorScaleDirection === 'y') {
                applyColorScaleToAxis(yAxisGroup);
            }
        }

        g.append("g")
            .attr("class", "main")
            .selectAll("g")
            .data(data)
            .enter()
                .append("g")
                    .attr("class", function(_, rowIdx) { return "row row_" + rowIdx;} )
                    .selectAll("circle")
                        .data(function (row, rowIdx) { return row.map(function (val) {return [val, rowIdx]}); })
                        .enter()
                            .append("circle")
                            .attr("class", function (_, colIdx) { return "cell cell_" + colIdx; })
                            .attr("cx", function(_, colIdx) { return x(colIdx) })
                            .attr("cy", function(d) { return y(d[1]); })
                            .attr("r", function(d) { return r(d[0]); })
                            .style("fill", function (d, colIdx) { return getColorFromScale(d[1], colIdx);  });

        return g.node();
    }

    bp.position = function(x, y) {
        position = [x, y];
        return bp;
    };

    bp.rRange = function(r_) {
        if (r_.length !== 2) throw "radius range must be array with [r min, r max]";

        rRange = r_;
        return bp;
    };

    bp.data = function (d) {
        if (d.length === 0) throw "passed data must contain rows";
        if (d[0].length === 0) throw "passed data must contain columns";
        if (typeof d[0][0] !== "number") throw "passed data must contain numbers";

        data = d;

        var nCol = data[0].length - 1;
        var nRow = data.length - 1;
        var colW = plotW / nCol;
        var rowH = plotH / nRow;
        var maxR = Math.min(colW, rowH) / 2;

        x = d3.scaleLinear()
            .range([0, plotW])
            .domain([0, nCol]);

        y = d3.scaleLinear()
            .range([0, plotH])
            .domain([0, nRow]);

        var dataMin = minOfMat(data);
        var dataMax = maxOfMat(data);

        if (rRange === null) {
            rRange = [Math.ceil(0.05 * maxR), Math.floor(0.95 * maxR)];
        }

        r = d3.scaleLinear()
            .domain([dataMin, dataMax])
            .range(rRange);

        if (axisW === null) {
            axisW = rRange[1] * 1.25;
        }

        if (axisH === null) {
            axisH = rRange[1] * 1.25;
        }

        if (position === null) {
            position = [axisW + rRange[1], axisH + rRange[1]];
        }


        return bp;
    };

    bp.colorScale = function(dir, scale) {
        colorScale = scale;
        colorScaleDirection = dir;

        return bp;
    };

    bp.xAxis = function(axisFn, axisTickLabels) {
        if (data === null) throw "data must be set before";

        xAxisOrient = axisFn === d3.axisTop ? top : bottom;

        xAxis = axisFn(x);

        if (typeof(axisTickLabels) !== "undefined") {
            xAxis = setAxisTicks(xAxis, axisTickLabels);
        }

        return bp;
    };

    bp.yAxis = function(axisFn, axisTickLabels) {
        if (data === null) throw "data must be set before";

        yAxisOrient = axisFn === d3.axisLeft ? left : right;

        yAxis = axisFn(y);

        if (typeof(axisTickLabels) !== "undefined") {
            yAxis = setAxisTicks(yAxis, axisTickLabels);
        }

        return bp;
    };


    return bp;
}
