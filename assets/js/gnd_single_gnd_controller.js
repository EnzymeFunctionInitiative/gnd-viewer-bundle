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
        this.renderer = new GndRenderer(this.element, 'efi--gnd-viewer-bundle--gnd-single-gnd');

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
        const x = event.clientX + 10;
        const y = event.clientY + 10;
        const dispatchData = { data, ctrlKey: event.ctrlKey, altKey: event.altKey, x: x, y: y };
        this.dispatch('arrowClick', { detail: dispatchData, openPopup: true, bubbles: true });
    }

    handleArrowMouseOver(event) {
        const data = this.getFromDataStore(event.params.id);
        const x = event.clientX + 1;
        const y = event.clientY + 1;
        this.dispatch('arrowMouseOver', { detail: { data, x: x, y: y }, bubbles: true });
    }

    handleArrowMouseOut(event) {
        this.dispatch('arrowMouseOut', { detail: {}, bubbles: true });
    }
}
