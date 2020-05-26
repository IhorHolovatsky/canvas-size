/* istanbul ignore next */
export default function() {
    function workerCanvasTest(settings) {
        const { job, cvs, width, height, fill } = settings;
        const ctx = cvs.getContext('2d');

        ctx.fillRect.apply(ctx, fill);
        self.postMessage({
            job,
            width,
            height,
            // Verify image data (Pass = 255, Fail = 0)
            result: Boolean(ctx.getImageData.apply(ctx, fill).data[3])
        });
    }

    self.onmessage = function(e) {
        workerCanvasTest(e.data);
    };
}
