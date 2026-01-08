import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
    static targets = [
        'toolButton',
    ];

    static values = {
        svgCanvasId: String,
        gndName: String,
    };

    UNIREF_CONTROLS_GROUP = 'svg-canvas-uniref-controls-group';

    downloadSvg(event) {
        event.preventDefault();

        const svgElement = document.getElementById(this.svgCanvasIdValue);

        // Clone the SVG element so we can remove UniRef controls
        const clone = svgElement.cloneNode(true);

        const unirefGroup = clone.querySelector(this.UNIREF_CONTROLS_GROUP);
        if (unirefGroup) {
            console.log('REMOVING');
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

    enableTool() {
        this.toolButtonTarget.disabled = false;
    }

    getStyleRules() {
        return `
    text { font-family: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "Liberation Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"'; }
    .highlighted { stroke: #000; stroke-width: 3; }
    .diagram-title { font-size: 0.88rem; }
`;
    }
}
