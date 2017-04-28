function minOfMat(mat) {
    return d3.min(mat, function(row) { return d3.min(row); });
}

function maxOfMat(mat) {
    return d3.max(mat, function(row) { return d3.max(row); })
}



function balloonplot(w, h) {
    var plotW = w;
    var plotH = h;
    var position = [0, 0];
    var rRange = null;

    var data = null;

    var x = null;
    var y = null;
    var r = null;

    function bp() {
        if (data === null) throw "data must be set before";

        var g = d3.select(document.createElementNS(d3.namespaces.svg, "g"));

        g
            .attr("transform", "translate(" + position.join(',') + ")")
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
                        .attr("r", function(d) { return r(d[0]); });

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

        x = d3.scaleLinear()
            .range([0, plotW])
            .domain([0, data[0].length]);

        y = d3.scaleLinear()
            .range([0, plotH])
            .domain([0, data.length]);

        var dataMin = minOfMat(data);
        var dataMax = maxOfMat(data);

        if (rRange === null) {
            var maxR = Math.min(x(1) - x(0), y(1) - y(0)) / 2;
            rRange = [Math.ceil(0.05 * maxR), Math.floor(0.95 * maxR)];
        }

        r = d3.scaleLinear()
            .domain([dataMin, dataMax])
            .range(rRange);


        return bp;
    };

    return bp;
}
