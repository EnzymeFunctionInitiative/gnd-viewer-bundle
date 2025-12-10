import Constants from './constants.js';

/**
 * Service to provide colors for Pfams.  Since there are a limited number of colors, some might
 * be recycled if there are more Pfams than colors.
 */
export default class GndColor {
    /**
     * Create an instance of GndColor.
     */
    constructor() {
        // This is for default colors in case the app doesn't have a color assigned for a family.
        this.colors = getColors();
        this.pfamColorMap = new Map();
        this.pfamColorCount = 0;
        // The query gene (i.e. central) color
        this.queryGeneColor = Constants.QUERY_FILL_COLOR;
        this.defaultColor = 'gray';
    }

    /**
     * Return a color name for the given Pfam.
     * @returns {string} Color name that can be assigned as an attribute to a SVG object
     */
    getPfamColor(pfam) {
        if (this.pfamColorMap.has(pfam)) {
            return this.pfamColorMap.get(pfam);
        } else {
            return this.defaultColor;
        }
    }

    /**
     * Assigns colors to every Pfam in the input gene object.  If the input is a query gene then
     * the color is the same for every family in the gene, regardless if there are multiple.
     * @param {object} data - Raw data object from the API that represents the gene
     * @param {bool} isQuery - Flag indicating if the gene is the query gene
     * @returns {string[]} - List of HTML color names corresponding to each Pfam in the input
     */
    assignColor(data, isQuery = true) {
        let colors = [];

        if (isQuery) {
            colors = data.pfam.map(pfam => this.queryGeneColor);
            return colors;
        }

        for (var i = 0; i < data.pfam.length; i++) {
            const pfam = data.pfam[i];

            let color = this.defaultColor;

            // If the API provided a color for the Pfam, then use that color.
            if (i < data.color.length) {
                color = data.color[i];
                this.pfamColorMap.set(pfam, data.color[data.color.length - 1]);
            } else if (pfam.length > 0) {
                // If there is a Pfam, then get a color from the internal mapping; if one has
                // already been assigned then use that
                if (this.pfamColorMap.has(pfam)) {
                    color = this.pfamColorMap.get(pfam);
                } else {
                    const colorIndex = this.pfamColorCount++ % this.colors.length;
                    color = this.colors[colorIndex]; // global color list
                    this.pfamColorMap.set(pfam, color);
                }
            }

            colors.push(color);
        }

        return colors;
    }
}


/**
 * Return a list of all possible colors that can be used when assigning Pfams.
 */
function getColors() {
    const colors = [
        "Pink",
        "HotPink",
        "DeepPink",
        "Salmon",
        "DarkSalmon",
        "LightCoral",
        "Coral",
        "DarkOrange",
        "Orange",
        "DarkKhaki",
        "Gold",
        "BurlyWood",
        "Tan",
        "RosyBrown",
        "SandyBrown",
        "Goldenrod",
        "DarkGoldenrod",
        "Peru",
        "Chocolate",
        "SaddleBrown",
        "Sienna",
        "Brown",
        "DarkOliveGreen",
        "Olive",
        "OliveDrab",
        "YellowGreen",
        "LimeGreen",
        "Lime",
        "LightGreen",
        "DarkSeaGreen",
        "MediumAquamarine",
        "MediumSeaGreen",
        "SeaGreen",
        "Green",
        "DarkGreen",
        "Cyan",
        "Turquoise",
        "LightSeaGreen",
        "CadetBlue",
        "Teal",
        "LightSteelBlue",
        "SkyBlue",
        "DeepSkyBlue",
        "DodgerBlue",
        "CornflowerBlue",
        "SteelBlue",
        "RoyalBlue",
        "Blue",
        "MediumBlue",
        "DarkBlue",
        "Navy",
        "MidnightBlue",
        "Thistle",
        "Plum",
        "Violet",
        "Orchid",
        "Fuchsia",
        "MediumOrchid",
        "MediumPurple",
        "BlueViolet",
        "DarkViolet",
        "DarkOrchid",
        "Purple",
        "Indigo",
        "DarkSlateBlue",
        "SlateBlue",
        "LightSlateGray",
        "DarkSlateGray",
    ];
    return colors;
}
