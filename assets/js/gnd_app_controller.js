import { Controller } from '@hotwired/stimulus';
import GndDataset from './gnd/dataset.js';
import GndColor from './gnd/color.js';
import GndDiagramStore from './gnd/data.js';
import Constants from './gnd/constants.js';
import Util from './gnd/util.js';

// The data loader controller is responsible for fetching data from the backend as well
// as handling retrieval events (e.g. search and retrieval buttons) and updating the
// progress bar, error message, and loading overlay.  It publishes data availability
// events and listens for data update events (from search, retrieval, or window).  It
// contains data structures for number of sequences, metadata, indexes, etc.,
//
// The canvas controller is responsible for drawing elements and keeps metadata such as
// family and swissprot annotation.  It listens for data availability events and filter
// update events.
//
// The filter controller provides a UI for filtering by swissprot and family, provides
// a search box for finding families, and dispatches events to the canvas controller
// when filters are updated.
//
// The window controller is responsible for processing click events when the user wishes
// to update the genome display window.  It dispatches events to the data loader
// controller.
//
// There needs to be the following:
//
// 1. Data structure that represents data update events (contains window size, search
//    keyword, retrieval index).  Not all need to be filled.  For example, if the
//    window controller dispatches an event, it only needs to fill in the window size.
//    The data loader controller will use it's current state to fill in the rest.
//
// 2. Data structure that represents a family.  This contains a list of SVG element IDs
//    so that the canvas can be rapidly updated.  The data structure will be stored in
//    an a-array for rapid retrieval.  There will also be a searchable data structure
//    that allows user to type in family IDs or family descriptions to restrict the
//    number of checkboxes in the filter.
//
// 3. Each diagram will have an event handler that dispatches an event to the filter
//    controller, which then applies family filter for the currently-selected diagram.
//
export default class GndAppController extends Controller {
    static targets = [
        'footerActions',
        'footerMessage',
        'footerHighlightCount',
        'footerProgressContainer',
        'footerProgressBar',
        'metadataContainer',
        'geneWindowContainer',
        'searchFormContainer',
    ];

    static values = {
        appConfig: Object,
        geneWindowId: String,
        searchFormId: String,
    };

    dataset = null;

    // Indicates which loading mode we're in ('Show more' => 'more', 'Show all' => 'all'). 
    // The 'idle' state prevents multiple loads at once
    loadingMode = 'idle';

    connect() {
        this.colorService = new GndColor();
        // diagramStore - Diagram parsing and representation
        this.diagramStore = new GndDiagramStore(this.colorService);
        this.numGndsRetrieved = 0;
        this.numBatchesRetrieved = 0;

        this.config = this.parseOptions(this.appConfigValue);

        setTimeout(() => {
            this.initializeOutlets();
        }, 1);
    }

    initializeOutlets() {
        this.geneWindowOutlet = Util.findController(
            this.application,
            this.geneWindowIdValue,
            'enzymefunctioninitiative--gnd-viewer-bundle--gnd-gene-window'
        );

        this.searchFormOutlet = Util.findController(
            this.application,
            this.searchFormIdValue,
            'enzymefunctioninitiative--gnd-viewer-bundle--gnd-search-form'
        );

        if (this.geneWindowOutlet) {
            this.checkForImmediateSearch();
        }
    }

    parseOptions(options) {
        const config = {
            ...options,
            api: { ...options.api },
            sequence: { ...options.sequence },
            search: { ...options.search }
        };
        const seqVersion = this.getDatabaseSequenceVersion(options.sequence.databaseVersion);
        config.sequence.databaseVersion = seqVersion;
        config.sequence.versionLabel = document.getElementById('base-sequence-version');
        return config;
    }

    disconnect() {
    }

    // Wait until the gene window controller is connected before doing an automatic search
    checkForImmediateSearch() {
        if (!this.config.sequence.unirefId.length && !this.config.search.clusterOnLoad)
            return;

        const retrievalParams = this.getDefaultRetrievalParams();
        this.updateRetrievalParamsQuery(retrievalParams);

        this.performSearch(retrievalParams);
        this.loadingMode = 'more';
        this.enterLoadingState();
        this.retrieveAndRenderNextSet();
    }

    showMore(event) {
        // Prevent 'Show more' from being clicked while 'Show all' is running
        if (this.loadingMode !== 'idle')
            return;
        this.loadingMode = 'more';

        this.enterLoadingState();

        this.dataset.resetFetchPosition(false);
        this.retrieveAndRenderNextSet();
    }

    showAll() {
        // Prevent 'Show all' from being clicked while 'Show more' is running
        if (this.loadingMode !== 'idle')
            return;
        this.loadingMode = 'all';

        this.enterLoadingState();

        this.dataset.resetFetchPosition(true);
        this.retrieveAndRenderNextSet();
    }

    geneGraphicsExportStatus({ detail: { exportStatus } }) {
        if (exportStatus === 'start') {
            this.enterLoadingState();
        } else {
            this.handleFooterUpdate('Finished exporting Gene Graphics.', ['text-muted'], 'text-muted');
        }
    }

    async loadFromSearch({ detail: { query, sequenceVersion } }) {
        // If we are doing a brand new search initiated by the search form, then reset the batch size
        this.numBatchesRetrieved = 0;

        const retrievalParams = this.getDefaultRetrievalParams();
        retrievalParams.requestedSequenceVersion = sequenceVersion;
        retrievalParams.query = query;

        await this.performSearch(retrievalParams);

        if (this.config.sequence.databaseVersion !== Constants.UNIPROT) {
            let versionLabel = 'UniProt';
            if (sequenceVersion === Constants.UNIREF50) {
                versionLabel = 'UniRef50';
            } else if (sequenceVersion === Constants.UNIREF90) {
                versionLabel = 'UniRef90';
            }
            if (this.config.sequence.versionLabel) {
                this.config.sequence.versionLabel.innerHTML = `(${versionLabel} IDs)`;
            }
        }
    }

    async performSearch(retrievalParams) {
        // Dataset is used to perform actual retrieval and parsing
        this.dataset = new GndDataset(this.config.api, this.config.jobId, this.config.jobKey, retrievalParams);

        this.enterLoadingState();

        // Get the extents of the search (e.g. indices)
        let metadata = null;
        try {
            metadata = await this.dataset.fetchMetadata();
        } catch (error) {
            console.log('Error fetching metadata: ' + error);
            this.handleError();
            return;
        }

        this.totalRecords = metadata.totalRecords;

        // Start the retrieval process
        if (this.totalRecords === 0) {
            this.handleInvalidQuery();
        } else {
            for (const child of this.footerActionsTarget.children) {
                child.disabled = false;
            }
            this.showMore();
        }

        // Reset the counts
        this.numGndsRetrieved = 0;
        this.numBatchesRetrieved = 0;

        let unirefVersion = Constants.UNIPROT;
        let childUnirefVersion = Constants.UNIPROT;
        let useUniref = false;
        const seqVer = retrievalParams.requestedSequenceVersion;
        if (seqVer !== Constants.UNIPROT) {
            if (typeof retrievalParams.requestedUnirefId !== 'undefined') {
                if (seqVer === Constants.UNIREF50) {
                    unirefVersion = Constants.UNIREF50;
                    childUnirefVersion = Constants.UNIREF90;
                    useUniref = true;
                } else {
                    unirefVersion = Constants.UNIREF90;
                    childUnirefVersion = Constants.UNIPROT;
                }
            } else {
                unirefVersion = childUnirefVersion = seqVer;
                useUniref = true;
            }
        }

        this.dispatch('initializeApp', { detail: {
            totalRecords: metadata.totalRecords,
            scaleFactor: metadata.scaleFactor,
            useUniref: useUniref,
            unirefVersion: unirefVersion,
            childUnirefVersion: childUnirefVersion,
            windowSize: this.getWindowSize(),
        } });
    }

    /**
     * Return the number of sets that have been already retrieved, or the default if this is the
     * first time the application has been run.
     */
    getRetrievalBatchSize() {
        if (this.numBatchesRetrieved === 0) {
            return this.config.batchSize;
        } else {
            return this.numBatchesRetrieved;
        }
    }

    getFromDataStore(id) {
        const data = this.diagramStore.getData(id);
        return data;
    }

    /**
     * Works with GndDataset to retrieve a set of diagram data from the API, parsing the diagrams
     * after retrieval, and dispatching an event with the new records.
     */
    async retrieveAndRenderNextSet() {
        // Load all of the remaining diagrams
        const ignoreMaxLimit = (this.loadingMode === 'all');

        if (!this.dataset.hasMoreRecordsToFetch(ignoreMaxLimit)) {
            this.dispatch('finishedBatchRetrieval', { detail: { message: 'No more records in batch' } });
            console.log('Finished fetching all batches');
            this.handleSuccess();
            return;
        }

        // Fetch the next set of diagrams (the raw data is parsed by GndDiagramStore within the
        // dataset object)
        let setData = null;
        try {
            setData = await this.dataset.fetchNextSet();
        } catch (error) {
            console.log('Error fetching batch of records: ' + error);
            this.handleError();
            return;
        }

        // Converts the raw diagram data into GndDrawableDiagram objects (which contain
        // GndDrawableGene objects for each gene)
        const newDiagramData = this.diagramStore.updateStore(setData.rawDiagramSet);

        this.updateProgressBar(setData.percentCompleted);

        this.numGndsRetrieved += setData.numDiagrams;
        this.numBatchesRetrieved++;

        if (!this.dataset.hasMoreRecordsToFetch(true)) {
            for (const child of this.footerActionsTarget.children) {
                child.disabled = true;
            }
        }

        this.dispatch('newDiagrams', { detail: { records: newDiagramData } });
    }

    async startGeneGraphicsExport() {
        return await this.dataset.fetchGeneGraphicsData();
    }

    /**
     * This is an event handler that is called when the user in the UI updates the window size.
     */
    async updateWindowSize({ detail: { windowSize } }) {
        this.dataset.setWindowSize(windowSize);

        const retrievalParams = this.getDefaultRetrievalParams();
        this.updateRetrievalParamsQuery(retrievalParams);

        this.performSearch(retrievalParams);
    }

    arrowHighlightCountUpdated({ detail: { numArrowsSelected, hasHighlightedFamilies } }) {
        if (!hasHighlightedFamilies) {
            this.footerHighlightCountTarget.classList.add('d-none');
            this.footerHighlightCountTarget.textContent = '';
        } else {
            this.footerHighlightCountTarget.classList.remove('d-none');
            this.footerHighlightCountTarget.textContent = `Number of Diagrams with All Selected Families: ${numArrowsSelected}`;
        }
    }


    // ----- Helpers -----

    getWindowSize() {
        return this.geneWindowOutlet?.getWindowSize() ?? Constants.DEFAULT_WINDOW_SIZE;
    }

    getDatabaseSequenceVersion(databaseVersion) {
        let seqVersion = Constants.UNIPROT;
        if (databaseVersion === 'uniref90') {
            seqVersion = Constants.UNIREF90;
        } else if (databaseVersion === 'uniref50') {
            seqVersion = Constants.UNIREF50;
        }
        return seqVersion;
    }

    updateRetrievalParamsQuery(retrievalParams) {
        if (this.config.sequence.unirefId.length > 0) {
            retrievalParams.requestedUnirefId = this.config.sequence.unirefId;
        }
        if (this.config.search.clusterOnLoad) {
            retrievalParams.query = this.config.search.clusterOnLoad;
        }
        const seqVersion = this.searchFormOutlet.getSequenceVersion();
        retrievalParams.requestedSequenceVersion = seqVersion;
    }

    getDefaultRetrievalParams() {
        const retrievalParams = {
            windowSize: this.getWindowSize(),
            setSize: this.config.setSize,
            batchSize: this.getRetrievalBatchSize(),
            databaseSequenceVersion: this.config.sequence.databaseVersion,
        };
        return retrievalParams;
    }


    // ----- UI Helpers -----

    updateProgressBar(percent) {
        this.footerProgressBarTarget.style.width = percent + '%';
    }

    enterLoadingState() {
        this.footerActionsTarget.classList.add('d-none');
        this.footerMessageTarget.classList.add('d-none');
        this.footerHighlightCountTarget.classList.add('d-none');
        this.footerProgressContainerTarget.classList.remove('d-none');
        this.updateProgressBar(0);
    }

    handleSuccess() {
        let seqVersion = this.searchFormOutlet.getSequenceVersion();
        seqVersion = (seqVersion === Constants.UNIREF50 ? 'UniRef50' : (seqVersion === Constants.UNIREF90 ? 'UniRef90' : 'UniProt'));
        this.handleFooterUpdate(`Showing ${this.numGndsRetrieved} of ${this.totalRecords} ${seqVersion} diagrams`, ['text-danger'], 'text-muted');
    }

    handleInvalidQuery() {
        this.handleFooterUpdate('No GNDs were identified.', ['text-muted'], 'text-danger');
        this.dispatch('invalidSearch');
    }

    handleError() {
        this.handleFooterUpdate('Unable to load data.', ['text-muted'], 'text-danger');
    }

    handleFooterUpdate(textContent, removeTextColor, addTextColor) {
        this.footerProgressContainerTarget.classList.add('d-none');
        this.footerActionsTarget.classList.remove('d-none');

        this.footerMessageTarget.textContent = textContent;

        if (Array.isArray(removeTextColor)) {
            removeTextColor.forEach(cls => this.footerMessageTarget.classList.remove(cls));
        } else {
            this.footerMessageTarget.classList.remove('removeTextColor');
        }
        this.footerMessageTarget.classList.add(addTextColor);

        this.footerMessageTarget.classList.remove('d-none');

        this.loadingMode = 'idle';
        this.updateProgressBar(0);
    }
}

