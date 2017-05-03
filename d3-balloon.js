function minOfMat(mat) {
    return d3.min(mat, function(row) { return d3.min(row); });
}

function maxOfMat(mat) {
    return d3.max(mat, function(row) { return d3.max(row); })
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

    var interactionXAxis = false;
    var interactionYAxis = false;
    var interactionCircles = false;

    var curToggle = {
        'id': null,
        'actionArg': null,
        'offAction': null
    };

    var transition = null;


    var valueTextDX = 0;
    var valueTextDY = 5;
    var valueTextFmt = function(v) {
        if (isNaN(v)) {
            return '-'
        } else {
            return v;
        }
    };

    var g = null;
    var x = null;
    var y = null;
    var r = null;
    var rDataScale = function(d) { return r(d[0]); };


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

        g = d3.select(document.createElementNS(d3.namespaces.svg, "g"));

        g.attr("class", "plotroot").attr("transform", "translate(" + position.join(',') + ")");

        if (xAxis !== null) {
            var xAxisPosY = xAxisOrient === top ? -axisH : plotH + axisH;
            var gxAxis = g.append("g")
                .attr("class", "x_axis")
                .attr("transform", "translate(0, " + xAxisPosY + ")")
                .call(xAxis);

            if (colorScale !== null && colorScaleDirection === 'x') {
                applyColorScaleToAxis(gxAxis);
            }
        }

        if (yAxis !== null) {
            var yAxisPosX = xAxisOrient === left ? -axisW : plotW + axisW;
            var gyAxis = g.append("g")
                .attr("class", "y_axis")
                .attr("transform", "translate(" + yAxisPosX + ", 0)")
                .call(yAxis);

            if (colorScale !== null && colorScaleDirection === 'y') {
                applyColorScaleToAxis(gyAxis);
            }
        }

        var gRows = g.append("g")
            .attr("class", "main")
            .selectAll("g")
            .data(data)
            .enter()
                .append("g")
                    .attr("class", function(_, rowIdx) { return "row row_" + rowIdx;} );

        var circles = gRows.selectAll("circle")
            .data(function (row, rowIdx) { return row.map(function (val) {return [val, rowIdx]}); })
            .enter()
                .append("circle")
                .attr("class", function (_, colIdx) { return "circle circle_" + colIdx; })
                .attr("cx", function(_, colIdx) { return x(colIdx) })
                .attr("cy", function(d) { return y(d[1]); })
                .style("fill", function (d, colIdx) { return getColorFromScale(d[1], colIdx);  });

        var valueTexts = gRows.selectAll("text")
            .data(function (row, rowIdx) { return row.map(function (val) {return [val, rowIdx]}); })
            .enter()
                .append("text")
                .attr("class", function (_, colIdx) { return "value value_" + colIdx; })
                .attr("x", function(_, colIdx) { return x(colIdx) })
                .attr("y", function(d) { return y(d[1]); })
                .attr("dx", valueTextDX)
                .attr("dy", valueTextDY)
                .attr("text-anchor", "middle")
                .text(function (d) { return valueTextFmt(d[0]) })
                .style("fill", function (d, colIdx) { return getColorFromScale(d[1], colIdx);  })
                .style("display", "none");

        if (interactionCircles) {
            // add invisible rects for mouse over actions of single value cells
            gRows.selectAll("g")
                .data(function (row, rowIdx) { return row.map(function (val) {return [val, rowIdx]}); })
                .enter()
                    .append("g")
                    .style("pointer-events", "all").style("pointer-events", "all")
                    .on("mouseover", function(d, colIdx) {
                        axisAction('over', 'x', colIdx);
                        axisAction('over', 'y', d[1]);
                    })
                    .on("mouseout", function(d, colIdx) {
                        axisAction('out', 'x', colIdx);
                        axisAction('out', 'y', d[1]);
                    })
                    .on("touchstart", function(d, colIdx) {
                        var rowIdx = d[1];
                        var circleID = rowIdx + '_' + colIdx;
                        toggleAction('on_circle', circleID, function() {
                            axisAction('over', 'x', colIdx);
                            axisAction('over', 'y', rowIdx);
                        }, function() {
                            axisAction('out', 'x', colIdx);
                            axisAction('out', 'y', rowIdx);
                        });
                    })
                    .append("rect")
                        .attr("x", function(d, colIdx) { return x(colIdx) - rRange[1]; })
                        .attr("y", function(d) { return y(d[1]) - rRange[1]; })
                        .attr("width", rRange[1] * 2)
                        .attr("height", rRange[1] * 2)
                        .style("visibility", "hidden");
        }

        if (transition !== null) {
            circles.transition(transition).attr("r", rDataScale);
        } else {
            circles.attr("r", rDataScale);
        }

        return g.node();
    }

    bp.position = function(x, y) {
        position = [x, y];
        return bp;
    };

    bp.interactionOnElements = function (elems, enable) {
        if (typeof(enable) === 'undefined') enable = true;

        elems.forEach(function(e) {
            if (e === 'x') interactionXAxis = enable;
            if (e === 'y') interactionYAxis = enable;
            if (e === 'circle') interactionCircles = enable;
        });

        return bp;
    };

    bp.valueTextOffset = function (x, y) {
        valueTextDX = x;
        valueTextDY = y;

        return bp;
    };

    bp.valueTextFmt = function (f) {
        valueTextFmt = f;
        return bp;
    };

    bp.transition = function (t) {
        transition = t;
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


    function setAxisTicks(axis, labels) {
        return axis.tickValues(d3.range(labels.length))
            .tickFormat(function (d, i) { return labels[i]; });
    }

    function axisAction(action, axis, i) {
        var cSelector = '.main ', vSelector = '.main ';

        cSelector += axis === 'x' ? '.circle_' + i : '.row_' + i + ' .circle';
        vSelector += axis === 'x' ? '.value_' + i : '.row_' + i + ' .value';

        var cDisp = action === 'over' ? 'none' : 'block';
        var vDisp = action === 'over' ? 'block' : 'none';

        if (cDisp === 'none') {
            if (transition !== null) {
                g.selectAll(cSelector).interrupt().transition(transition).attr("r", 0);
            } else {
                g.selectAll(cSelector).attr("r", 0);
            }
        } else {
            if (transition !== null) {
                g.selectAll(cSelector).interrupt().transition(transition).attr("r", rDataScale);
            } else {
                g.selectAll(cSelector).attr("r", rDataScale);
            }
        }
        g.selectAll(vSelector).style("display", vDisp);
    }

    function toggleAction(id, arg, on, off) {
        if (curToggle.id !== null && curToggle.offAction !== null) {
            curToggle.offAction();
        }

        if (curToggle.actionArg !== arg) {
            on();
            curToggle.id = id;
            curToggle.actionArg = arg;
            curToggle.offAction = off;
        } else {
            curToggle.id = null;
            curToggle.actionArg = null;
            curToggle.offAction = null;
        }
    }


    return bp;
}
