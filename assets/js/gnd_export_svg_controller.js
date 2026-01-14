import { Controller } from "@hotwired/stimulus";
import Constants from './gnd/constants.js';
import Util from './gnd/util.js';

export default class extends Controller {
    static targets = [
        'svgButton',
        'geneGraphicsButton',
    ];

    static values = {
        geneGraphicsUrl: String,
        gndName: String,
        mainAppElementId: String,
        mainAppControllerId: String,
        svgCanvasElementId: String,
    };

    connect() {
        setTimeout(() => {
            this.initializeOutlets();
        }, 0);
        Util.signalReady(this);
    }

    initializeOutlets() {
        this.mainAppOutlet = Util.findController(
            this.application,
            this.mainAppElementIdValue,
            this.mainAppControllerIdValue,
        );
    }

    downloadSvg(event) {
        event.preventDefault();

        const svgElement = document.getElementById(this.svgCanvasElementIdValue);

        // Clone the SVG element so we can remove UniRef controls
        const clone = svgElement.cloneNode(true);

        const unirefGroup = clone.querySelector('#' + Constants.UNIREF_CONTROLS_GROUP);
        if (unirefGroup) {
            unirefGroup.remove();
        }

        const serializer = new XMLSerializer();
        let source = serializer.serializeToString(clone);

        const styleRules = this.getStyleRules();
        source = source.replace('>', `><style>${styleRules}</style>`);

        // Ensure the XML namespace exists (required for standalone files)
        if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
            source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
        }

        const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;

        // Set filename
        link.download = `${this.gndNameValue}_export.svg`;

        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    async downloadGeneGraphics(event) {
        event.preventDefault();

        this.dispatch('geneGraphicsExport', { detail: { status: 'start' }, prefix: 'efi-gnd-global' });

        let { filename, blob } = await this.mainAppOutlet.startGeneGraphicsExport();
        if (!filename) {
            filename = 'export.tab';
        }

        if (!blob) {
            this.dispatch('geneGraphicsExport', { detail: { status: 'error' }, prefix: 'efi-gnd-global' });
            return;
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();

        window.URL.revokeObjectURL(url);
        a.remove();

        this.dispatch('geneGraphicsExport', { detail: { status: 'finish' }, prefix: 'efi-gnd-global' });
    }

    enableTool() {
        this.svgButtonTarget.disabled = false;
        this.geneGraphicsButtonTarget.disabled = false;
    }

    getStyleRules() {
        return `
    text { font-size: 14px; font-family: Arial; }
    .highlighted { stroke: #000; stroke-width: 3; }
    .diagram-title { font-size: 14px; }
`;
    }
}
