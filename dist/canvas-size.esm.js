/*!
 * canvas-size
 * v1.0.4
 * https://github.com/jhildenbiddle/canvas-size
 * (c) 2015-2020 John Hildenbiddle <http://hildenbiddle.com>
 * MIT license
 */
function canvasWorker() {
    function canvasTest(settings) {
        var {job: job, width: width, height: height, fill: fill} = settings;
        var cvs = new OffscreenCanvas(width, height);
        var ctx = cvs.getContext("2d");
        ctx.fillRect.apply(ctx, fill);
        var isTestPass = Boolean(ctx.getImageData.apply(ctx, fill).data[3]);
        self.postMessage({
            job: job,
            width: width,
            height: height,
            isTestPass: isTestPass
        });
    }
    self.onmessage = function(e) {
        canvasTest(e.data);
    };
}

function createWorker(fn) {
    var js = "(".concat(fn.toString(), ")()");
    var blob = new Blob([ js ], {
        type: "application/javascript"
    });
    var blobURL = URL.createObjectURL(blob);
    var worker = new Worker(blobURL);
    URL.revokeObjectURL(blobURL);
    return worker;
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
    height: [ 8388607, 65535, 32767, 16384, 8192, 4096, defaults.min ],
    width: [ 4194303, 65535, 32767, 16384, 8192, 4096, defaults.min ]
};

var worker;

if (window && "OffscreenCanvas" in window && "Worker" in window) {
    worker = createWorker(canvasWorker);
    worker.onmessage = function(e) {
        var {job: job, width: width, height: height, isTestPass: isTestPass} = e.data;
        document.dispatchEvent(new CustomEvent(job, {
            detail: {
                width: width,
                height: height,
                isTestPass: isTestPass,
                benchmark: Date.now() - job
            }
        }));
    };
}

function canvasTest(settings) {
    var {width: width, height: height} = settings;
    var fill = [ width - 1, height - 1, 1, 1 ];
    var job = Date.now();
    if (worker) {
        document.addEventListener(job, (function(e) {
            var {width: width, height: height, isTestPass: isTestPass, benchmark: benchmark} = e.detail;
            if (isTestPass) {
                settings.onSuccess(width, height, benchmark);
            } else {
                settings.onError(width, height);
            }
        }), false);
        worker.postMessage({
            job: job,
            width: width,
            height: height,
            fill: fill
        });
    } else {
        try {
            var cvs = document.createElement("canvas");
            var ctx = cvs.getContext("2d");
            cvs.width = width;
            cvs.height = height;
            ctx.fillRect.apply(ctx, fill);
            var isTestPass = Boolean(ctx.getImageData.apply(ctx, fill).data[3]);
            if (isTestPass) {
                var benchmark = Date.now() - job;
                settings.onSuccess(width, height, benchmark);
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
    canvasTest({
        width: width,
        height: height,
        onError(width, height) {
            settings.onError(width, height);
            if (settings.sizes.length) {
                canvasTestLoop(settings);
            }
        },
        onSuccess: settings.onSuccess
    });
}

function createSizesArray(settings) {
    var isArea = settings.width === settings.height;
    var isWidth = settings.height === 1;
    var isHeight = settings.width === 1;
    var sizes = [];
    if (!settings.width || !settings.height) {
        settings.sizes.forEach(testSize => {
            var width = isArea || isWidth ? testSize : 1;
            var height = isArea || isHeight ? testSize : 1;
            sizes.push([ width, height ]);
        });
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
    maxArea() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        var sizes = createSizesArray({
            width: options.max,
            height: options.max,
            min: options.min,
            step: options.step,
            sizes: [ ...testSizes.area ]
        });
        var settings = Object.assign({}, defaults, options, {
            sizes: sizes
        });
        canvasTestLoop(settings);
    },
    maxHeight() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        var sizes = createSizesArray({
            width: 1,
            height: options.max,
            min: options.min,
            step: options.step,
            sizes: [ ...testSizes.height ]
        });
        var settings = Object.assign({}, defaults, options, {
            sizes: sizes
        });
        canvasTestLoop(settings);
    },
    maxWidth() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        var sizes = createSizesArray({
            width: options.max,
            height: 1,
            min: options.min,
            step: options.step,
            sizes: [ ...testSizes.width ]
        });
        var settings = Object.assign({}, defaults, options, {
            sizes: sizes
        });
        canvasTestLoop(settings);
    },
    test() {
        var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        var settings = Object.assign({}, defaults, options);
        if (settings.sizes.length) {
            settings.sizes = [ ...options.sizes ];
            canvasTestLoop(settings);
        } else {
            canvasTest(settings);
        }
    }
};

export default canvasSize;
//# sourceMappingURL=canvas-size.esm.js.map
