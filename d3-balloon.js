/*
 Extension to d3.js for balloon plots.

 Works only with d3.js 4.0 API.

 Developed by Markus Konrad <markus.konrad@wzb.eu>, April/May 2017
 Partly adopted from Asif Rahman, http://neuralengr.com/asifr/journals/
 */

/** IE Support: add Array.fill method **/

if (!Array.prototype.fill) {
  Object.defineProperty(Array.prototype, 'fill', {
    value: function(value) {

      // Steps 1-2.
      if (this == null) {
        throw new TypeError('this is null or not defined');
      }

      var O = Object(this);

      // Steps 3-5.
      var len = O.length >>> 0;

      // Steps 6-7.
      var start = arguments[1];
      var relativeStart = start >> 0;

      // Step 8.
      var k = relativeStart < 0 ?
        Math.max(len + relativeStart, 0) :
        Math.min(relativeStart, len);

      // Steps 9-10.
      var end = arguments[2];
      var relativeEnd = end === undefined ?
        len : end >> 0;

      // Step 11.
      var final = relativeEnd < 0 ?
        Math.max(len + relativeEnd, 0) :
        Math.min(relativeEnd, len);

      // Step 12.
      while (k < final) {
        O[k] = value;
        k++;
      }

      // Step 13.
      return O;
    }
  });
}

/**
 * Create Balloon Plot of size `w` by `h`
 */
function balloonplot(w, h) {
    //
    // --- member variables ---
    //

    // constants
    var top = 1;
    var right = 2;
    var bottom = 3;
    var left = 4;

    // plot size
    var plotW = w;
    var plotH = h;

    // calculated column width and row height
    var colW = null;
    var rowH = null;
    // axis size
    var axisW = null;
    var axisH = null;
    // plot top left offset
    var position = null;
    // radius range [min radius, max radius]
    var rRange = null;

    // 2D data matrix
    var data = null;
    var dataMin = null;  // minimum value in `data`
    var dataMax = null;  // maximum value in `data`

    // optional circle/axis color scale
    var colorScale = null;
    var colorScaleDirection = null;   // colors on "x" (columns) or "y" (rows)

    // optional x axis
    var xAxis = null;
    var xAxisOrient = null;  // only top or bottom allowed

    // optional y axis
    var yAxis = null;
    var yAxisOrient = null;  // only left or right allowed

    // circles in plot
    var circles = null;

    // optional legend
    var legendNumCircles = null;    // number of sample circles to show in the legend
    var legendOrient = null;        // top, right, bottom or left
    var legendPadding = 15;
    var legendItemsPadding = 5;

    // enable/disable mouseover/touch interactions on various elements of the plot
    var interactionXAxis = false;
    var interactionYAxis = false;
    var interactionCircles = false;

    // optional additional callback when a column/row axis should be shown/hidden
    var axisActionCallback = null;

    // for toggled interactions used with touch input, this object records the current state
    var curToggle = {
        'id': null,         // action ID, e.g. "on_x_axis"
        'actionArg': null,  // argument to action
        'offAction': null   // function to be called for "off" toggle
    };

    // optional d3 transition
    var transition = null;

    // value text offset
    var valueTextDX = 0;
    var valueTextDY = 5;

    // value text formatting function
    var valueTextFmt = function(v) {
        if (isNaN(v)) {
            return '-'
        } else {
            return v;
        }
    };

    var g = null;   // root svg group
    var gLegend = null;         // legend group
    var gLegendItems = null;    // legend item groups
    var x = null;   // x scale
    var y = null;   // y scale
    var r = null;   // radius scale
    var rDataScale = function(d) {   // concrete radius scaling function
        if (isNaN(d[0])) return 0;
        else return r(d[0]);
    };

    /**
     * Balloon plot plotting function.
     */
    function bp() {
        if (data === null) throw "data must be set before";

        /**
         * Helper function to return a color for the passed `row` or column `col` when a color scale was enabled for
         * rows or columns.
         */
        function getColorFromScale(row, col) {
            if (colorScale !== null) {
                if (colorScaleDirection === 'x') {
                    return colorScale(col);
                } else if (colorScaleDirection === 'y') {
                    return colorScale(row);
                }
            }

            return 'default';
        }

        /**
         * Helper function to a apply a color scale on axis ticks in axis group `axGrp`.
         */
        function applyColorScaleToAxis(axGrp) {
            axGrp.selectAll('g.tick text')
                .style("fill", function (_, i) { return colorScale(i); });
        }

        /**
         * Enable interaction callbacks for axis group `axGrp` in direction `dir` ("x" or "y").
         */
        function enableInteractionsOnAxis(axGrp, dir) {
            axGrp.selectAll('.tick')
                .on("mouseover", function (i) { axisAction('over', dir, i) })
                .on("mouseout", function (i) { axisAction('out', dir, i) })
                .on("touchstart", function(i) {
                    toggleAction('on_x_axis', i, function() {
                        axisAction('over', dir, i)
                    }, function() {
                        axisAction('out', dir, i)
                    });
                });
        }

        // create root svg group
        g = d3.select(document.createElementNS(d3.namespaces.svg, "g"));
        g.attr("class", "plotroot").attr("transform", "translate(" + position.join(',') + ")");

        // add x axis
        if (xAxis !== null) {
            var xAxisPosY = xAxisOrient === top ? -axisH : plotH + axisH;
            var gxAxis = g.append("g")
                .attr("class", "x_axis")
                .attr("transform", "translate(0, " + xAxisPosY + ")")
                .call(xAxis);

            if (colorScale !== null && colorScaleDirection === 'x') {
                applyColorScaleToAxis(gxAxis);
            }

            if (interactionXAxis) {
                enableInteractionsOnAxis(gxAxis, 'x');
            }
        }

        // add y axis
        if (yAxis !== null) {
            var yAxisPosX = xAxisOrient === left ? -axisW : plotW + axisW;
            var gyAxis = g.append("g")
                .attr("class", "y_axis")
                .attr("transform", "translate(" + yAxisPosX + ", 0)")
                .call(yAxis);

            if (colorScale !== null && colorScaleDirection === 'y') {
                applyColorScaleToAxis(gyAxis);
            }

            if (interactionXAxis) {
                enableInteractionsOnAxis(gyAxis, 'y');
            }
        }

        // add legend -- this must be updated after it was rendered using init() below
        if (legendNumCircles !== null && legendOrient !== null) {
            var delta = (dataMax - dataMin) / (legendNumCircles - 1);

            gLegend = g.append("g")
                .attr("class", "legend");

            gLegendItems = gLegend.selectAll("g")
                .data(d3.range(legendNumCircles))
                .enter()
                    .append("g")
                    .attr("class", function(d) { return "legend_item legend_item_" + d; });

            gLegendItems.selectAll("circle")
                .data(function (d) { return [{'i': d}]; })
                .enter()
                    .append("circle")
                    .attr("r", function(d) { return rDataScale([dataMin + d.i * delta]); });

            gLegendItems.selectAll("text")
                .data(function (d) { return [{'i': d}]; })
                .enter()
                    .append("text")
                    .attr("dy", 5)
                    .text(function(d) { return valueTextFmt(dataMin + d.i * delta); });
        }

        // data cell function for 2D `data` matrix:
        // for each row in `data` and each value in that row, return an array containing the cell value `val`
        // and the row index `rowIdx`
        // now in each cell, a function can be used as follows to get access to the row and column indices and
        // the cell value:
        // function (d, i) -> d[0] is cell value, d[1] is row index, i is column index
        var dataCellFn = function (row, rowIdx) { return row.map(function (val) {return [val, rowIdx]}); };

        // add a group for each `data` matrix row
        var gRows = g.append("g")
            .attr("class", "main")
            .selectAll("g")
            .data(data)
            .enter()
                .append("g")
                    .attr("class", function(_, rowIdx) { return "row row_" + rowIdx;} );

        // add a circle for each cell
        circles = gRows.selectAll("circle")
            .data(dataCellFn)
            .enter()
                .append("circle")
                .attr("class", function (_, colIdx) { return "circle circle_" + colIdx; })
                .attr("cx", function(_, colIdx) { return x(colIdx) })
                .attr("cy", function(d) { return y(d[1]); })
                .attr("r", 0)   // set real radius in init() method
                .style("fill", function (d, colIdx) { return getColorFromScale(d[1], colIdx);  });

        if (interactionCircles || interactionXAxis || interactionYAxis) {
            // add a text for each value (initially invisible)
            gRows.selectAll("text")
                .data(dataCellFn)
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
        }

        if (interactionCircles) {
            // add invisible rects for mouse over actions of single value cells
            gRows.selectAll("g")
                .data(dataCellFn)
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

        return g.node();
    }


    //
    // --- public functions ---
    //

    /**
     * The init function must be called after the plot has been added to an SVG element and was rendered.
     */
    bp.init = function() {
        // optionally add a transition
        if (transition !== null) {
            circles.transition(transition).attr("r", rDataScale);
        } else {
            circles.attr("r", rDataScale);
        }

        // update legend positioning
        if (gLegend !== null && gLegendItems !== null) {
            var legendDir;
            if (legendOrient === left || legendOrient === right) {
                legendDir = 'v';  // vertical
            } else {
                legendDir = 'h';  // horizontal
            }

            var radii = [];
            gLegendItems.selectAll("circle").each(function () {
                radii.push(+d3.select(this).attr('r'));
            });

            var xpos, ypos;

            if (legendDir === 'v') {    // vertical
                xpos = new Array(legendNumCircles).fill(0);
                ypos = [];
                radii.reduce(function(a, b, i) { return ypos[i] = a + 2 * (b + legendItemsPadding * 2); }, 0);
                ypos = ypos.slice(0, ypos.length-1);
                ypos.unshift(0);
            } else {   // horizontal
                var widths = [];
                gLegendItems.selectAll("text").each(function () {
                    widths.push(this.getBBox().width);
                });

                xpos = [];
                widths.reduce(function(a, b, i) { return xpos[i] = a + b + 2 * rRange[1] + legendItemsPadding; }, 0);
                xpos = xpos.slice(0, xpos.length-1);
                xpos.unshift(0);
                ypos = new Array(legendNumCircles).fill(0);
            }

            gLegend.selectAll("g.legend_item")
                .data(d3.zip(xpos, ypos))
                    .attr("transform", function (d) { return "translate(" + d.join(',') + ")"; });

            gLegend.selectAll("g.legend_item text")
                .data(radii)
                    .attr("x", function (d) {
                        return legendDir === 'v' ? rRange[1] + legendItemsPadding : d + legendItemsPadding;
                    });

            var legendW = gLegend.node().getBBox().width;
            var legendH = gLegend.node().getBBox().height;

            var legendX, legendY;

            if (legendDir === 'v') {
                legendY = (plotH - legendH) / 2;
            } else {
                legendX = (plotW - legendW) / 2;
            }

            if (legendOrient === left) {
                legendX = -legendW - legendPadding;
                if (yAxisOrient === left) legendX -= axisW;
            } else if (legendOrient === right) {
                legendX = plotW + colW + legendPadding;
                if (yAxisOrient === right) legendX += axisW;
            } else if (legendOrient === top) {
                legendY = -legendH - legendPadding;
                if (xAxisOrient === top) legendY -= axisH;
            } else {  // legendOrient === bottom
                legendY = plotH + legendH + legendPadding;
                if (xAxisOrient === bottom) legendY += axisH;
            }

            gLegend.attr("transform", "translate(" + legendX + "," + legendY + ")");
        }

        return bp;
    };


    /**
     * Set the plot position (top left offset) to `x` and `y`.
     */
    bp.position = function(x, y) {
        position = [x, y];
        return bp;
    };

    /** Return column width. */
    bp.colW = function () {
        return colW;
    };

    /** Return row height. */
    bp.rowH = function () {
        return rowH;
    };

    /** Return x scale for concrete value or x scale function. */
    bp.x = function (_) {
        return arguments.length ? x(_) : x;
    };

    /** Return x scale for concrete value or x scale function. */
    bp.y = function (_) {
        return arguments.length ? y(_) : y;
    };

    /** Return radius scaling function. */
    bp.rDataScale = function () {
        return rDataScale;
    };

    /**
     * Enable/disable mouse/touch interaction on plot elements `elems` (can be "x", "y", "circle").
     */
    bp.interactionOnElements = function (elems, enable) {
        if (typeof(enable) === 'undefined') enable = true;

        elems.forEach(function(e) {
            if (e === 'x') interactionXAxis = enable;
            if (e === 'y') interactionYAxis = enable;
            if (e === 'circle') interactionCircles = enable;
        });

        return bp;
    };

    /**
     * Set action callback to function `f` when a row/column should be shown/hidden.
     */
    bp.axisActionCallback = function (f) {
        axisActionCallback = f;
        return bp;
    };

    /**
     * Set value text offset to `x` and `y`.
     */
    bp.valueTextOffset = function (x, y) {
        valueTextDX = x;
        valueTextDY = y;

        return bp;
    };

    /**
     * Set value text formatting function.
     */
    bp.valueTextFmt = function (f) {
        valueTextFmt = f;
        return bp;
    };

    /**
     * Set a d3 transition for interactions.
     */
    bp.transition = function (_) {
        return arguments.length ? (transition = _, bp) : transition;
    };

    /**
     * Manually set the radius range of the circles to `r_` with [r min, r max].
     */
    bp.rRange = function(r_) {
        if (r_.length !== 2) throw "radius range must be array with [r min, r max]";

        rRange = r_;
        return bp;
    };

    /**
     * Set the 2D `data` matrix which should be plotted.
     */
    bp.data = function (d) {
        if (d.length === 0) throw "passed data must contain rows";
        if (d[0].length === 0) throw "passed data must contain columns";
        if (typeof d[0][0] !== "number") throw "passed data must contain numbers";

        data = d;

        var nCol = data[0].length - 1;
        var nRow = data.length - 1;
        colW = plotW / nCol;
        rowH = plotH / nRow;
        var maxR = Math.min(colW, rowH) / 2;

        // set x scale
        x = d3.scaleLinear()
            .range([0, plotW])
            .domain([0, nCol]);

        // set y scale
        y = d3.scaleLinear()
            .range([0, plotH])
            .domain([0, nRow]);

        // calculate an radius range if it was not set manually before
        if (rRange === null) {
            rRange = [Math.ceil(0.1 * maxR), Math.floor(0.95 * maxR)];
        }

        // get the data minimum / maximum to set a radius scale
        dataMin = minOfMat(data);
        dataMax = maxOfMat(data);
        r = d3.scaleLinear()
            .domain([dataMin, dataMax])
            .range(rRange);

        // set the axis width and height
        if (axisW === null) {
            axisW = rRange[1] * 1.25;
        }
        if (axisH === null) {
            axisH = rRange[1] * 1.25;
        }

        // set the plot position if it was not set manually before
        if (position === null) {
            position = [axisW + rRange[1], axisH + rRange[1]];
        }

        return bp;
    };

    /**
     * Set a color `scale` to by applied to an axis and circles in direction `dir` (either "x" - column-wise -
     * or "y" - row-wise).
     */
    bp.colorScale = function(dir, scale) {
        colorScale = scale;
        colorScaleDirection = dir;

        return bp;
    };

    /**
     * Define an X-axis using d3 axis function `axisFn` (either d3.axisTop or d3.axisBottom) and tick labels
     * `axisTickLabels`.
     */
    bp.xAxis = function(axisFn, axisTickLabels, height) {
        if (data === null) throw "data must be set before";

        if (typeof(height) !== "undefined") axisH = height;

        xAxisOrient = axisFn === d3.axisTop ? top : bottom;

        xAxis = axisFn(x);

        if (typeof(axisTickLabels) !== "undefined") {
            xAxis = setAxisTicks(xAxis, axisTickLabels);
        }

        return bp;
    };

    /**
     * Define an Y-axis using d3 axis function `axisFn` (either d3.axisLeft or d3.axisRight) and tick labels
     * `axisTickLabels`.
     */
    bp.yAxis = function(axisFn, axisTickLabels, width) {
        if (data === null) throw "data must be set before";

        if (typeof(width) !== "undefined") axisW = width;

        yAxisOrient = axisFn === d3.axisLeft ? left : right;

        yAxis = axisFn(y);

        if (typeof(axisTickLabels) !== "undefined") {
            yAxis = setAxisTicks(yAxis, axisTickLabels);
        }

        return bp;
    };

    /**
     * Set a legend at position `orient`, which can be 'left', 'top', 'right' or 'bottom' and `n` sample circles.
     */
    bp.legend = function(orient, n, _legendPadding, _legendItemsPadding) {
        if (orient === 'left') {
            legendOrient = left;
        } else if (orient === 'right') {
            legendOrient = right;
        } else if (orient === 'bottom') {
            legendOrient = bottom;
        } else if (orient === 'top') {
            legendOrient = top;
        } else {
            throw "invalid orientation";
        }

        if (n > 1) {
            legendNumCircles = n;
        } else {
            throw "invalid number of circles (must be > 1)";
        }

        if (typeof(_legendPadding) !== "undefined") legendPadding = _legendPadding;
        if (typeof(_legendItemsPadding) !== "undefined") legendItemsPadding = _legendItemsPadding;

        return bp;
    };


    //
    // --- helper functions ---
    //

    /**
     * Return the minimum value in the matrix `mat`.
     */
    function minOfMat(mat) {
        return d3.min(mat, function(row) { return d3.min(row); });
    }

    /**
     * Return the maximum value in the matrix `mat`.
     */
    function maxOfMat(mat) {
        return d3.max(mat, function(row) { return d3.max(row); })
    }

    /**
     * Set tick `labels` to an `axis`.
     */
    function setAxisTicks(axis, labels) {
        return axis.tickValues(d3.range(labels.length))
            .tickFormat(function (d, i) { return labels[i]; });
    }

    /**
     * Show/hide the respective values "underneath" the circles, depending on the `action` ("over" or "out"), the `axis`
     * ("x" or "y") and index `i` of the respective axis.
     */
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

        if (axisActionCallback !== null) {
            axisActionCallback(g, transition, rDataScale, action, axis, i);
        }
    }

    /**
     * Toggle an action identified by `id` that has an action "target", i.e. argument `arg`. Execute the `on` function
     * immidiately and the `off` action when the same action (with the same `id` and `arg`) or a different action
     * should be executed.
     */
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
