function createWorker(fn) {
    const js      = `(${fn.toString()})()`;
    const blob    = new Blob([js], { type: 'application/javascript' });
    const blobURL = URL.createObjectURL(blob);
    const worker  = new Worker(blobURL);

    URL.revokeObjectURL(blobURL);

    return worker;
}

export default createWorker;
