console.warn("Version 2.0 is outdated. Please upgrade to version 3.0:\nhttps://github.com/amcharts/amcharts3-react/blob/master/documentation/Migrating%20to%203.0.md#migrating-to-amcharts-react-plugin-30");

(function () {
  function getType(x) {
    // TODO make this faster ?
    return {}.toString.call(x);
  }

  function hasOwnKey(obj, key) {
    return {}.hasOwnProperty.call(obj, key);
  }


  function copyObject(x) {
    var output = {};

    // TODO use Object.keys ?
    for (var key in x) {
      if (hasOwnKey(x, key)) {
        output[key] = copy(x[key]);
      }
    }

    return output;
  }

  function copyArray(x) {
    var length = x.length;

    var output = new Array(length);

    for (var i = 0; i < length; ++i) {
      output[i] = copy(x[i]);
    }

    return output;
  }

  // TODO can this be made faster ?
  // TODO what about regexps, etc. ?
  function copy(x) {
    switch (getType(x)) {
    case "[object Array]":
      return copyArray(x);

    case "[object Object]":
      return copyObject(x);

    // TODO is this necessary ?
    case "[object Date]":
      return new Date(x.getTime());

    default:
      return x;
    }
  }


  function isNaN(x) {
    return x !== x;
  }

  function isNumberEqual(x, y) {
    return x === y || (isNaN(x) && isNaN(y));
  }


  function removeChartListeners(chart, x, y) {
    if (x !== y) {
      // TODO is this necessary ?
      if (x == null) {
        x = [];
      }

      // TODO is this necessary ?
      if (y == null) {
        y = [];
      }

      var xLength = x.length;
      var yLength = y.length;

      for (var i = 0; i < xLength; ++i) {
        var xValue = x[i];

        var has = false;

        // TODO make this faster ?
        for (var j = 0; j < yLength; ++j) {
          var yValue = y[j];

          // TODO is this correct ?
          if (xValue.event  === yValue.event &&
              xValue.method === yValue.method) {
            has = true;
            break;
          }
        }

        if (!has) {
          // TODO is this correct ?
          chart.removeListener(chart, xValue.event, xValue.method);
        }
      }
    }
  }


  function updateArray(a, x, y) {
    var didUpdate = false;

    if (x !== y) {
      var xLength = x.length;
      var yLength = y.length;

      if (xLength !== yLength) {
        a.length = yLength;
        didUpdate = true;
      }

      for (var i = 0; i < yLength; ++i) {
        if (i < xLength) {
          if (update(a, i, x[i], y[i])) {
            didUpdate = true;
          }

        } else {
          // TODO make this faster ?
          a[i] = copy(y[i]);
          // TODO is this necessary ?
          didUpdate = true;
        }
      }
    }

    return didUpdate;
  }


  function update(obj, key, x, y) {
    var didUpdate = false;

    if (x !== y) {
      // https://github.com/amcharts/amcharts3-react/issues/40
      if (hasOwnKey(obj, key)) {
        var xType = getType(x);
        var yType = getType(y);

        if (xType === yType) {
          switch (xType) {
          case "[object Array]":
            // TODO hacky, remove this after the following bug is fixed:
            //      Zendesk #28040
            //      https://codepen.io/team/amcharts/pen/0d61f559cda74682c0ca55d9a24a0f77
            //      https://www.amcharts.com/kbase/forcing-grouping-stock-chart-data-specific-periods/
            if (key === "groupToPeriods") {
              // TODO is the copy necessary ?
              obj[key] = copy(y);
              didUpdate = true;

            } else {
              if (updateArray(obj[key], x, y)) {
                didUpdate = true;
              }
            }
            break;

          case "[object Object]":
            if (updateObject(obj[key], x, y)) {
              didUpdate = true;
            }
            break;

          case "[object Date]":
            if (x.getTime() !== y.getTime()) {
              // TODO make this faster ?
              obj[key] = copy(y);
              didUpdate = true;
            }
            break;

          case "[object Number]":
            if (!isNumberEqual(x, y)) {
              // TODO is the copy necessary ?
              obj[key] = copy(y);
              didUpdate = true;
            }
            break;

          default:
            // TODO is the copy necessary ?
            obj[key] = copy(y);
            didUpdate = true;
            break;
          }

        // TODO is this correct ?
        } else {
          // TODO make this faster ?
          obj[key] = copy(y);
          didUpdate = true;
        }
      }
    }

    return didUpdate;
  }

  function updateObject(chart, oldObj, newObj) {
    var didUpdate = false;

    if (oldObj !== newObj) {
      // TODO use Object.keys ?
      for (var key in newObj) {
        if (hasOwnKey(newObj, key)) {
          // TODO make this faster ?
          if (hasOwnKey(oldObj, key)) {
            // TODO should this count as an update ?
            if (key === "listeners") {
              // TODO make this faster ?
              removeChartListeners(chart, oldObj[key], newObj[key]);
            }

            if (update(chart, key, oldObj[key], newObj[key])) {
              didUpdate = true;
            }

          } else {
            // TODO make this faster ?
            chart[key] = copy(newObj[key]);
            didUpdate = true;
          }
        }
      }

      // TODO use Object.keys ?
      for (var key in oldObj) {
        if (hasOwnKey(oldObj, key) && !hasOwnKey(newObj, key)) {
          if (key === "listeners") {
            removeChartListeners(chart, oldObj[key], []);
          }

          delete chart[key];
          didUpdate = true;
        }
      }
    }

    return didUpdate;
  }


  var id = 0;

  AmCharts.React = createReactClass({
    getInitialState: function () {
      return {
        id: "__AmCharts_React_" + (++id) + "__",
      };
    },

    componentDidMount: function () {
      // AmCharts mutates the config object, so we have to make a deep copy to prevent that
      var props = copy(this.props);
      this.chart = AmCharts.makeChart(ReactDOM.findDOMNode(this.ref), props);
    },

    // TODO is this correct ? should this use componentWillUpdate instead ?
    componentDidUpdate: function (oldProps) {
      var didUpdate = updateObject(this.chart, oldProps, this.props);
      var keepState = this.props.keepState;
      // TODO make this faster
      try {
        if (didUpdate) {
          if (keepState) {
            if (this.chart) {
              this.chart.validateNow(true);
            }
          } else {
            if (this.chart) {
              this.chart.validateData();
            }
          }
        }
      } catch(e) {
        console.error(e);
      }
    },

    componentWillUnmount: function () {
      try {
        if (this.chart) {
          this.chart.clear();
        } catch(e){
          console.error(e);
        }
      }
    },

    render: function () {
      var _this = this;
      return React.createElement("div", {
        id: this.state.id,
        ref: function ref(_ref) {
          return _this.ref = _ref;
        },
        style: {
          width: this.props.width || "100%",
          height: this.props.height || "100%"
        }
      });
    }
  });
})();
