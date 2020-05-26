/*!
 * canvas-size
 * v1.0.4
 * https://github.com/jhildenbiddle/canvas-size
 * (c) 2015-2020 John Hildenbiddle <http://hildenbiddle.com>
 * MIT license
 */
(function(global, factory) {
    typeof exports === "object" && typeof module !== "undefined" ? module.exports = factory() : typeof define === "function" && define.amd ? define(factory) : (global = global || self, 
    global.canvasSize = factory());
})(this, (function() {
    "use strict";
    function _extends() {
        _extends = Object.assign || function(target) {
            for (var i = 1; i < arguments.length; i++) {
                var source = arguments[i];
                for (var key in source) {
                    if (Object.prototype.hasOwnProperty.call(source, key)) {
                        target[key] = source[key];
                    }
                }
            }
            return target;
        };
        return _extends.apply(this, arguments);
    }
    function _toConsumableArray(arr) {
        return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
    }
    function _arrayWithoutHoles(arr) {
        if (Array.isArray(arr)) return _arrayLikeToArray(arr);
    }
    function _iterableToArray(iter) {
        if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter);
    }
    function _unsupportedIterableToArray(o, minLen) {
        if (!o) return;
        if (typeof o === "string") return _arrayLikeToArray(o, minLen);
        var n = Object.prototype.toString.call(o).slice(8, -1);
        if (n === "Object" && o.constructor) n = o.constructor.name;
        if (n === "Map" || n === "Set") return Array.from(o);
        if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
    }
    function _arrayLikeToArray(arr, len) {
        if (len == null || len > arr.length) len = arr.length;
        for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
        return arr2;
    }
    function _nonIterableSpread() {
        throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }
    function canvasWorker() {
        function workerCanvasTest(settings) {
            var job = settings.job, cvs = settings.cvs, width = settings.width, height = settings.height, fill = settings.fill;
            var ctx = cvs.getContext("2d");
            ctx.fillRect.apply(ctx, fill);
            self.postMessage({
                job: job,
                width: width,
                height: height,
                result: Boolean(ctx.getImageData.apply(ctx, fill).data[3])
            });
        }
        self.onmessage = function(e) {
            workerCanvasTest(e.data);
        };
    }
    var defaults = {
        max: null,
        min: 1,
        sizes: [],
        step: 1024,
        onError: Function.prototype,
        onSuccess: Function.prototype
    };
    var testSizes = {
        area: [ 16384, 14188, 11402, 10836, 11180, 8192, 4096, defaults.min ],
        height: [ 8388607, 32767, 16384, 8192, 4096, defaults.min ],
        width: [ 4194303, 32767, 16384, 8192, 4096, defaults.min ]
    };
    var worker;
    if (window && "OffscreenCanvas" in window && "Worker" in window) {
        var createWorker = function createWorker(fn) {
            var js = "(".concat(fn.toString(), ")()");
            var blob = new Blob([ js ], {
                type: "application/javascript"
            });
            var blobURL = URL.createObjectURL(blob);
            var worker = new Worker(blobURL);
            URL.revokeObjectURL(blobURL);
            return worker;
        };
        worker = createWorker(canvasWorker);
        worker.onmessage = function(e) {
            console.log("Done (Worker)", e.data);
            var _e$data = e.data, width = _e$data.width, height = _e$data.height, job = _e$data.job, result = _e$data.result;
            document.dispatchEvent(new CustomEvent(job, {
                detail: {
                    height: height,
                    width: width,
                    result: result
                }
            }));
        };
    }
    function canvasTest(settings) {
        var width = settings.width, height = settings.height;
        var w = 1;
        var h = 1;
        var x = width - 1;
        var y = height - 1;
        if (worker) {
            console.log("Worker");
            var cvs = new OffscreenCanvas(width, height);
            var job = Date.now();
            document.addEventListener(job, (function(e) {
                console.log("Done (Listener)", e.detail);
                var _e$detail = e.detail, width = _e$detail.width, height = _e$detail.height, result = _e$detail.result;
                if (result) {
                    settings.onSuccess(width, height);
                } else {
                    settings.onError(width, height);
                }
            }), false);
            worker.postMessage({
                cvs: cvs,
                fill: [ x, y, w, h ],
                height: height,
                job: job,
                width: width
            }, [ cvs ]);
        } else {
            try {
                console.log("Non-Worker");
                var _cvs = document.createElement("canvas");
                var ctx = _cvs.getContext("2d");
                _cvs.width = width;
                _cvs.height = height;
                ctx.fillRect(x, y, w, h);
                if (ctx.getImageData(x, y, w, h).data[3]) {
                    settings.onSuccess(width, height);
                } else {
                    settings.onError(width, height);
                }
            } catch (e) {
                settings.onError(width, height);
            }
        }
    }
    function canvasTestLoop(settings) {
        var sizes = settings.sizes.shift();
        var width = sizes[0];
        var height = sizes[1];
        var testPass = canvasTest(width);
        if (testPass) {
            settings.onSuccess(width, height);
        } else {
            settings.onError(width, height);
            if (settings.sizes.length) {
                setTimeout((function() {
                    canvasTestLoop(settings);
                }), 0);
            }
        }
    }
    function createSizesArray(settings) {
        var isArea = settings.width === settings.height;
        var isWidth = settings.height === 1;
        var isHeight = settings.width === 1;
        var sizes = [];
        if (!settings.width || !settings.height) {
            settings.sizes.forEach((function(testSize) {
                var width = isArea || isWidth ? testSize : 1;
                var height = isArea || isHeight ? testSize : 1;
                sizes.push([ width, height ]);
            }));
        } else {
            var testMin = settings.min || defaults.min;
            var testStep = settings.step || defaults.step;
            var testSize = Math.max(settings.width, settings.height);
            while (testSize > testMin) {
                var width = isArea || isWidth ? testSize : 1;
                var height = isArea || isHeight ? testSize : 1;
                sizes.push([ width, height ]);
                testSize -= testStep;
            }
            sizes.push([ testMin, testMin ]);
        }
        return sizes;
    }
    var canvasSize = {
        maxArea: function maxArea() {
            var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
            var sizes = createSizesArray({
                width: options.max,
                height: options.max,
                min: options.min,
                step: options.step,
                sizes: _toConsumableArray(testSizes.area)
            });
            var settings = _extends({}, defaults, options, {
                sizes: sizes
            });
            canvasTestLoop(settings);
        },
        maxHeight: function maxHeight() {
            var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
            var sizes = createSizesArray({
                width: 1,
                height: options.max,
                min: options.min,
                step: options.step,
                sizes: _toConsumableArray(testSizes.height)
            });
            var settings = _extends({}, defaults, options, {
                sizes: sizes
            });
            canvasTestLoop(settings);
        },
        maxWidth: function maxWidth() {
            var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
            var sizes = createSizesArray({
                width: options.max,
                height: 1,
                min: options.min,
                step: options.step,
                sizes: _toConsumableArray(testSizes.width)
            });
            var settings = _extends({}, defaults, options, {
                sizes: sizes
            });
            canvasTestLoop(settings);
        },
        test: function test() {
            var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
            var settings = _extends({}, defaults, options);
            if (settings.sizes.length) {
                settings.sizes = _toConsumableArray(options.sizes);
                canvasTestLoop(settings);
            } else {
                var testPass = canvasTest(settings);
                return testPass;
            }
        }
    };
    return canvasSize;
}));
//# sourceMappingURL=canvas-size.js.map
