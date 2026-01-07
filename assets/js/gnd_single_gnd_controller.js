import { Controller } from '@hotwired/stimulus';
import GndRenderer from '../js/gnd/renderer.js';
import GndDiagramStore from '../js/gnd/data.js';
import GndColor from '../js/gnd/color.js';

export default class GndSingleGndController extends Controller {
    static values = {
        stats: Object,
        data: Object, // Embedded JSON
    };

    connect() {
        const colorService = new GndColor();
        this.diagramStore = new GndDiagramStore(colorService);
        this.renderer = new GndRenderer(this.element, 'enzymefunctioninitiative--gnd-viewer-bundle--gnd-single-gnd');

        const drawables = this.diagramStore.updateStore(this.dataValue);

        if (drawables.length > 0) {
            this.renderer.drawDiagram(0, drawables[0]);

            // Resize SVG to fit content
            const height = this.renderer.DIAGRAM_HEIGHT + (this.renderer.PADDING * 2);
            this.element.style.height = `${height}px`;
        }
    }

    getCanvasWidth() {
        return this.renderer.getCanvasWidth();
    }

    getFromDataStore(id) {
        const data = this.diagramStore.getData(id);
        return data;
    }


    // --- EVENT HANDLERS & DISPATCHERS ---

    handleArrowClick(event) {
        const data = this.getFromDataStore(event.params.id);
        const { x, gndLowerY, gndUpperY } = this.getArrowPosition(event.currentTarget);
        const dispatchData = { data, ctrlKey: event.ctrlKey, altKey: event.altKey, x, gndLowerY, gndUpperY };
        this.dispatch('arrowClick', { prefix: 'efi-gnd-global', detail: dispatchData, openPopup: true, bubbles: true });
    }

    handleArrowMouseOver(event) {
        const data = this.getFromDataStore(event.params.id);
        const { x, gndLowerY, gndUpperY } = this.getArrowPosition(event.currentTarget);
        this.dispatch('arrowMouseOver', { prefix: 'efi-gnd-global', detail: { data, x, gndLowerY, gndUpperY }, bubbles: true });
    }

    handleArrowMouseOut(event) {
        this.dispatch('arrowMouseOut', { prefix: 'efi-gnd-global', detail: {}, bubbles: true });
    }

    getArrowPosition(targetArrow) {
        const popupPos = this.renderer.computeInfoPopupRelativePosition(targetArrow);
        const svgPos = this.element.getBoundingClientRect();
        const x = popupPos.x + svgPos.left;
        const gndLowerY = popupPos.gndLowerY + svgPos.top + window.scrollY;
        const gndUpperY = popupPos.gndUpperY + svgPos.top + window.scrollY;
        return { x, gndLowerY, gndUpperY };
    }
}
