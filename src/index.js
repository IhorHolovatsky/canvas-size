import canvasWorker from './worker.js';
import createWorker from './create-worker.js';


// Constants & Variables
// =============================================================================
const defaults = {
    max  : null,
    min  : 1,
    sizes: [],
    step : 1024,
    // Callbacks
    onError  : Function.prototype,
    onSuccess: Function.prototype
};
const testSizes = {
    area: [
        // Chrome 70 (Mac, Win)
        // Chrome 68 (Android 4.4)
        // Edge 17 (Win)
        // Safari 7-12 (Mac)
        16384,
        // Chrome 68 (Android 7.1-9)
        14188,
        // Chrome 68 (Android 5),
        11402,
        // Chrome 68 (Android 6)
        10836,
        // Firefox 63 (Mac, Win)
        11180,
        // IE 9-11 (Win)
        8192,
        // IE Mobile (Windows Phone 8.x)
        // Safari (iOS 9 - 12)
        4096,
        // Failed
        defaults.min
    ],
    height: [
        // Safari 7-12 (Mac)
        // Safari (iOS 9-12)
        8388607,
        // Chrome ??
        65535,
        // Chrome 70 (Mac, Win)
        // Chrome 68 (Android 4.4-9)
        // Firefox 63 (Mac, Win)
        32767,
        // IE11
        // Edge 17 (Win)
        16384,
        // IE 9-10 (Win)
        8192,
        // IE Mobile (Windows Phone 8.x)
        4096,
        // Failed
        defaults.min
    ],
    width: [
        // Safari 7-12 (Mac)
        // Safari (iOS 9-12)
        4194303,
        // Chrome ??
        65535,
        // Chrome 70 (Mac, Win)
        // Chrome 68 (Android 4.4-9)
        // Firefox 63 (Mac, Win)
        32767,
        // IE11
        // Edge 17 (Win)
        16384,
        // IE 9-10 (Win)
        8192,
        // IE Mobile (Windows Phone 8.x)
        4096,
        // Failed
        defaults.min
    ]
};

// Web worker reference
let worker;

// Generate inline web worker
if (window && ('OffscreenCanvas' in window) && ('Worker' in window)) {
    worker = createWorker(canvasWorker);
    worker.onmessage = function(e) {
        const { job, width, height, isTestPass } = e.data;

        document.dispatchEvent(
            // Dispatch custom event
            new CustomEvent(job, {
                detail: {
                    width,
                    height,
                    isTestPass,
                    benchmark: (Date.now() - job) // milliseconds
                }
            })
        );
    };
}


// Functions (Private)
// =============================================================================
/**
 * Tests ability to read pixel data from a canvas at a specified dimension.
 *
 * @param {object} settings
 * @param {number} settings.width
 * @param {number} settings.height
 * @param {function} settings.onError
 * @param {function} settings.onSuccess
 */
function canvasTest(settings) {
    const { width, height } = settings;
    const fill = [width - 1, height - 1, 1, 1]; // x, y, width, height
    const job  = Date.now();

    // Web worker
    if (worker) {
        // Listen for custom job event
        document.addEventListener(job, function(e) {
            const { width, height, isTestPass, benchmark } = e.detail;

            if (isTestPass) {
                settings.onSuccess(width, height, benchmark);
            }
            else {
                settings.onError(width, height);
            }
        }, false);

        // Send canvas reference and test data to web worker
        worker.postMessage({
            job,
            width,
            height,
            fill
        });
    }
    else {
        try {
            const cvs = document.createElement('canvas');
            const ctx = cvs.getContext('2d');

            cvs.width = width;
            cvs.height = height;
            ctx.fillRect.apply(ctx, fill);

            // Verify image data (Pass = 255, Fail = 0)
            const isTestPass = Boolean(ctx.getImageData.apply(ctx, fill).data[3]);

            if (isTestPass) {
                const benchmark = Date.now() - job; // milliseconds

                settings.onSuccess(width, height, benchmark);
            }
            else {
                settings.onError(width, height);
            }
        }
        catch(e){
            settings.onError(width, height);
        }
    }
}

/**
 * Tests ability to read pixel data from canvas elements of various dimensions
 * by decreasing canvas height and/or width until a test succeeds.
 *
 * @param {object} settings
 * @param {number[][]} settings.sizes
 * @param {function} settings.onError
 * @param {function} settings.onSuccess
 */
function canvasTestLoop(settings) {
    const sizes  = settings.sizes.shift();
    const width  = sizes[0];
    const height = sizes[1];

    canvasTest({
        width,
        height,
        onError(width, height) {
            settings.onError(width, height);

            if (settings.sizes.length) {
                canvasTestLoop(settings);
            }
        },
        onSuccess: settings.onSuccess
    });
}

/**
 * Creates a 2d array of canvas dimensions either from the default testSizes
 * object or the width/height/min/step values provided.
 *
 * @param   {object} settings
 * @param   {number} settings.width
 * @param   {number} settings.height
 * @param   {number} settings.min
 * @param   {number} settings.step
 * @param   {number[][]} settings.sizes
 * @returns {number[][]}
 */
function createSizesArray(settings) {
    const isArea   = settings.width === settings.height;
    const isWidth  = settings.height === 1;
    const isHeight = settings.width === 1;
    const sizes    = [];

    // Use settings.sizes
    if (!settings.width || !settings.height) {
        settings.sizes.forEach(testSize => {
            const width  = isArea || isWidth ? testSize : 1;
            const height = isArea || isHeight ? testSize : 1;

            sizes.push([width, height]);
        });
    }
    // Generate sizes from width, height, and step
    else {
        const testMin  = settings.min || defaults.min;
        const testStep = settings.step || defaults.step;
        let   testSize = Math.max(settings.width, settings.height);

        while (testSize > testMin) {
            const width  = isArea || isWidth ? testSize : 1;
            const height = isArea || isHeight ? testSize : 1;

            sizes.push([width, height]);
            testSize -= testStep;
        }

        sizes.push([testMin, testMin]);
    }

    return sizes;
}


// Methods
// =============================================================================
const canvasSize = {
    /**
     * Determines maximum area of an HTML canvas element. When `max` is
     * unspecified, an optimized test will be performed using known maximum
     * values from a variety of browsers and platforms.
     *
     * @param {object} [options]
     * @param {number} [options.max]
     * @param {number} [options.min=1]
     * @param {number} [options.step=1024]
     * @param {function} [options.onError]
     * @param {function} [options.onSuccess]
     */
    maxArea(options = {}) {
        const sizes = createSizesArray({
            width : options.max,
            height: options.max,
            min   : options.min,
            step  : options.step,
            sizes : [...testSizes.area]
        });
        const settings = Object.assign({}, defaults, options, { sizes });

        canvasTestLoop(settings);
    },

    /**
     * Determines maximum height of an HTML canvas element. When `max` is
     * unspecified, an optimized test will be performed using known maximum
     * values from a variety of browsers and platforms.
     *
     * @param {object} [options]
     * @param {number} [options.max]
     * @param {number} [options.min=1]
     * @param {number} [options.step=1024]
     * @param {function} [options.onError]
     * @param {function} [options.onSuccess]
     */
    maxHeight(options = {}) {
        const sizes = createSizesArray({
            width : 1,
            height: options.max,
            min   : options.min,
            step  : options.step,
            sizes : [...testSizes.height]
        });
        const settings = Object.assign({}, defaults, options, { sizes });

        canvasTestLoop(settings);
    },

    /**
     * Determines maximum width of an HTML canvas element. When `max` is
     * unspecified, an optimized test will be performed using known maximum
     * values from a variety of browsers and platforms.
     *
     * @param {object} [options]
     * @param {number} [options.max]
     * @param {number} [options.min=1]
     * @param {number} [options.step=1024]
     * @param {function} [options.onError]
     * @param {function} [options.onSuccess]
     */
    maxWidth(options = {}) {
        const sizes = createSizesArray({
            width : options.max,
            height: 1,
            min   : options.min,
            step  : options.step,
            sizes : [...testSizes.width]
        });
        const settings = Object.assign({}, defaults, options, { sizes });

        canvasTestLoop(settings);
    },

    /**
     * Tests ability to read pixel data from canvas of specified dimension(s).
     *
     * @param {object} [options]
     * @param {number} [options.width]
     * @param {number} [options.height]
     * @param {number[][]} [options.sizes]
     * @param {function} [options.onError]
     * @param {function} [options.onSuccess]
     */
    test(options = {}) {
        const settings = Object.assign({}, defaults, options);

        if (settings.sizes.length) {
            settings.sizes = [...options.sizes];
            canvasTestLoop(settings);
        }
        else {
            canvasTest(settings);
        }
    }
};


// Exports
// =============================================================================
export default canvasSize;