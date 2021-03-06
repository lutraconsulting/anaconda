(function (JGS, $, undefined) {    // WB: wrapping in () means that entire block is essentially an anonymous function executed directly with arguments at the very end
  "use strict";

  /**
   This class provides javascript handling specific to the example1 page. Most importantly, it provides the dygraphs
   setup and handling, including the handling of mouse-down/up events on the dygraphs range control element.

   @class Lineplot
   @constructor
   */
  JGS.Lineplot = function (pageCfg) {
    this.$graphCont = pageCfg.$graphCont;
    this.$rangeBtnsCont = pageCfg.$rangeBtnsCont;
    this.graphDataProvider = new JGS.GraphDataProvider();
    this.graphDataProvider.newGraphDataCallbacks.add($.proxy(this._onNewGraphData, this));
    this.isRangeSelectorActive = false;
  };

  /**
   * Initialise the graph with a default range of data
   *
   * @method
   */
  JGS.Lineplot.prototype.init = function () {
    this.showSpinner(true);
    this._setupRangeButtons();

    // Set the default end of the overview time series to the end of the current hour:
    var rangeEndMom = moment().utc();
    rangeEndMom.startOf('hour');
    rangeEndMom.add(1, 'hour');
    // Set the default length of the overview time series to 6 months
    // TODO: this should ideally be the start of the entire time series.
    var rangeStartMom = moment.utc(rangeEndMom).add(-6, 'month');

    // activate default time span
    this.$rangeBtnsCont.find("button[name='range-btn-6m']").addClass('active');
    // get the sensor name:
    var sensor = $(".btn-mini.active").attr('sensor_id');
    this.lastOption = 'range-btn-6m';
    this.waitingOption = 'range-btn-6m';
    //  Set the default start and end of the detailed TS view to same as the overview TS:
    var detailEndMom = moment(rangeEndMom);
    var detailStartMom = moment(rangeStartMom);
    // get chart type
    var chartType  = $("#chart_type :selected")[0].value;

    // Generate and set the title of the graph:
    this.prevLabel = "<small>Details range: "  + detailStartMom.toDate() + " to " + detailEndMom.toDate() +  "</small>";
    $("#detailsrange").html("<small>Details range: "  + detailStartMom.toDate() + " to " + detailEndMom.toDate() +  "</small>");

    // And lastly, load and display the data
    this.graphDataProvider.loadData("temperature",
                                    sensor,
                                    rangeStartMom.toDate(),
                                    rangeEndMom.toDate(),
                                    detailStartMom.toDate(),
                                    detailEndMom.toDate(),
                                    this.$graphCont.width(),
                                    chartType
                                    );
  };

 /**
   * Method for the range buttons
   *
   * @method
   */
  JGS.Lineplot.prototype._setupRangeButtons = function () {
    var self = this;
    this.$rangeBtnsCont.children().on('click', function (evt) {
      //evt.preventDefault();
      evt.defaultPrevent;
      var rangeType = evt.target.name.toString().replace("range-btn-", "");
      var sensor = $(".btn-mini.active").attr('sensor_id');
      var chartType  = $("#chart_type :selected")[0].value;
      self.waitingOption = evt.target.name.toString();
      self.$rangeBtnsCont.children().children().removeClass('active');
      self.$rangeBtnsCont.find("button[name='" + self.waitingOption + "']").addClass('active');

      var rangeEndMom;
      rangeEndMom = moment().utc();
      rangeEndMom.minutes(0).seconds(0);
      rangeEndMom.add(1, 'hour');

      var rangeStartMom;
      if (rangeType === "1d") {
        rangeStartMom = moment.utc(rangeEndMom).add(-1, 'day');
      } else if (rangeType === "1w") {
        rangeStartMom = moment.utc(rangeEndMom).add(-1, 'week');
      } else if (rangeType === "1m") {
        rangeStartMom = moment.utc(rangeEndMom).add(-1, 'month');
      } else if (rangeType === "3m") {
        rangeStartMom = moment.utc(rangeEndMom).add(-3, 'month');
      } else if (rangeType === "6m") {
        rangeStartMom = moment.utc(rangeEndMom).add(-6, 'month');
      } else if (rangeType === "1y") {
        rangeStartMom = moment.utc(rangeEndMom).add(-1, 'year');
      } else if (rangeType === "2y") {
        rangeStartMom = moment.utc(rangeEndMom).add(-2, 'year');
      } else if (rangeType === "3y") {
        rangeStartMom = moment.utc(rangeEndMom).add(-3, 'year');
      } else if (rangeType === "5y") {
        rangeStartMom = moment.utc(rangeEndMom).add(-5, 'year');
      } else if (rangeType === "YTD") {
          rangeStartMom = moment().startOf('year').utc();
      }

      // When the range is reset, the detailed view is set to same extents as range
      var detailStartMom = rangeStartMom.clone();
      var detailEndMom = rangeEndMom.clone();

      self.showSpinner(true);
      self.graphDataProvider.loadData("temperature",
                                      sensor,
                                      rangeStartMom.toDate(),
                                      rangeEndMom.toDate(),
                                      detailStartMom.toDate(),
                                      detailEndMom.toDate(),
                                      self.$graphCont.width(),
                                      chartType);
    });

  };

  /**
   * Internal method to add mouse down listener to dygraphs range selector.  Coded so that it can be called
   * multiple times without concern. Although not necessary for simple example (like example1), this becomes necessary
   * for more advanced examples when the graph must be recreated, not just updated.
   *
   * @method _setupRangeMouseHandling
   * @private
   */
  JGS.Lineplot.prototype._setupRangeMouseHandling = function () {
    var self = this;

    // Element used for tracking mouse up events
    this.$mouseUpEventEl = $(window);
    if ($.support.cssFloat == false) { //IE<=8, doesn't support mouse events on window
      this.$mouseUpEventEl = $(document.body);
    }

    //Minor Hack...not sure how else to hook-in to dygraphs range selector events without modifying source. This is
    //where minor modification to dygraphs (range selector plugin) might make for a cleaner approach.
    //We only want to install a mouse up handler if mouse down interaction is started on the range control
    var $rangeEl = this.$graphCont.find('.dygraph-rangesel-fgcanvas, .dygraph-rangesel-zoomhandle');

    //Uninstall existing handler if already installed
    $rangeEl.off("mousedown.jgs touchstart.jgs");

    //Install new mouse down handler
    $rangeEl.on("mousedown.jgs touchstart.jgs", function (evt) {

      //Track that mouse is down on range selector
      self.isRangeSelectorActive = true;

      // Setup mouse up handler to initiate new data load
      self.$mouseUpEventEl.off("mouseup.jgs touchend.jgs"); //cancel any existing
      $(self.$mouseUpEventEl).on('mouseup.jgs touchend.jgs', function (evt) {
        self.$mouseUpEventEl.off("mouseup.jgs touchend.jgs");

        //Mouse no longer down on range selector
        self.isRangeSelectorActive = false;

        //Get the new detail window extents
        var graphAxisX = self.graph.xAxisRange();
        self.detailStartDateTm = new Date(graphAxisX[0]);
        self.detailEndDateTm = new Date(graphAxisX[1]);

        // Load new detail data
        self._loadNewDetailData();
      });

    });


  };

  /**
   * Internal method that provides a hook in to Dygraphs default pan interaction handling.  This is a bit of hack
   * and relies on Dygraphs' internals. Without this, pan interactions (holding SHIFT and dragging graph) do not result
   * in detail data being loaded.
   *
   * This method works by replacing the global Dygraph.Interaction.endPan method.  The replacement method
   * is global to all instances of this class, and so it can not rely on "self" scope.  To support muliple graphs
   * with their own pan interactions, we keep a circular reference to this object instance on the dygraphs instance
   * itself when creating it. This allows us to look up the correct page object instance when the endPan callback is
   * triggered. We use a global JGS.Lineplot.isGlobalPanInteractionHandlerInstalled flag to make sure we only install
   * the global handler once.
   *
   * @method _setupPanInteractionHandling
   * @private
   */
  JGS.Lineplot.prototype._setupPanInteractionHandling = function () {

    if (JGS.Lineplot.isGlobalPanInteractionHandlerInstalled)
      return;
    else
      JGS.Lineplot.isGlobalPanInteractionHandlerInstalled = true;

    //Save original endPan function
    var origEndPan = Dygraph.Interaction.endPan;

    //Replace built-in handling with our own function
    Dygraph.Interaction.endPan = function(event, g, context) {

      var myInstance = g.demoPageInstance;

      //Call the original to let it do it's magic
      origEndPan(event,g,context);

      //Extract new start/end from the x-axis

      //Note that this _might_ not work as is in IE8. If not, might require a setTimeout hack that executes these
      //next few lines after a few ms delay. Have not tested with IE8 yet.
      var axisX = g.xAxisRange();
      myInstance.detailStartDateTm = new Date(axisX[0]);
      myInstance.detailEndDateTm = new Date(axisX[1]);
      //Trigger new detail load
      myInstance._loadNewDetailData();
    };
    Dygraph.endPan = Dygraph.Interaction.endPan; //see dygraph-interaction-model.js
  };



  /**
   * Initiates detail data load request using last known zoom extents
   *
   * @method _loadNewDetailData
   * @private
   */
  JGS.Lineplot.prototype._loadNewDetailData = function () {
    this.showSpinner(true);
    var sensor = $(".btn-mini.active").attr('sensor_id');
    var chartType  = $("#chart_type :selected")[0].value;
    this.prevLabel = "<small>Details range: "  + moment(this.detailStartDateTm).toDate() + " to " + moment(this.detailEndDateTm).toDate() +  "</small>";
    $("#detailsrange").html("<small>Details range: "  + moment(this.detailStartDateTm).toDate() + " to " + moment(this.detailEndDateTm).toDate() +  "</small>");
    this.graphDataProvider.loadData("temperature", sensor, null, null, this.detailStartDateTm, this.detailEndDateTm, this.$graphCont.width(), chartType);
  };

  /**
   * Callback handler when new graph data is available to be drawn
   *
   * @param graphData
   * @method _onNewGraphData
   * @private
   */
  JGS.Lineplot.prototype._onNewGraphData = function (graphData) {
    this.drawDygraph(graphData);
    this.$rangeBtnsCont.css('visibility', 'visible');
    this.showSpinner(false);

  };

  /**
   * Main method for creating or updating dygraph control
   *
   * @param graphData
   * @method drawDygraph
   */
  JGS.Lineplot.prototype.drawDygraph = function (graphData) {
    var dyData = graphData.dyData;

    if (!dyData.length) { // need Comment
      //dyData = "X\n";
      alert("There is no data in this range, please choose other range, data shown now is still last range selected");
      this.$rangeBtnsCont.children().children().removeClass('active');
      this.$rangeBtnsCont.find("button[name='" + this.lastOption+ "']").addClass('active');
      $("#detailsrange").html(this.prevLabel);
      return
    }
      this.lastOption  = this.waitingOption;

    var detailStartDateTm = graphData.detailStartDateTm;
    var detailEndDateTm = graphData.detailEndDateTm;

    // This will be needed later when supporting dynamic show/hide of multiple series
    var recreateDygraph = false;

    // To keep example1 simple, we just hard code the labels with one series
    var labels = ["time", "TODO"];

    var useAutoRange = true; // normally configurable
    var expectMinMax = graphData.includeMinMax;

    //Create the axes for dygraphs
    var axes = {};
    if (useAutoRange) {
      axes.y = {valueRange: null};
    } else {
      axes.y = {valueRange: [0, 40]};
    }
    axes.x = { drawGrid : !(graphData.chartType === 'bar')};

    //Create new graph instance
    if (!this.graph || recreateDygraph) {

      var graphCfg = {
        axes: axes,
        labels: labels,
        customBars: expectMinMax,
        showRangeSelector: true,
        plotter: (graphData.chartType === 'bar') ? barChartPlotter : null,
        includeZero: (graphData.chartType === 'bar'),
        interactionModel: Dygraph.Interaction.defaultModel,
        //clickCallback: $.proxy(this._onDyClickCallback, this),
        connectSeparatedPoints: false,
        dateWindow: [detailStartDateTm.getTime(), detailEndDateTm.getTime()],
        drawCallback: $.proxy(this._onDyDrawCallback, this),
        zoomCallback: $.proxy(this._onDyZoomCallback, this),
        digitsAfterDecimal: 2,
        labelsDivWidth: "275"
      };
      this.graph = new Dygraph(this.$graphCont.get(0), dyData, graphCfg);

      this._setupRangeMouseHandling();
      this._setupPanInteractionHandling();

      //Store this object instance on the graph itself so we can later reference it for endPan callback handling
      this.graph.demoPageInstance = this;

    }
    //Update existing graph instance
    else {
      var graphCfg = {
        customBars: expectMinMax,
        axes: axes,
        labels: labels,
        file: dyData,
        dateWindow: [detailStartDateTm.getTime(), detailEndDateTm.getTime()]
      };
      this.graph.updateOptions(graphCfg);
    }

  };

  JGS.Lineplot.prototype._onDyDrawCallback = function (dygraph, is_initial) {
//      console.log("_onDyDrawCallback");
//
//    //IE8 does not have new dates at time of callback, so use timer hack
//    if ($.support.cssFloat == false) { //IE<=8
//      setTimeout(function (evt) {
//        var axisX = dygraph.xAxisRange();
//        var axisXStartDateTm = new Date(axisX[0]);
//        var axisXEndDateTm = new Date(axisX[1]);
//
//        this.detailStartDateTm = axisXStartDateTm;
//        this.detailEndDateTm = axisXEndDateTm;
//      }, 250);
//      return;
//    }
//
//    var axisX = dygraph.xAxisRange();
//    var axisXStartDateTm = new Date(axisX[0]);
//    var axisXEndDateTm = new Date(axisX[1]);
//
//    this.detailStartDateTm = axisXStartDateTm;
//    this.detailEndDateTm = axisXEndDateTm;

  };

  /**
   * Dygraphs zoom callback handler
   *
   * @method _onDyZoomCallback
   * @private
   */
  JGS.Lineplot.prototype._onDyZoomCallback = function (minDate, maxDate, yRanges) {
    if (this.graph === null)
      return;

    this.detailStartDateTm = new Date(minDate);
    this.detailEndDateTm = new Date(maxDate);

    //When zoom reset via double-click, there is no mouse-up event in chrome (maybe a bug?),
    //so we initiate data load directly
    if (this.graph.isZoomed('x') === false) {
      this.$mouseUpEventEl.off("mouseup.jgs touchend.jgs"); //Cancel current event handler if any
      this._loadNewDetailData();
      return;
    }

    //Check if need to do IE8 workaround
    if ($.support.cssFloat == false) { //IE<=8
      // ie8 calls drawCallback with new dates before zoom. This example currently does not implement the
      // drawCallback, so this example might not work in IE8 currently. This next line _might_ solve, but will
      // result in duplicate loading when drawCallback is added back in.
      this._loadNewDetailData();
      return;
    }

    //The zoom callback is called when zooming via mouse drag on graph area, as well as when
    //dragging the range selector bars. We only want to initiate dataload when mouse-drag zooming. The mouse
    //up handler takes care of loading data when dragging range selector bars.
    var doDataLoad = !this.isRangeSelectorActive;
    if (doDataLoad === true) {
      this._loadNewDetailData();
    }


  };

  /**
   * Helper method for showing/hiding spin indicator. Uses spin.js, but this method could just as easily
   * use a simple "data is loading..." div.
   *
   * @method showSpinner
   */
  JGS.Lineplot.prototype.showSpinner = function (show) {
    if (show === true) {

      var target = this.$graphCont.get(0);

      if (this.spinner == null) {
        var opts = {
          lines: 13, // The number of lines to draw
          length: 7, // The length of each line
          width: 6, // The line thickness
          radius: 10, // The radius of the inner circle
          corners: 1, // Corner roundness (0..1)
          rotate: 0, // The rotation offset
          color: '#000', // #rgb or #rrggbb
          speed: 1, // Rounds per second
          trail: 60, // Afterglow percentage
          shadow: false, // Whether to render a shadow
          hwaccel: false, // Whether to use hardware acceleration
          className: 'spinner', // The CSS class to assign to the spinner
          zIndex: 2e9 // The z-index (defaults to 2000000000)
        };
        this.spinner = new Spinner(opts);
        this.spinner.spin(target);
        this.spinnerIsSpinning = true;
      } else {
        if (this.spinnerIsSpinning === false) { //else already spinning
          this.spinner.spin(target);
          this.spinnerIsSpinning = true;
        }
      }
    } else if (this.spinner != null && show === false) {
      this.spinner.stop();
      this.spinnerIsSpinning = false;
    }

  };

}(window.JGS = window.JGS || {}, jQuery));
