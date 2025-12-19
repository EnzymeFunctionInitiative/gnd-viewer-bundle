import { Controller } from '@hotwired/stimulus';
import Util from './gnd/util.js';

export default class GndInfoPopupController extends Controller {
    static values = {
        metadataUrl: String,
        canvasId: String,
    };

    static targets = [
        'description',
        'idDisplay',
        'interpro',
        'interproGroup',
        'length',
        'metadataLink',
        'organism',
        'pfam',
        'status',
    ];

    connect() {
        // Use this to keep popups from showing up too fast; i.e. only show when the mouse
        // hovers for a short period of time rather than when the user moves the mouse across the screen
        this.timeoutId = null;
        this.currentData = null;
        this.keepPopupOpen = false;
        this.canvasWidth = window.innerWidth;
        this.diagramHeight = 80;
        setTimeout(() => {
            this.initializeOutlets();
        }, 0);
    }

    initializeOutlets() {
        this.svgCanvasOutlet = Util.findController(
            this.application,
            this.canvasIdValue,
            'enzymefunctioninitiative--gnd-viewer-bundle--gnd-svg-canvas'
        );
        this.verticalOffset = null;
    }

    getVerticalOffset() {
        if (this.verticalOffset === null) {
            this.verticalOffset = this.svgCanvasOutlet?.getVerticalOffset() ?? 0;
            console.log(this.verticalOffset);
        }
        return this.verticalOffset;
    }

    disconnect() {
        if (typeof this.timeoutId === 'number') {
            clearTimeout(this.timeoutId);
        }
    }

    handleArrowOver({ detail: { data, x, y } }) {
        if (typeof this.timeoutId === 'number') {
            clearTimeout(this.timeoutId);
        }

        this.timeoutId = setTimeout(() => {
            this.populatePopup(data);
            this.element.classList.remove('d-none');
            this.setPosition(x, y);
            this.keepPopupOpen = false;
        }, 100);
    }

    handleArrowOut() {
        if (this.keepPopupOpen)
            return;

        if (typeof this.timeoutId === 'number') {
            clearTimeout(this.timeoutId);
        }
        this.element.classList.add('d-none');
    }

    handleArrowClick({ detail: { data, ctrlKey, altKey, x, y }}) {
        if (!ctrlKey && !altKey) {
            this.keepPopupOpen = true;
		    this.populatePopup(data);
		    this.setPosition(x, y);
            this.currentData = data;
        }
    }

    populatePopup(data) {
        this.idDisplayTarget.innerText = data.Id;
        this.pfamTarget.innerText = data.PfamMerged;
        this.interproTarget.innerText = data.InterProMerged;
        this.descriptionTarget.innerText = data.Description;
        this.lengthTarget.innerText = data.SequenceLength;
        this.organismTarget.innerText = data.Organism;
        this.statusTarget.innerText = data.IsSwissProt ? 'SwissProt' : 'TrEMBL';
    }

	setPosition(x, y) {
        const offsetX = 25;

        const popupWidth = this.element.offsetWidth;
        const popupHeight = this.element.offsetHeight;
        
        // Calculate the coordinates of the viewport edges relative to the document
        const rightEdge = this.canvasWidth - window.scrollX;
        const bottomEdge = window.scrollY + window.innerHeight;

        // Calculate preferred horizontal position
        let newLeft = x + offsetX;

        // Check and correct for edge overflow

        // If the popup's right side would be past the viewport's right edge position it to
        // the left of the position instead
        if (newLeft + popupWidth + (offsetX / 2) > rightEdge) {
            newLeft = rightEdge - popupWidth - offsetX;
        }

        // If the popup's left side would be past the viewport's left edge then clamp its
        // its position to the viewport edge (with a small margin)
        if (newLeft < offsetX) {
            newLeft = offsetX;
        }

        let newTop = y + this.getVerticalOffset();
        if (newTop + popupHeight > bottomEdge) {
            newTop = y - popupHeight - this.diagramHeight;
        }

        this.element.style.left = `${newLeft}px`;
        this.element.style.top = `${newTop}px`;
	}

    openMetadataPage() {
        const url = `${this.metadataUrlValue}?id=${this.currentData.Id}`;
        window.open(url, '_blank').focus();
    }

    copyToClipboard() {
        const text = this.getClipboardText();
        navigator.clipboard.writeText(text);
    }

    getClipboardText() {
        const annoStatus = this.currentData.IsSwissProt ? 'SwissProt' : 'TrEMBL';
        return `ID\t${this.currentData.Id}
Description\t${this.currentData.Description}
Annotation Status\t${annoStatus}
Pfam\t${this.currentData.PfamMerged}
InterPro\t${this.currentData.InterProMerged}
Sequence Length\t${this.currentData.SequenceLength} AA`;
    }
}

