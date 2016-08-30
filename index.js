(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define([], factory);
  } else if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root["ArcInput"] = factory();
  }
}(this, function () {


  /**
   * UI Control to select an Arc.
   *
   * @param {String|DOMNode} container The node to add the ArcInput to.
   * @param {Object} [options] Optional options object
   * @constructor Create a new input.
   */
  function ArcInput(container, options) {

    var containerNode = typeof container === "string" ? document.getElementById(container) : container;
    this._listeners = {
      input: [],
      change: []
    };

    this._context = document.createElement("canvas").getContext("2d");
    this._context.canvas.style.position = "relative";
    this._context.canvas.style.left = 0;
    this._context.canvas.style.top = 0;
    containerNode.appendChild(this._context.canvas);

    this._minRadians = 0 * Math.PI / 180;
    this._maxRadians = 90 * Math.PI / 180;
    this._centerX = 0;
    this._centerY = 0;
    this._radius = 0;
    this._toMinX = 0;
    this._toMinY = 0;
    this._toMaxX = 0;
    this._toMaxY = 0;

    options = options || {};
    this._minDomainRadians = ((typeof options.minDegrees === "number") ? options.minDegrees : -90) * Math.PI / 180;
    this._maxDomainRadians = ((typeof options.maxDegrees === "number") ? options.maxDegrees : 90) * Math.PI / 180;
    this._circleStrokeStyle = options.circleStrokeStyle || "rgb(139,137,137)";
    this._circleLineWidth = options.circleLineWidth || 1;
    this._circleFillStyle = options.circleFillStyle || "rgba(255,255,255,0)";
    this._sectorStrokeStyle = options.sectorStrokeStyle || "rgb(139,137,137)";
    this._sectorLineWidth = options.sectorLineWidth || 2;
    this._sectorFillStyle = options.sectorFillStyle || "rgba(139,137,137, 0.4)";

    var self = this;
    this._frameHandle = -1;
    this._render = function () {
      self._frameHandle = -1;
      self._context.clearRect(0, 0, self._context.canvas.width, self._context.canvas.height);
      self._paint();
    };
    function cancel() {
      self._context.canvas.style.cursor = "default";
      self._down = false;
      self._emit("change", self);
    }

    this._context.canvas.addEventListener("mousemove", function updateOffset(event) {

      if (!(distanceSquared(event.offsetX, event.offsetY, self._centerX, self._centerY) <= Math.pow(self._radius, 2))) {//check if inside circle
        self._context.canvas.style.cursor = "default";
        return;
      }

      self._context.canvas.style.cursor = "pointer";
      if (!self._down) {
        return;
      }

      //calculate distance
      var distanceToMin = distanceToSegment(event.offsetX, event.offsetY, self._centerX, self._centerY, self._toMinX, self._toMinY);
      var distanceToMax = distanceToSegment(event.offsetX, event.offsetY, self._centerX, self._centerY, self._toMaxX, self._toMaxY);

      var angle = Math.atan2((event.offsetY - self._centerY), (event.offsetX - self._centerX));
      angle = Math.min(Math.max(self._minDomainRadians, angle), self._maxDomainRadians);
      if (distanceToMin < distanceToMax) {
        self._moveMin(angle);
      } else {
        self._moveMax(angle);
      }
      self._emit("input", self);


    });
    this._context.canvas.addEventListener("mousedown", function () {
      self._down = true;
    });
    this._context.canvas.addEventListener("mouseup", cancel);
    this._context.canvas.addEventListener("mouseout", cancel);
    window.addEventListener("resize", this.resize.bind(this));
    this.resize();

  }

  /**
   * Resize the control to fit to the parent container. Call this when the size of the containing node has changed.
   */
  ArcInput.prototype.resize = function () {
    this._context.canvas.width = this._context.canvas.parentElement.offsetWidth;
    this._context.canvas.height = this._context.canvas.parentElement.offsetHeight;
    this._invalidate();
  };

  /**
   * Listen to a UI event
   * @param {String} eventName Event to listen to. Use "input" to listen to all changes. Use "changed" to listen to the end of a change.
   * @param {Function} action A callback function, called when the event fires. This function accepts the instance that fires the event as its first argument.
   * @returns {{remove: remove}} handle. Call handle.remove() to stop listening to the event
   */
  ArcInput.prototype.on = function (eventName, action) {
    this._listeners[eventName].push(action);
    var self = this;
    return {
      remove: function () {
        var index = self._listeners[eventName].indexOf(action);
        if (index >= 0) {
          self._listeners[eventName].splice(index, 1);
        }
      }
    };
  };
  ArcInput.prototype.setMinDegrees = function (minDegrees) {
    this._moveMin(minDegrees * Math.PI / 180);
  };
  ArcInput.prototype.setMaxDegrees = function (minDegrees) {
    this._moveMax(minDegrees * Math.PI / 180);
  };
  ArcInput.prototype.getMinDegrees = function () {
    return this._minRadians * 180 / Math.PI;
  };

  ArcInput.prototype._wash = function () {
    this._centerX = this._context.canvas.width / 2;
    this._centerY = this._context.canvas.height / 2;
    this._radius = Math.min(this._context.canvas.width / 2, this._context.canvas.height / 2) - this._sectorLineWidth;
    this._toMinX = this._centerX + this._radius * Math.cos(this._minRadians);
    this._toMinY = this._centerY + this._radius * Math.sin(this._minRadians);
    this._toMaxX = this._centerX + this._radius * Math.cos(this._maxRadians);
    this._toMaxY = this._centerY + this._radius * Math.sin(this._maxRadians);

    this._toDomainMinX = this._centerX + this._radius * Math.cos(this._minDomainRadians);
    this._toDomainMinY = this._centerX + this._radius * Math.sin(this._maxDomainRadians);
    this._toDomainMaxX = this._centerX + this._radius * Math.cos(this._minDomainRadians);
    this._toDomainMaxY = this._centerX + this._radius * Math.sin(this._maxDomainRadians);
  };
  ArcInput.prototype._paint = function () {

    this._context.beginPath();
    this._context.arc(this._centerX, this._centerY, this._radius, 0, Math.PI * 2, false);
    this._context.strokeStyle = this._circleStrokeStyle;
    this._context.lineWidth = this._circleLineWidth;
    this._context.stroke();
    this._context.fillStyle = this._circleFillStyle;
    this._context.fill();


    this._context.beginPath();
    this._context.moveTo(this._centerX, this._centerY);
    this._context.lineTo(this._toMinX, this._toMinY);
    this._context.arc(this._centerX, this._centerY, this._radius, this._minRadians, this._maxRadians, false);
    this._context.lineTo(this._centerX, this._centerY);
    this._context.closePath();
    this._context.strokeStyle = this._sectorStrokeStyle;
    this._context.lineWidth = this._sectorLineWidth;
    this._context.stroke();
    this._context.fillStyle = this._sectorFillStyle;
    this._context.fill();

  };
  ArcInput.prototype._invalidate = function () {
    this._wash();
    if (this._frameHandle !== -1) {
      return;
    }
    this._frameHandle = requestAnimationFrame(this._render);
  };
  ArcInput.prototype._emit = function (eventName, value) {
    for (var i = 0; i < this._listeners[eventName].length; i += 1) {
      this._listeners[eventName][i](value);
    }
  };
  ArcInput.prototype._moveMin = function (minRadians) {
    this._minRadians = minRadians;
    this._invalidate();
  };
  ArcInput.prototype._moveMax = function (maxRadians) {
    this._maxRadians = maxRadians;
    this._invalidate();
  };


  ArcInput.prototype.getMaxDegrees = function () {
    return this._maxRadians * 180 / Math.PI;
  };

  function distanceSquared(vX, vY, wX, wY) {
    return Math.pow(vX - wX, 2) + Math.pow(vY - wY, 2)
  }

  function distanceToSegment(pointX, pointY, segmentFromX, segmentFromY, segmentToX, segmentToY) {
    //Adapted from http://stackoverflow.com/questions/849211/shortest-distance-between-a-point-and-a-line-segment, 8/29/2016
    var segmentLength = distanceSquared(segmentFromX, segmentFromY, segmentToX, segmentToY);
    if (segmentLength === 0) {
      return Math.sqrt(distanceSquared(pointX, pointY, segmentFromX, segmentFromY));
    }

    var t = ((pointX - segmentFromX) * (segmentToX - segmentFromX) + (pointY - segmentFromY) * (segmentToY - segmentFromY)) / segmentLength;
    t = Math.max(0, Math.min(1, t));
    return Math.sqrt(distanceSquared(pointX, pointY, segmentFromX + t * (segmentToX - segmentFromX), segmentFromY + t * (segmentToY - segmentFromY)));
  }

  return ArcInput;

}));