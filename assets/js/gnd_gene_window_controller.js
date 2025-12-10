import { Controller } from '@hotwired/stimulus';
import Constants from '../js/gnd/constants.js';

export default class GndGeneWindowController extends Controller {
    LARGE_INC = 3;
    SMALL_INC = 1;

    //static targets = ['windowSize', 'zoomOutLarge', 'zoomOutSmall', 'zoomInSmall', 'zoomInLarge'];
    static targets = ['windowSize'];

    connect() {
        this.windowSize = Constants.DEFAULT_WINDOW_SIZE;
        this.setupWindowSizeOptions();
    }

    // ----- EVENT HANDLERS -----

    initializeApp() {
    }

    finishRetrieval() {
    }

    zoomOutLarge() {
        this.updateWindowSizeByIncrement(this.LARGE_INC);
    }

    zoomOutSmall() {
        this.updateWindowSizeByIncrement(this.SMALL_INC);
    }

    zoomInSmall() {
        this.updateWindowSizeByIncrement(-this.SMALL_INC);
    }

    zoomInLarge() {
        this.updateWindowSizeByIncrement(-this.LARGE_INC);
    }

    windowSizeChange(event) {
        const geneWindow = event.currentTarget.value;
        this.updateWindowSizeValue(geneWindow);
    }


    // ----- Public accessors -----

    getWindowSize() {
        return this.windowSize;
    }


    // ----- Helpers -----

    setupWindowSizeOptions() {
        this.windowSizeTarget.length = 0;
        for (let s = Constants.MIN_WINDOW_SIZE; s <= Constants.MAX_WINDOW_SIZE; s++) {
            const opt = document.createElement('option');
            opt.value = s;
            opt.text = s;
            this.windowSizeTarget.add(opt);
        }
        this.windowSizeTarget.value = this.windowSize;
    }

    updateWindowSizeByIncrement(sizeIncrement) {
        const newWindowSize = this.windowSize + sizeIncrement;
        if (newWindowSize >= Constants.MIN_WINDOW_SIZE && newWindowSize <= Constants.MAX_WINDOW_SIZE) {
            this.windowSizeTarget.value = newWindowSize;
            this.updateWindowSizeValue(newWindowSize);
        }
    }

    updateWindowSizeValue(newWindowSize) {
        this.windowSize = newWindowSize;
        this.dispatch('updateWindowSize', { detail: { windowSize: newWindowSize } });
    }
}

