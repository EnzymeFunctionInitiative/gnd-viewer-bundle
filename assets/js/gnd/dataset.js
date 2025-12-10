import Constants from './constants.js';

/**
 * GndDataset is responsible for managing data requests and dispatching events when new data is
 * retrieved.  A new dataset object is created for each query.
 */
export default class GndDataset {
    /**
     * Creates an instance of the GND dataset management class.
     * @param {string} metadataApiUrl - URL for retrieving metadata (e.g. total record count for the query)
     * @param {string} recordApiUrl - URL for retrieving records
     * @param {int} jobId - job ID
     * @param {string} jobKey - job key (UUID)
     * @param {object} retrievalParams - parameters used for retrieval (windowSize, setSize, batchSize)
     */
    constructor(metadataApiUrl, recordApiUrl, jobId, jobKey, retrievalParams) {
        this.metadataApiUrl = metadataApiUrl;
        this.recordApiUrl = recordApiUrl;
        this.jobId = jobId;
        this.jobKey = jobKey;

        this.query = retrievalParams?.query ?? '';
        this.requestedUnirefId = retrievalParams?.requestedUnirefId ?? '';
        this.databaseSequenceVersion = retrievalParams?.databaseSequenceVersion ?? Constants.UNIPROT;

        // Metadata retrieved for the given user search input
        this.metadata = {};
        this.scaleFactor = 0;
        this.windowSize = retrievalParams?.windowSize ?? Constants.DEFAULT_WINDOW_SIZE;

        this.requestedSequenceVersion = retrievalParams?.requestedSequenceVersion ?? 'uniprot';

        // Terminology:
        //     record - one line in the GND
        //     set - group of records that is retrieved in one request (usually 20 records)
        //     batch - group of sets that are retrieved in one user load request (usually 200 records)

        // The number of records to retrieve in a given query.
        this.setSize = retrievalParams?.setSize ?? Constants.DEFAULT_SET_SIZE;

        // The maximum number of sets that can be retrieved in a batch.  In a standard config this
        // is 10 (10 sets of 20 records == 200 records).
        this.batchSize = retrievalParams?.batchSize ?? Constants.DEFAULT_BATCH_SIZE;

        // Current position in the retrieval block list
        this.currentPosition = 0;

        // The last number in the retrieval block list for the current batch (for example, if there
        // are 25 requestRanges and batchSize is 20, then endPosition is 10 for the first
        // retrieval, then 20 for the second retrieval).
        this.endPosition = 0;

        this.requestRanges = new Map();

        // Sets the end of the position when the batch retrieval has completed (this.endPosition)
        this.resetFetchPosition();
    }

    setWindowSize(newWindowSize) {
        this.windowSize = newWindowSize;
    }

    /**
     * This is called at the start of a 'Show More' or 'Show All' request in the UI.  The purpose
     * is for updating the progress bar.
     * @param {bool} ignoreMaxLimit - set to true for 'Show All', false for 'Show More'
     */
    resetFetchPosition(ignoreMaxLimit) {
        this.startPosition = this.currentPosition;
        if (ignoreMaxLimit) {
            this.endPosition = this.requestRanges.size;
        } else {
            this.endPosition = this.currentPosition + this.batchSize;
            if (this.endPosition > this.requestRanges.size) {
                this.endPosition = this.requestRanges.size;
            }
        }
    }

    addQueryToParams(params) {
        if (this.requestedUnirefId) {
            params.set('uniref-id', this.requestedUnirefId);
        } else {
            params.set('query', this.query);
        }
    }

    // Initial query to get total count and other metadata
    async fetchMetadata() {
        const params = new URLSearchParams();
        params.set('id', this.jobId);
        params.set('key', this.jobKey);
        params.set('window', this.windowSize);
        this.addQueryToParams(params);

        if (this.requestedSequenceVersion !== 'uniprot') {
            params.set('seq-ver', this.requestedSequenceVersion);
        }

        const queryString = params.toString();
        const url = `${this.metadataApiUrl}?${queryString}`;

        console.log(`Fetching metadata from ${url}`);

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch metadata');
        }

        this.metadata = await response.json();

        const totalRecords = this.metadata.extent.stats.total_records;
        this.scaleFactor = this.metadata.extent.stats.scale_factor ?? Constants.UNSPECIFIED;

        // The request, returned, and useUniref logic is as follows:
        //     1. If GND is UniRef50:
        //        a. If the user requests a cluster/ID, it will return UniRef50 IDs:
        //              useUniref = true
        //              requestedSequenceVersion = Constants.UNIREF50
        //              returnedSequenceVersion = Constants.UNIREF50
        //              'query' request param is set
        //              'uniref-id' is not set
        //        b. If the user clicks on a UniRef50 ID to open the contents of the UniRef
        //           cluster in a new window, the IDs returned are the UniRef90 ID clusters in
        //           the UniRef50 ID:
        //              useUniref = true
        //              requestedSequenceVersion = Constants.UNIREF50
        //              returnedSequenceVersion = Constants.UNIREF90
        //              'query' request param is not set
        //              'uniref-id' is set to the UniRef50 ID
        //        c. If the user is already looking at the contents of a UniRef50 cluster and
        //           clicks on a UniRef90 ID to view the contents of the UniRef90 cluster in a
        //           new window, the IDs
        //           returned are the UniProt IDs in the UniRef90 cluster:
        //              useUniref = false
        //              requestedSequenceVersion = Constants.UNIREF90
        //              returnedSequenceVersion = Constants.UNIPROT
        //              'query' request param is not set
        //              'uniref-id' is set to the UniRef90 ID
        //     2. If the GND is UniRef90:
        //        a. If the user requests a cluster/ID, it will return UniRef90 IDs:
        //              useUniref = true
        //              requestedSequenceVersion = Constants.UNIREF90
        //              returnedSequenceVersion = Constants.UNIREF90
        //              'query' request param is set
        //              'uniref-id' is not set
        //        b. If the user clicks on a UniRef90 ID to open the contents of the UniRef90
        //           cluster in a new window, the IDs that are returned are the UniProt IDs that
        //           are in the UniRef90 cluster:
        //              useUniref = false
        //              requestedSequenceVersion = Constants.UNIREF90
        //              returnedSequenceVersion = Constants.UNIPROT
        //              'query' request param is not set
        //              'uniref-id' is set to the UniRef90 ID
        //     3. Otherwise always request UniProt:
        //              useUniref = false
        //              requestedSequenceVersion = Constants.UNIPROT
        //              returnedSequenceVersion = Constants.UNIPROT
        //              'query' request param is set
        //              'uniref-id' is not set

        this.requestRanges = this.splitRequestRange(this.metadata.extent.stats.index_range);

        return {
            totalRecords: totalRecords,
            scaleFactor: this.scaleFactor,
        };
    }

    /**
     * Split up the index range into ranges that can be used for requests.  The index_range
     * parameter may specify not just a start,stop but can be multiple pairs of start,stop or
     * even single indices.  For example:
     *     [[0, 57], [71, 71], [93, 102]]
     * (representing GNDs 0 to 59, 71, and 93 to 102.
     * We split this parameter into chunks that are passed to the
     * API for retrieval.  In the aforementioned example, given a this.setSize of 20, the return
     * value of this function would be a Map with the keys being the request position and the
     * values being arrays, for example:
     *     [0 => [0, 19], 1 => [20, 39], 2 => [[40, 57], [71, 71], [93, 93]], 3 => [94, 102]]
     * Notice that an element of the set may contain an array of arrays (as in the third element
     * above), to account for irregularities in the spacing of the GND indices.
     */
    splitRequestRange(indexRange) {
        const requestRanges = new Map();
        let blockIndex = 0;

        const addBlock = (block) => {
            if (block.length > 0) {
                requestRanges.set(blockIndex, block);
                blockIndex++;
            }
        };

        let currentBlock = [];
        let currentBlockSize = 0;
        for (const range of indexRange) {
            let currentRangeStart = range[0];
            let currentRangeEnd = range[1];
            let currentRangeSize = currentRangeEnd - currentRangeStart + 1;

            while (currentBlockSize + currentRangeSize > this.setSize) {
                // Determine the number of items that need to be added to the block
                const fillSize = this.setSize - currentBlockSize;

                // End of the sub range that will be added to the block
                const subRangeEnd = currentRangeStart + fillSize - 1;

                currentBlock.push([currentRangeStart, subRangeEnd]);
                addBlock(currentBlock);

                // Reset everything because the currentBlock is full
                currentBlock = [];
                currentBlockSize = 0;

                // New range indices
                currentRangeStart = subRangeEnd + 1;
                currentRangeSize = currentRangeEnd - currentRangeStart + 1;
            }

            // Add the remainder of the range to the block
            currentBlock.push([currentRangeStart, currentRangeEnd]);
            currentBlockSize += currentRangeSize;

            // If the block is exactly the setSize then add it
            if (currentBlockSize === this.setSize) {
                addBlock(currentBlock);
                currentBlock = [];
                currentBlockSize = 0;
            }
        }

        // Add any remaining block
        if (currentBlockSize > 0) {
            addBlock(currentBlock);
        }

	    return requestRanges;
    }

    /**
     * Fetches the next set of diagrams from the API.  A set is list of diagrams that are retrieved
     * in one HTTP query, and the size of this is typically 20 diagrams.
     * @returns {object} object with new diagrams and percent complete from the entire batch
     */
    async fetchNextSet() {

        const range = this.requestRanges.get(this.currentPosition);
        this.currentPosition++;

        const params = new URLSearchParams();
        params.set('id', this.jobId);
        params.set('key', this.jobKey);
        this.addQueryToParams(params);

        const rangeStr = range.map((r) => r.join('-')).join(',');
        params.set('range', rangeStr);

        if (this.scaleFactor !== Constants.UNSPECIFIED) {
            params.set('scale-factor', this.scaleFactor);
        }

        if (this.windowSize !== Constants.UNSPECIFIED) {
            params.set('window', this.windowSize);
        }

        if (this.requestedSequenceVersion !== 'uniprot') {
            params.set('seq-ver', this.requestedSequenceVersion);
        }

        const queryString = params.toString();
        const url = `${this.recordApiUrl}?${queryString}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch data batch');
        }

        const responseData = await response.json();

        const percentCompleted = 100 * (this.currentPosition - this.startPosition) / (this.endPosition - this.startPosition);
        const setData = {
            rawDiagramSet: responseData,
            percentCompleted: percentCompleted,
            numDiagrams: responseData.counts.max,
        };

        // Return only the new batch for rendering
        return setData;
    }

    /**
     * Checks if there are any more records to fetch.
     * @param {bool} ignoreMaxLimit - set to true for 'Show All', false for 'Show More'
     * @return {bool} true if there are still records to retrieve, false otherwise
     */
    hasMoreRecordsToFetch(ignoreMaxLimit) {
        const hasRemaining = this.currentPosition < this.requestRanges.size;
        if (ignoreMaxLimit) {
            return hasRemaining;
        }

        return hasRemaining && this.currentPosition < this.endPosition;
    }
}

