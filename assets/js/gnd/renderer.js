import Constants from './constants.js';
import Snap from '../Snap.svg/Snap.svg-0.5.1/snap.svg-import.js';

export default class GndRenderer {

    // Set of arrows that have a SwissProt annotations
    swissprotArrows = new Set();

    // Map arrow ID to list of families for that arrow.  Map of arrow IDs to Sets of families
    arrowFamilyMap = new Map();

    // Map family ID to a list of arrows for that family.  Map of family IDs to Sets of arrow IDs.
    // This only stores Pfams because it is used for handling arrow clicks, and those only work
    // for Pfam families.
    familyArrowMap = new Map();

    constructor(svgElement, mouseActionClass = 'gnd-svg-canvas') {
        this.element = svgElement;
        this.mouseActionClass = mouseActionClass;

        this.snap = Snap(this.element);

        this._setConstants();

        this.unirefIconsGroup = null;
        this.legendGroup = null;

        this.drawCenterVerticalAxis = false;

        this._setInternalDimensions(false);
    }

    /**
     * Called after a search happens or a window reset occurs.
     */
    initializeCanvas(unirefInfo) {
        this.clearCanvas();
        this.unirefInfo = unirefInfo;
        this._setInternalDimensions(this.unirefInfo?.useUniref() ?? false);
    }

    /**
     * Clears the canvas for starting a completely new back of diagrams.  This occurs whe the user
     * performs a new search.
     */
    clearCanvas() {
        if (this.snap) {
            this.snap.clear();
        }
        this.snap.attr({ preserveAspectRatio: 'xMinYMin meet' });
        this.element.style.height = `${this.DIAGRAM_HEIGHT}px`;
    }

    clearLegend() {
        if (this.legendGroup)
            this.legendGroup.remove();
    }

    hasSwissprotArrows() {
        return this.swissprotArrows.size > 0;
    }

    getVerticalOffset() {
        return this.topCanvasPadding;
    }

    /**
     * Return the number of GNDs with one or more highlighted arrows.
     */
    getHighlightedGndCount() {
        const allHighlighted = this.element.querySelectorAll('.highlighted');
        // An individual GND has a top-level group and groups for each protein, but the styles are
        // added to the polygons representing the proteins
        const queryWithHighlighted = new Set(
            Array.from(allHighlighted).map(poly => poly.parentNode.parentNode.dataset.queryArrowId)
        );
        return queryWithHighlighted.size;
    }



    // ----- PUBLIC FILTER AND HIGHLIGHTING METHODS -----

    /**
     * Highlight all arrows that match the given family ID.  This process is
     * additive, meaning that any families that are already highlighted will continue to be
     * highlighted.
     * @param {string} familyId - family ID to highlight
     */
    addFamilyHighlight(familyId) {
        if (!this.familyArrowMap.has(familyId))
            return;

        const arrowElements = this.familyArrowMap.get(familyId);
        if (arrowElements) {
            this.addArrowHighlights(arrowElements);
        }
    }

    /**
     * Clear all arrow highlights that match the given family IDs, except for those arrows that
     * are highlighted as part of a different family.
     * @param {string} familyId - family ID to highlight
     * @param {Set} highlightedFamilies - all families currently highlighted - used to make sure
     *     that arrows with other highlighted families stay highlighted even though the current
     *     familyId is being un-highlighted
     */
    clearFamilyHighlight(familyId, highlightedFamilies) {
        if (!this.familyArrowMap.has(familyId))
            return;

        const arrowElements = this.familyArrowMap.get(familyId);
        let clearSet = new Set(arrowElements);

        for (const familyId of highlightedFamilies) {
            const familyArrows = this.familyArrowMap.get(familyId);
            clearSet = clearSet.difference(familyArrows);
        }

        if (clearSet.size > 0) {
            this.clearArrowHighlights(clearSet);
        }
    }

    /**
     * Highlight all of the arrows with SwissProts annotations.
     */
    highlightSwissprotArrows() {
        this.addArrowHighlights(this.swissprotArrows);
    }

    /**
     * Remove all highlight state information.
     */
    clearAllHighlights() {
        this.removeHighlights();
        this.disableFilterOverlay();
    }

    /**
     * Given a list of family IDs, highlight all arrows that belong to each family, and dispatch an
     * event indicating which families were clicked.  Use when toggling arrows off with SwissProts.
     * @param {Set} familyIds - set of family IDs
     */
    highlightArrowsByFamilies(familyIds) {
        const arrowsToHighlight = new Set();

        familyIds.forEach(familyId => {
            const arrows = this.familyArrowMap.get(familyId);
            if (arrows) {
                arrows.forEach(elem => arrowsToHighlight.add(elem));
            }
        });

        this.addArrowHighlights(arrowsToHighlight);
    }

    /**
     * Remove the highlights from any highlighted elements, but don't remove families from the.
     */
    removeHighlights() {
        const highlighted = this.element.querySelectorAll('.highlighted');;
        highlighted.forEach(elem => elem.classList.remove('highlighted'));
    }

    enableFilterOverlay() {
        this.element.classList.add('canvas-filter-active');
    }

    disableFilterOverlay() {
        this.element.classList.remove('canvas-filter-active');
    }

    getFamilyIdsForArrow(arrowId) {
        return this.arrowFamilyMap.get(arrowId);
    }

    // ----- PRIVATE FUNCTIONS AND RENDERING LOGIC -----


    /**
     * Updates the SVG canvas height and viewBox to fit all drawn diagrams once the batch has
     * been completely added.
     */
    updateCanvasSize(totalNumDiagrams) {
        const extraPadding = 60; // For popup visibility on the last item
        const newHeight = (totalNumDiagrams * this.diagramHeight) + (this.PADDING * 2) + this.FONT_HEIGHT + extraPadding * 2;

        const width = this.element.getBoundingClientRect().width;

        this.snap.attr({ viewBox: `0 0 ${width} ${newHeight}` });
        this.element.style.height = `${newHeight}px`;
    }

    /**
     * Draw a GND.
     *
     * Draw a GND, which is a series of individual genes represented by arrows on a horizontal
     * axis.
     *
     * @param {int} index - position of the diagram from the start of the render
     * @param {object} diagramData - data returned from the backend API containg coordinates, etc.
     */
    drawDiagram(index, diagramData) {
        const yPos = this._calculateYpos(index);
        const group = this.snap.group();
        group.attr({ id: `diagram-group-${index}`, 'data-query-arrow-id': diagramData.Query.Id });

        let minXpct = 1.1, maxXpct = -0.1;

        // Draw Query Arrow
        const query = diagramData.Query;
        const queryIsComplement = this.ORIENT_SAME_DIR ? false : query.IsComplement;
        const queryArrow = this.drawArrow(group, query.RelStart, yPos, query.RelWidth, queryIsComplement, query, true);
        minXpct = Math.min(minXpct, query.RelStart);
        maxXpct = Math.max(maxXpct, query.RelStart + query.RelWidth);

        // Save family and SwissProt metadata mapping
        this.processDiagramMetadata(query, queryArrow);

        // Draw Neighbor Arrows
        for (const neighbor of diagramData.N) {
            let nIsComplement = neighbor.IsComplement;
            let nXpos = neighbor.RelStart;

            if (this.ORIENT_SAME_DIR && query.IsComplement) {
                nIsComplement = !nIsComplement;
                nXpos = 1.0 - nXpos - neighbor.RelWidth + query.RelWidth;
            }

            const neighborArrow = this.drawArrow(group, nXpos, yPos, neighbor.RelWidth, nIsComplement, neighbor, false);
            minXpct = Math.min(minXpct, nXpos);
            maxXpct = Math.max(maxXpct, nXpos + neighbor.RelWidth);

            // Save family and SwissProt metadata mapping
            this.processDiagramMetadata(neighbor, neighborArrow);
        }

        const axisYpos = yPos + this.AXIS_THICKNESS - 1;
        this.drawAxis(group, axisYpos, minXpct, maxXpct, query);

        const titleYpos = yPos - this.titleHeight - 1;
        this.drawTitle(group, titleYpos, query);

        if (this.unirefInfo?.useUniref()) {
            this.drawUnirefExpand(titleYpos - this.PADDING, query);
        }

        return group;
    }

    /**
     * Add family and metadata to internal mapping objects for the purpose of highlighting.
     * @param {object} data - GND metadata object
     * @param {object} arrow - arrow element
     */
    processDiagramMetadata(data, arrow) {
        const familySet = this.arrowFamilyMap.get(data.Id) ?? new Set();

        for (const pfam of data.Pfam) {
            const arrowSet = this.familyArrowMap.get(pfam) ?? new Set();
            arrowSet.add(arrow);
            if (!this.familyArrowMap.has(pfam)) {
                this.familyArrowMap.set(pfam, arrowSet);
            }
            familySet.add(pfam);
        }

        for (const interpro of data.InterPro) {
            const arrowSet = this.familyArrowMap.get(interpro) ?? new Set();
            arrowSet.add(arrow);
            if (!this.familyArrowMap.has(interpro)) {
                this.familyArrowMap.set(interpro, arrowSet);
            }
            // Don't add interpro to the arrow->family map because that is only used for Pfams.
        }

        if (data.IsSwissProt) {
            this.swissprotArrows.add(arrow);
        }

        if (!this.arrowFamilyMap.has(data.Id)) {
            this.arrowFamilyMap.set(data.Id, familySet);
        }
    }


    /**
     * Draw a single gene arrow on the canvas.
     * @param {svg object} diagramGroup - snap svg group
     * @param {float} xPos - X value in GND units (0.0-1.0) on the diagram
     * @param {int} yPos - Y value in drawing units from top of drawable area
     * @param {float} width - width of the arrow in GND units
     * @param {bool} isComplement - if arrow faces left or right relative to the query gene
     * @param {GndDrawableGene} arrowData - gene data that originated from api, parsed in the GndDiagramStore
     * @param {bool} isQuery - true if the arrow represents the query gene
     * @returns {svg polygon} svg polygon object
     */
    drawArrow(diagramGroup, xPos, yPos, width, isComplement, arrowData, isQuery) {
        const yBase = yPos - this.AXIS_THICKNESS - this.AXIS_BUFFER;
        const coords = isComplement
            ? this._calculateReverseArrowCoords(xPos, yPos, width)
            : this._calculateForwardArrowCoords(xPos, yPos, width);

        // Create group to hold the arrow and sub-arrows
        const arrowGroup = diagramGroup.g();

        const attr = {
            class: "an-arrow-group",
            "data-action": `click->${this.mouseActionClass}#handleArrowClick mouseover->${this.mouseActionClass}#handleArrowMouseOver mouseout->${this.mouseActionClass}#handleArrowMouseOut`,
        };
        attr[`data-${this.mouseActionClass}-id-param`] = arrowData.Id;
        arrowGroup.attr(attr);


        const svgAttr = this.getSvgAttr(arrowData, isQuery);

        const mainArrow = arrowGroup.polygon(coords).attr(svgAttr);

        let subArrows = [];
        if (!isQuery && arrowData.Colors.length > 1) {
            subArrows = this.drawSubarrows(arrowGroup, arrowData, coords, isComplement, mainArrow);
        }

        return { arrow: mainArrow, subArrows: subArrows, group: arrowGroup };
    }

    /**
     * If a given gene has more than one Pfam, we need to draw those here with separate colors.
     * @param {GndDrawableGene} arrowData - data for the given gene we are drawing
     * @param {int[]} coords - coordinates in drawing space of the five points of the arrow
     * @param {svg object} mainArrow - main gene arrow, used to attach popup box to the original arrow, not to the sub-arrow
     * @returns {svg object[]} array of svg objects for each extra Pfam
     */
    drawSubarrows(arrowGroup, arrowData, coords, isComplement, mainArrow) {
        const urx = coords[6];
        const ury = coords[7];
        const llx = isComplement ? coords[2] : coords[0];
        const lly = isComplement ? coords[3] : coords[1];

        const arrowWidth = urx - llx;
        const wPct = arrowWidth / arrowData.Colors.length;

        const subArrows = [];
        for (let i = 0; i < arrowData.Colors.length-1; i++) {
            const color = arrowData.Colors[i];
            const subData = {
                class: "an-arrow",
                fill: color,
                fillColor: color,
                style: "pointer-events: none",
            };

            let subX1 = llx + wPct * i;
            let subX2 = llx + wPct * (i+1);
            if (isComplement) {
                subX1 = urx - wPct * i;
                subX2 = urx - wPct * (i+1);
            }

            // Make the vertical line slanted to match the pointer angle
            let off1 = 0, off2 = 0;
            if (i > 0) {
                off1 = -2;
                off2 = 4;
            }

            const subCoords = [subX1+off1, lly, subX2-2, lly, subX2+4, ury, subX1+off2, ury];
            const subArrow = arrowGroup.polygon(subCoords).attr(subData);

            subArrows.push(subArrow);
        }

        return subArrows;
    }

    /**
     * Draw the axis for a GND.
     *
     * Each GND is composed of a series of arrows that can occur in complementary or normal
     * direction.  Draws the horizontal axis that go between normal and complementary arrows.
     *
     * @param {svg object} diagramGroup - SVG group for the GND
     * @param {int} yPos - the offset from the top of the canvas where the axis should be drawn
     * @param {float} minXpct - the minimum width that a diagram can take (percent of drawable area) - for normal orientation
     * @param {float} maxXpct - the maximum width that a diagram can take (percent of drawable area) - for complementary
     * @param {object} queryData - an object that contains data from the API
     */
    drawAxis(diagramGroup, yPos, minXpct, maxXpct, queryData) {
        const dashedAxisLine = { 'stroke': this.AXIS_COLOR, 'strokeWidth': this.AXIS_THICKNESS, 'stroke-dasharray': '2px, 4px' };
        const solidAxisLine = { 'stroke': this.AXIS_COLOR, 'strokeWidth': this.AXIS_THICKNESS };

        const minx = this.leftCanvasPadding + minXpct * this.drawableAreaWidth - 3;
        diagramGroup.line(minx, yPos, this.leftCanvasPadding + maxXpct * this.drawableAreaWidth + 3, yPos).attr(solidAxisLine);

        if (queryData.LeftContigEnd) { // end of contig on left
            const xc = queryData.IsComplement ? maxXpct * this.drawableAreaWidth + 3 : minXpct * this.drawableAreaWidth - 3;
            diagramGroup.line(this.leftCanvasPadding + xc, yPos - 5, this.leftCanvasPadding + xc, yPos + 5).attr(solidAxisLine);
        } else if (minXpct > 0) {
            const x1 = queryData.IsComplement ? maxXpct * this.drawableAreaWidth + 3 : 0;
            const x2 = queryData.IsComplement ? this.drawableAreaWidth : minXpct * this.drawableAreaWidth - 3;
            diagramGroup.line(this.leftCanvasPadding + x1, yPos, this.leftCanvasPadding + x2, yPos).attr(dashedAxisLine);
        }

        if (queryData.RightContigEnd) { // end of contig on right
            const xc = queryData.IsComplement ? minXpct * this.drawableAreaWidth - 3 : maxXpct * this.drawableAreaWidth + 3;
            diagramGroup.line(this.leftCanvasPadding + xc, yPos - 5, this.leftCanvasPadding + xc, yPos + 5).attr(solidAxisLine);
        } else if (minXpct > 0) {
            const x1 = queryData.IsComplement ? 0 : maxXpct * this.drawableAreaWidth + 3;
            const x2 = queryData.IsComplement ? minXpct * this.drawableAreaWidth - 3 : this.drawableAreaWidth;
            diagramGroup.line(this.leftCanvasPadding + x1, yPos, this.leftCanvasPadding + x2, yPos).attr(dashedAxisLine);
        }
    }

    /**
     * Draw the legend line.
     *
     * The legend line provides a reference line that the user can use to measure the length of the
     * arrow diagrams in bp.  Deletes any existing legend before rendering a new one.
     *
     * @param {int} index - position of the diagram from the start of the render
     */
    drawLegend(index) {
        if (this.legendGroup)
            this.legendGroup.remove();

        const yPos = this._calculateYpos(index);
        const xPos = this.leftCanvasPadding;

        const l1 = Math.log10(this.LEGEND_SCALE);
        const l2 = Math.ceil(l1) - 2;
        const legendLength = Math.pow(10, l2); // In AA
        const legendBp = legendLength * 3;
        const legendScaleFactor = this.drawableAreaWidth / this.LEGEND_SCALE;
        const lineLength = legendBp * legendScaleFactor;
        const legendText = legendLength * 3 / 1000;

        const group = this.snap.paper.group();

        group.line(xPos, yPos, xPos + lineLength, yPos)
            .attr({ 'stroke': this.AXIS_COLOR, 'strokeWidth': this.AXIS_THICKNESS });
        group.line(xPos, yPos - 5, xPos, yPos + 5)
            .attr({ 'stroke': this.AXIS_COLOR, 'strokeWidth': this.AXIS_THICKNESS });
        group.line(xPos + lineLength, yPos - 5, xPos + lineLength, yPos + 5)
            .attr({ 'stroke': this.AXIS_COLOR, 'strokeWidth': this.AXIS_THICKNESS });

        const textYposScale = yPos - 4;
        const textObjScale = group.text(xPos + 2, textYposScale, `Scale: ${legendText} kbp`);
        textObjScale.attr({'class':'diagram-title'});

        if (this.drawCenterVerticalAxis) {
            // Draw the center vertical line
            const axisY1 = this.topCanvasPadding - this.ARROW_HEIGHT - 7;
            const axisY2 = this._calculateYpos(index - 1) + this.ARROW_HEIGHT + 7;
            // Simply used to get the position at the middle (e.g. GND unit 0.5)
            const coords = this._calculateForwardArrowCoords(0.5, this.topCanvasPadding, 1);
            const axisX = coords[0];

            group.line(axisX, axisY1, axisX, axisY2)
                .attr({ 'stroke': this.QUERY_AXIS_COLOR, 'strokeWidth': this.AXIS_THICKNESS, 'stroke-dasharray': '2,2' });
        }

        this.legendGroup = group;
    }

    /**
     * Draw the title info above the GND.
     *
     * Adds title data such as query ID, organization, cluster number, etc. above the GND.  If the
     * network is a UniRef network, also add the UniRef cluster size.
     *
     * @param {svg object} diagramGroup - SVG group for the GND
     * @param {int} yPos - the offset from the top of the canvas where the title should be drawn
     * @param {object} data - an object that contains data from the API
     */
    drawTitle(diagramGroup, yPos, data) {
        const idType = this.unirefInfo?.useUniref() ? this.unirefInfo.getUnirefIdTypeName() : Constants.UNIPROT_TITLE;

        let title = '';
        if (typeof data.Id !== 'undefined')
            title = title + 'Query ' + idType + ' ID: ' + data.Id;
        if (typeof data.Organism !== 'undefined')
            title = title + '; ' + data.Organism;
        if (typeof data.TaxonId !== 'undefined')
            title = title + '; NCBI Taxon ID: ' + data.TaxonId;
        if (typeof data.EnaId !== 'undefined')
            title = title + '; ENA ID: ' + data.EnaId;
        if (typeof data.ClusterNum !== 'undefined')
            title = title + '; Cluster: ' + data.ClusterNum;
        if (typeof data.Evalue !== 'undefined' && data.Evalue)
            title = title + '; E-Value: ' + data.Evalue;

        if (title.length > 0) {
            const textObj = diagramGroup.text(this.leftTitleOffset, yPos, title);
            textObj.attr({'class':'diagram-title'});
        }

        if (this.unirefInfo?.useUniref()) {
            const idTypeFieldName = this.unirefInfo.getIdTypeFieldName();
            const unirefClusterType = this.unirefInfo.getUnirefClusterTypeName();
            const numIds = this.unirefInfo.getNumIdsInUnirefCluster(data);

            const infoText = `Number of ${idTypeFieldName} IDs in ${unirefClusterType} cluster: ${numIds}`;
            const textObj = diagramGroup.text(this.leftTitleOffset, yPos + this.UNIREF_TITLE_HEIGHT, infoText);
            textObj.attr({'class':'diagram-title'});
        }
    }

    /**
     * Draw the icon indicating that the UniRef GND can be expanded into sub GNDs in a new window.
     *
     * @param {svg group} group - SVG canvas group to add the icon to
     * @param {int} yPos - vertical position on the canvas to draw the icon at
     * @param {object} data - data from the API
     */
    drawUnirefExpand(yPos, data) {
        const numIds = this.unirefInfo.getNumIdsInUnirefCluster(data);
        if (numIds < 2) {
            return;
        }

        const unirefUrl = this.unirefInfo.getUnirefUrl(data);

        const iconObj = this.drawUnirefIcon(this.UNIREF_ICON_SIZE * 0.6, yPos, this.UNIREF_ICON_SIZE);

	    const linkWrapper = iconObj.paper.el('a', {
            'xlink:href': unirefUrl,
            'target': '_blank',
            'cursor': 'pointer'
        });

    	linkWrapper.add(iconObj);

		this.unirefIconsGroup.add(linkWrapper);
	}

    /**
     * Get the attributes for the SVG arrow representation.
     * @return {object} containing CSS class, fill color, arrow ID, and stroke data (only for query arrows)
     */
    getSvgAttr(arrowData, isQuery) {
        let fillColor = arrowData.Colors[arrowData.Colors.length - 1];
        if (isQuery) {
            fillColor = Constants.QUERY_FILL_COLOR;
        }

        const svgAttr = {
            class: "an-arrow",
            fill: fillColor,
        };

        return svgAttr;
    }

    /**
     * Draw the "+" icon at the top of the canvas if this is a UniRef network.
     */
    drawUnirefExpandInfo() {
        if (this.unirefIconsGroup) {
            this.unirefIconsGroup.remove();
        }
        this.unirefIconsGroup = this.snap.paper.group();
        this.drawUnirefIcon(this.PADDING, this.PADDING, this.UNIREF_ICON_SIZE * 1.4);
        this.unirefIconsGroup.text(this.UNIREF_ICON_SIZE * 1.6 + this.PADDING, this.PADDING + this.UNIREF_ICON_SIZE * 0.6, "Click this icon on the diagrams below to open a new window with the sequences contained in the given UniRef cluster.")
            .attr({'class':'diagram-title-uniref-help'});
    }

    /**
     * Draw an icon representing UniRef expansion.
     *
     * Draw an icon (the Bootstrap plus-square-fill) at the specified position and size.
     *
     * @returns {snap svg path}
     */
    drawUnirefIcon(xPos, yPos, size) {
        const iconPath = "M2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zm6.5 4.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3a.5.5 0 0 1 1 0";
        const origSize = 16;
        const scale = size / origSize;
        const transformString = `t${xPos},${yPos}s${scale}`;
        return this.unirefIconsGroup.path(iconPath).attr({ fill: 'currentColor' }).attr({ transform: transformString });
    }


    // ----- POSITION CALCULATION HELPERS -----

    /**
     * Calculate internal area and padding.
     *
     * Calculates internal padding, drawable area, diagram height, etc.
     */
    _setInternalDimensions(useUniref) {
        const canvasWidth = this.element.getBoundingClientRect().width;

        this.drawableAreaWidth = canvasWidth - this.PADDING * 5;
        this.titleHeight = this.FONT_HEIGHT + 5;

        const baseTopPadding = this.DIAGRAM_HEIGHT / 2 + this.PADDING * 2;
        if (useUniref) {
            this.leftCanvasPadding = this.PADDING; // + this.FONT_HEIGHT + this.UNIREF_ICON_SIZE * 1.2;
            this.topCanvasPadding = baseTopPadding + this.UNIREF_TITLE_HEIGHT + 50;
            this.diagramHeight = this.DIAGRAM_HEIGHT + this.UNIREF_TITLE_HEIGHT;
            this.titleHeight = this.titleHeight + this.UNIREF_TITLE_HEIGHT;
            this.leftTitleOffset = this.leftCanvasPadding + this.UNIREF_ICON_SIZE * 1.2;
        } else {
            this.leftCanvasPadding = this.PADDING;
            this.topCanvasPadding = baseTopPadding;
            this.diagramHeight = this.DIAGRAM_HEIGHT;
            this.leftTitleOffset = this.leftCanvasPadding;
        }
    }

    /**
     * Calculate the coordinates of an arrow that is facing right (normal direction on the chromosone).
     * Returns an array with the following coordinates:
     *  [
     *      lower_left_x,
     *      lower_left_y,
     *      lower_right_x,
     *      lower_right_y
     *      point_x,
     *      point_y,
     *      upper_right_x,
     *      upper_right_y,
     *      upper_left_x,
     *      upper_left_y
     *  ]
     *
     * upper_left                    upper_right
     *      +----------------------------+
     *      |                             \
     *      |                              \
     *      |                               +   point
     *      |                              /
     *      |                             /
     *      +----------------------------+
     * lower_left                   lower_right
     */
    _calculateForwardArrowCoords(xPos, yPos, width) {
        const lly = yPos - this.AXIS_THICKNESS - this.AXIS_BUFFER;
        const ury = lly - this.ARROW_HEIGHT;
        const py = lly - this.ARROW_HEIGHT / 2;

        const llx = this.leftCanvasPadding + xPos * this.drawableAreaWidth;
        let lrx = this.leftCanvasPadding + (xPos + width) * this.drawableAreaWidth - this.POINTER_WIDTH;
        const px = lrx + this.POINTER_WIDTH;

        if (llx > lrx) lrx = llx;

        // lower left x === upper left x (llx)
        // lower right x === upper right x (lrx)
        return [llx, lly, lrx, lly, px, py, lrx, ury, llx, ury];
    }

    /**
     * Calculate the coordinates of an arrow that is facing left (complementary direction on the chromosone).
     * Returns an array with the following coordinates:
     *  [
     *      point_x,
     *      point_y,
     *      lower_left_x,
     *      lower_left_y,
     *      lower_right_x,
     *      lower_right_y
     *      upper_right_x,
     *      upper_right_y,
     *      upper_left_x,
     *      upper_left_y
     *  ]
     *
     *         upper_left                    upper_right
     *              +----------------------------+
     *             /                             |
     *            /                              |
     *     point +                               |
     *            \                              |
     *             \                             |
     *              +----------------------------+
     *         lower_left                   lower_right
     */
    _calculateReverseArrowCoords(xPos, yPos, width) {
        const px = this.leftCanvasPadding + xPos * this.drawableAreaWidth;
        const py = yPos + this.AXIS_THICKNESS + this.AXIS_BUFFER + this.ARROW_HEIGHT / 2;
        let llx = px + this.POINTER_WIDTH;
        const lly = py + this.ARROW_HEIGHT / 2;
        const lrx = this.leftCanvasPadding + (xPos + width) * this.drawableAreaWidth;
        const lry = lly;
        const urx = lrx;
        const ury = yPos + this.AXIS_THICKNESS + this.AXIS_BUFFER;
        let ulx = llx;
        const uly = ury;

        if (llx > lrx) {
            llx = lrx;
            ulx = urx;
        }

        return [px, py, llx, lly, lrx, lry, urx, ury, ulx, uly];
    }

    /**
     * Calculate the starting position of the diagram from the top of the canvas.
     * @param {int} index - position of the diagram from the start of the render
     */
    _calculateYpos(index) {
        const yPos = index * this.diagramHeight + this.topCanvasPadding;
        return yPos;
    }

    /**
     * Set constants that are used throughout the controller.
     */
    _setConstants() {
        // --- Drawing Constants ---
        this.DIAGRAM_HEIGHT = 67;
        this.UNIREF_TITLE_HEIGHT = 18;
        this.UNIREF_ICON_SIZE = 21;
        this.PADDING = 10;
        this.TOP_PADDING = 0;
        this.FONT_HEIGHT = 15;
        this.ARROW_HEIGHT = 15;
        this.POINTER_WIDTH = 5;
        this.AXIS_THICKNESS = 1;
        this.AXIS_BUFFER = 2;
        this.AXIS_COLOR = "black";
        this.QUERY_AXIS_COLOR = "lightgray";
        this.LEGEND_SCALE = 3000;
        this.ORIENT_SAME_DIR = true;
    }


    // ----- PUBLIC POSITION METHODS -----

    computeInfoPopupPosition(targetElement) {
        const arrowElement = Snap(targetElement);

        // Get the bounding box for the arrow, before transformation
        const bbox = arrowElement.getBBox();
        // Get the transformation matrix for the arrow
        const matrix = arrowElement.transform().globalMatrix;

        const centerX = matrix.x(bbox.cx, bbox.cy);
        const lowerRightY = matrix.y(bbox.x2, bbox.y2) + this.ARROW_HEIGHT + 12;

        return { x: centerX, y: lowerRightY };
    }

    /**
     * Get the width of the canvas element.
     * @returns {int} width in pixels of the svg element
     */
    getCanvasWidth() {
        const canvasRect = this.element.getBoundingClientRect();
        return canvasRect.right - canvasRect.left;
    }


    // ----- Private highlighting helpers -----
    
    /**
     * Highlights the arrows in the given set.
     * @param {Set} arrowElements - set of svg elements corresponding to arrows
     */
    addArrowHighlights(arrowElements) {
        arrowElements.forEach(elem => {
            elem.arrow.node.classList.add('highlighted');
            elem.subArrows.forEach(subArrow => subArrow.node.classList.add('highlighted'));
        });
    }

    /**
     * Clears highlights on the arrows in the given set.
     * @param {Set} arrowElements - set of svg elements corresponding to arrows
     */
    clearArrowHighlights(arrowElements) {
        arrowElements.forEach(elem => {
            elem.arrow.node.classList.remove('highlighted');
            elem.subArrows.forEach(subArrow => subArrow.node.classList.remove('highlighted'));
        });
    }
}

