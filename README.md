# d3-balloon.js – A d3.js extension for interactive balloon plots in the Web

April/Mai 2017, Markus Konrad <markus.konrad@wzb.eu> / [Berlin Social Science Center](https://www.wzb.eu/en)

*d3-balloon.js* is an extension for [d3.js v4](https://d3js.org/) for interactive balloon plots that look like these:

![balloon plot example](http://datascience.blog.wzb.eu/wp-content/uploads/10/2017/05/d3-balloon-example1.png)

![balloon plot example with mouseover](http://datascience.blog.wzb.eu/wp-content/uploads/10/2017/05/d3-balloon-example2.png)

You can also have a look at a live example with random data here: http://dsspace.wzb.eu/d3-balloon/

This plot has been created with the following simple code:

```javascript
// create the balloon plot
var bplot = balloonplot(370, 200)
    .position(40, 65)               // set the top-left offset
    .transition(transition)         // enable transitions
    .colorScale('y', yColor)        // set the row-wise colors
    .interactionOnElements(['circle', 'x', 'y'])   // enable interactions for mouseover/touch on circles and axes
    .valueTextFmt(function (v) { return Math.round(v * 100) / 100; })   // custom value formatter
    .data(data)                     // pass the 2D data matrix
    .xAxis(d3.axisTop, xLabels)     // enable the X axis and pass the tick labels
    .yAxis(d3.axisRight, yLabels)   // enable the Y axis and pass the tick labels
    .legend('bottom', 3);           // legend below the plot with 3 sample circles

// add it to the SVG canvas
svg.append(bplot)
    .attr("class", "balloon_plot");
bplot.init();   // starts transition
```

**Notice:** It only works with d3.js version 4.x, not with version 3.x!
