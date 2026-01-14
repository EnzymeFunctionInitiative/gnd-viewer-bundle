import { Controller } from '@hotwired/stimulus';
import Constants from './gnd/constants.js';
import Util from './gnd/util.js';

export default class GndGeneWindowController extends Controller {
    static targets = ['windowSize'];

    connect() {
        this.windowSize = Constants.DEFAULT_WINDOW_SIZE;
        this.setupWindowSizeOptions();
        Util.signalReady(this);
    }

    // ----- EVENT HANDLERS -----

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

    updateWindowSizeValue(newWindowSize) {
        this.windowSize = parseInt(newWindowSize);
        this.dispatch('updateWindowSize', { detail: { windowSize: newWindowSize } });
    }
}
