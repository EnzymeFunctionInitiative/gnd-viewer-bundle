import { Controller } from '@hotwired/stimulus';
import Constants from './gnd/constants.js';
import GndRenderer from './gnd/renderer.js';
import GndUnirefInfo from './gnd/uniref_info.js';
import Util from './gnd/util.js';

export default class GndSvgCanvasController extends Controller {

    static values = {
        mainAppId: String,
    };

    // Keep track of which arrows are highlighted
    highlightedFamilies = new Set();

    canvasReady = false;

    connect() {
        this.renderer = new GndRenderer(this.element, 'enzymefunctioninitiative--gnd-viewer-bundle--gnd-svg-canvas');
        this.diagramCount = 0;
        setTimeout(() => {
            this.initializeOutlets();
        }, 0);
    }

    initializeOutlets() {
        this.mainAppOutlet = Util.findController(
            this.application,
            this.mainAppIdValue,
            'enzymefunctioninitiative--gnd-viewer-bundle--gnd-app'
        );
    }

    disconnect() {
        // Clean up if the element is removed from the page
        this.clearCanvas();
    }


    // ----- PUBLIC ACTIONS CALLED BY OTHER CONTROLLERS THROUGH OUTLETS ----- 

    /**
     * Toggle the highlight of all arrows that match the given family ID.  This process is
     * additive, meaning that any families that are already highlighted will continue to be
     * highlighted.
     * @param {string} familyId - family ID
     * @param {bool} showFamily - true to highlight all arrows with the family, false to clear highlight
     */
    toggleFamily(familyId, showFamily) {
        if (showFamily && !this.highlightedFamilies.has(familyId)) {
            if (this.highlightedFamilies.size == 0) {
                this.renderer.enableFilterOverlay();
            }

            this.renderer.addFamilyHighlight(familyId);

            this.highlightedFamilies.add(familyId);
        } else if (!showFamily && this.highlightedFamilies.has(familyId)) {
            this.highlightedFamilies.delete(familyId);

            this.renderer.clearFamilyHighlight(familyId, this.highlightedFamilies);

            if (this.highlightedFamilies.size == 0) {
                this.renderer.disableFilterOverlay();
            }
        }
    }

    getHighlightedGndCount() {
        const gndIds = this.renderer.getExclusiveQueryIdSetForFamilies(this.highlightedFamilies);
        return gndIds.size;
    }

    /**
     * Toggle highlighting of arrows with SwissProt annotations.  If the toggle is turned off and
     * families were previously highlighted, then that highlighting will return.
     * @param {bool} showSwissProts - true to highlight only arrows with SwissProt
     */
    toggleSwissProts(showSwissProts) {
        this.renderer.removeHighlights();
        if (showSwissProts && this.renderer.hasSwissprotArrows()) {
            this.renderer.enableFilterOverlay();
            this.renderer.highlightSwissprotArrows();
        } else if (!showSwissProts && this.highlightedFamilies.size > 0) {
            this.renderer.enableFilterOverlay();
            this.renderer.highlightArrowsByFamilies(this.highlightedFamilies.keys());
        } else {
            this.renderer.disableFilterOverlay();
        }
    }

    /**
     * Remove all highlight state information.  Called by gnd_filter controller.
     */
    clearAllHighlights() {
        this.renderer.clearAllHighlights();
        this.highlightedFamilies.clear();
    }


    // ----- EVENTS RECEIVED FROM OTHER CONTROLLERS -----

    /**
     * Called after a search happens or a window reset occurs.
     */
    initializeCanvas({ detail: { useUniref, unirefVersion, childUnirefVersion } }) {
        this.clearCanvas();
        this.unirefInfo = new GndUnirefInfo(useUniref, unirefVersion, childUnirefVersion);
        this.renderer.initializeCanvas(this.unirefInfo);
        this.canvasReady = false;
    }

    /**
     * Entry point for rendering a new batch of diagrams.
     *
     * This is triggered by the 'newDiagrams' event from the orchestrator controller.
     * 
     * @param {object} detail.records - contains an array of GndDrawableDiagram objects
     */
    renderBatch({ detail: { records } }) {
        this.renderer.clearLegend();

        const newTotalDiagramCount = this.diagramCount + records.length;
        this.renderer.updateCanvasSize(newTotalDiagramCount);

        // Draw the UniRef expansion info at the top of the page
        if (this.unirefInfo.useUniref() && this.diagramCount === 0) {
            this.renderer.drawUnirefExpandInfo();
        }

        // Start the non-blocking rendering loop
        this.renderDiagramsNonBlocking(records, 0);
    }

    finalizeRender() {
        // The retrieval of all batches is done rendering so draw the legend
        this.renderer.drawLegend(this.diagramCount);
        this.canvasReady = true;
    }

    /**
     * Clears the canvas for starting a completely new back of diagrams.  This occurs whe the user
     * performs a new search.
     */
    clearCanvas() {
        this.diagramCount = 0;
        this.renderer.clearCanvas();
    }

    getCanvasWidth() {
        return this.renderer.getCanvasWidth();
    }


    // ----- PRIVATE FUNCTIONS AND RENDERING LOGIC -----

    /**
     * Renders an array of diagrams one by one using requestAnimationFrame to avoid blocking the
     * main thread and freezing the UI.  Each call of this function renders one diagram.
     * @param {GndDrawableDiagram[]} drawables - Array of diagram objects to render.
     * @param {number} index - The current index in the array to array.
     */
    renderDiagramsNonBlocking(drawables, index) {
        if (index >= drawables.length) {
            this.diagramCount += drawables.length;
            // Dispatch event to tell the main app controller it can fetch the next batch.
            this.dispatch('batchRenderComplete');
            return;
        }

        // Prepare for drawing this single diagram
        const diagramData = drawables[index];
        const diagramIndex = this.diagramCount + index;

        // Draw the diagram
        const diagramGroup = this.renderer.drawDiagram(diagramIndex, diagramData);

        // Schedule the next diagram to be drawn on the next animation frame
        requestAnimationFrame(() => this.renderDiagramsNonBlocking(drawables, index + 1));
    }


    // --- EVENT HANDLERS & DISPATCHERS ---

    getFromDataStore(arrowId) {
        return this.mainAppOutlet.getFromDataStore(arrowId);
    }

    handleArrowClick(event) {
        if (!this.canvasReady)
            return;

        const arrowId = event.params.id;
        const data = this.getFromDataStore(arrowId);

        const popupPos = this.getPopupPosition(event.currentTarget);
        const dispatchData = { detail: { data, ctrlKey: event.ctrlKey, altKey: event.altKey, x: popupPos.x, gndLowerY: popupPos.gndLowerY, gndUpperY: popupPos.gndUpperY }, prefix: 'efi-gnd-global', bubbles: true };

        if (event.ctrlKey || event.altKey) {
            // Get all of the family IDs that this arrow belongs to
            const familyIds = this.renderer.getFamilyIdsForArrow(arrowId);
            if (familyIds) {
                // If any of the families that are associated with the current arrow are
                // highlighted, then turn off all of the families.

                let isAnyHighlighted = false;
                for (const familyId of familyIds) {
                    if (this.highlightedFamilies.has(familyId)) {
                        isAnyHighlighted = true;
                        break;
                    }
                }

                // If any are highlighted, then send false to the toggle, to hide that family
                familyIds.forEach(familyId => this.toggleFamily(familyId, !isAnyHighlighted));

                dispatchData.detail.familyChange = { familyIds: new Set(familyIds), highlight: !isAnyHighlighted };
            }
        }

        this.dispatch('arrowClick', dispatchData);
    }

    handleArrowMouseOver(event) {
        const data = this.getFromDataStore(event.params.id);
        const popupPos = this.getPopupPosition(event.currentTarget);
        this.dispatch('arrowMouseOver', { detail: { data, x: popupPos.x, gndLowerY: popupPos.gndLowerY, gndUpperY: popupPos.gndUpperY }, prefix: 'efi-gnd-global' });
    }

    handleArrowMouseOut(event) {
        this.dispatch('arrowMouseOut', { detail: {}, prefix: 'efi-gnd-global' });
    }

    getPopupPosition(arrowTarget) {
        const relativePos = this.renderer.computeInfoPopupRelativePosition(arrowTarget);
        const rect = this.element.getBoundingClientRect();
        return { x: rect.left + relativePos.x, gndLowerY: rect.top + relativePos.gndLowerY, gndUpperY: rect.top + relativePos.gndUpperY };
    }
}

