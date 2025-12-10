import { Controller } from '@hotwired/stimulus';

export default class GndInfoPopupController extends Controller {
    static values = {
        metadataUrl: String
    };

    static outlets = [
        'gnd-app',
        'gnd-single-gnd',
    ];

    static targets = [
        'idDisplay',
        'metadataLink',
        'description',
        'status',
        'pfam',
        'interproGroup',
        'interpro',
        'length',
    ];

    // With the outlet, we now have:
    // this.gndAppOutlet - a reference to the gnd app controller
    // this.hasGndAppOutlet - boolean indicating if there is a connection to the gnd app controller
    // this.gndAppOutletConnected() - callback when the outlet is connected between controllers

    connect() {
        this.canvasWidth = this.getContextController()?.getCanvasWidth();

        // Use this to keep popups from showing up too fast; i.e. only show when the mouse
        // hovers for a short period of time rather than when the user moves the mouse across the screen
        this.timeoutId = null;
        this.currentData = null;
        this.keepPopupOpen = false;
    }

    disconnect() {
        if (typeof this.timeoutId === 'number') {
            clearTimeout(this.timeoutId);
        }
    }

    getContextController() {
        if (this.hasGndAppOutlet) return this.gndAppOutlet;
        if (this.hasGndSingleGndOutlet) return this.gndSingleGndOutlet;
        return null;
    }

    getFromDataStore(arrowId) {
        return this.getContextController()?.getFromDataStore(arrowId);
    }

    handleArrowOver({ detail: { arrowId, x, y } }) {
        if (typeof this.timeoutId === 'number') {
            clearTimeout(this.timeoutId);
        }

        this.timeoutId = setTimeout(() => {
            const data = this.getFromDataStore(arrowId);
            if (data) {
    			this.populatePopup(data);
            }

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

    handleArrowClick({ detail: { arrowId, ctrlKey, altKey, x, y }}) {
        const data = this.getFromDataStore(arrowId);

        if (!ctrlKey && !altKey) {
            if (data) {
                this.keepPopupOpen = true;
		    	this.populatePopup(data);
		    	this.setPosition(x, y);
                this.currentData = data;
            } else {
                this.keepPopupOpen = false;
                //TODO: handle this error
            }
        }
    }

    populatePopup(data) {
        this.idDisplayTarget.innerText = data.Id;
        this.pfamTarget.innerText = data.PfamMerged;
        this.interProTarget.innerText = data.InterProMerged;
        this.descriptionTarget.innerText = data.Description;
        this.lengthTarget.innerText = data.SequenceLength;
        this.statusTarget.innerText = data.IsSwissProt ? 'SwissProt' : 'TrEMBL';
    }

	setPosition(x, y) {
        const offsetX = 15;

        const popupWidth = this.element.offsetWidth;
        
        // Calculate the coordinates of the viewport edges relative to the document
        const rightEdge = this.canvasWidth - window.scrollX;

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

        this.element.style.left = `${newLeft}px`;
        this.element.style.top = `${y}px`;
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

