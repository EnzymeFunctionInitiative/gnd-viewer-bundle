import { Controller } from '@hotwired/stimulus';
import Util from './gnd/util.js';

export default class GndFilterController extends Controller {
    static targets = [
        'pfamFamilyList',
        'interproFamilyList',
        'searchInput',
        'showSwissProt',
        'fieldset',
        'checkbox',
        'legendContainer',
    ];

    static values = {
        svgCanvasId: String,
    };

    // Map family ID to description
    familyNameMap = new Map();

    // Map family ID to form checkbox control
    familyCheckboxMap = new Map();

    // List of family IDs that are currently highlighted
    highlightedFamilyIds = new Set();

    connect() {
        this.pfamAccordion = document.getElementById('pfamFamilyListAccordion');
        this.pfamAccordionButton = document.getElementById('pfamFamilyListAccordionButton');
        this.interproAccordion = document.getElementById('interproFamilyListAccordion');
        this.interproAccordionButton = document.getElementById('interproFamilyListAccordionButton');

        setTimeout(() => {
            this.initializeOutlets();
        }, 0);
    }

    initializeOutlets() {
        this.svgCanvasOutlet = Util.findController(
            this.application,
            this.svgCanvasIdValue,
            'enzymefunctioninitiative--gnd-viewer-bundle--gnd-svg-canvas'
        );
    }

    // ----- EVENT HANDLERS -----

    newDiagrams({ detail: { records } }) {
        for (const record of records) {
            this.addFamilyNameMapping(record.Query);

            for (const nb of record.N) {
                this.addFamilyNameMapping(nb);
            }
        }
    }

    finishRetrieval() {
        //TODO: start progress indicator

        const pfamFragment = document.createDocumentFragment();

        for (const id of this.familyNameMap.keys().filter(id => id.startsWith('PF'))) {
            const div = this.createFilterElement(id, this.familyNameMap.get(id).name);
            pfamFragment.appendChild(div);
        }

        this.pfamFamilyListTarget.appendChild(pfamFragment);

        const interproFragment = document.createDocumentFragment();

        for (const id of this.familyNameMap.keys().filter(id => id.startsWith('IPR'))) {
            const div = this.createFilterElement(id, this.familyNameMap.get(id).name);
            interproFragment.appendChild(div);
        }

        this.interproFamilyListTarget.appendChild(interproFragment);

        // checkboxTargets is a stimulus mapped list of checkboxes
        this.checkboxTargets.forEach(checkbox => {
            this.familyCheckboxMap.set(checkbox.dataset.familyId, checkbox);
        });

        //TODO: end progress indicator
        this.enable();
    }

    initializeUi() {
        this.pfamFamilyListTarget.innerHTML = '';
        this.interproFamilyListTarget.innerHTML = '';
        this.searchInputTarget.value = '';
        this.showSwissProtTarget.checked = false;

        this.disable();
    }

    /**
     * FROM FAMILY CHECKBOX CLICK
     * Called when a checkbox is clicked
     */
    handleFamilyToggle(event) {
        this.toggleFamily(event.target.dataset.familyId, event.target.checked);
    }

    toggleSwissProt(event) {
        this.svgCanvasOutlet.toggleSwissProts(event.target.checked);
        this.updateSelectionStats();
    }

    /**
     * FROM FILTER SEARCH BOX
     * Called when the user searches for a family and clicks on the icon to search
     */
    searchFilter(event) {
        const query = this.searchInputTarget.value.toUpperCase().trim();
        if (query.length > 0) {
            // Clear any existing filter
            this.clearFilter(null, false);

            // Search for matching families and highlight them and add them to legend
            this.applyFamilySearch(query);
        }
    }

    searchFilterInputBox(event) {
        if (event.key === 'Enter') {
            this.searchFilter();
        }
    }

    /**
     * FROM CLEAR FILTER BUTTON
     * Called when the clear filter button is clicked
     */
    clearFilter(event, clearSearchQuery = true) {
        this.checkboxTargets.forEach(checkbox => checkbox.checked = false);
        this.showSwissProtTarget.checked = false;
        this.svgCanvasOutlet.clearAllHighlights();
        this.highlightedFamilyIds.clear();
        this.resetFamilySearch();
        this.resetFamilyCheckboxes();
        this.updateLegend();
        this.updateSelectionStats();

        if (clearSearchQuery)
            this.searchInputTarget.value = '';
    }

    /**
     * FROM LEGEND ITEM
     * Called when the user clicks the legend item to close it
     */
    clearLegendItem(event) {
        const familyId = event.target.dataset.familyId;
        this.toggleAndUpdateCheckbox(familyId, false);
        if (this.highlightedFamilyIds.size === 0) {
            this.clearFilter();
        }
    }

    /**
     * FROM SVG CANVAS CONTROLLER
     * Called from svg canvas controller when the user clicks on an arrow for filtering
     */
    handleArrowClick({ detail: { ctrlKey, altKey, familyChange } }) {
        if (ctrlKey || altKey) {
            familyChange.familyIds.forEach(familyId => {
                const id = familyId.toUpperCase();
                this.updateCheckbox(id, familyChange.highlight);
                this.updateLegendFamilyIds(id, familyChange.highlight);
            });

            this.updateLegend();
            this.updateSelectionStats();
        }
    }




    // ----- HELPERS -----

    /**
     * Show every family and close the accordions
     */
    resetFamilySearch() {
        this.updateFamilyListAccordions(false, false);
    }

    resetFamilyCheckboxes() {
        this.checkboxTargets.forEach(checkbox => {
            const item = checkbox.closest('div');
            if (item) {
                item.style.display = '';
            }
        });
    }

    applyFamilySearch(query) {
        let numPfamFound = 0;
        let numInterproFound = 0;

        this.checkboxTargets.forEach(checkbox => {
            const familyName = (checkbox.dataset.familyName || '').toUpperCase();
            const familyId = (checkbox.dataset.familyId || '');

            const isVisible = familyName.includes(query) || familyId.includes(query);

            const item = checkbox.closest('div'); 

            if (isVisible && item) {
                if (familyId.startsWith('PF'))
                    numPfamFound++;
                if (familyId.startsWith('IPR'))
                    numInterproFound++;
                this.toggleAndUpdateCheckbox(familyId, true);
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });

        this.updateFamilyListAccordions(numPfamFound > 0, numInterproFound > 0);
    }

    updateFamilyListAccordions(showPfam, showInterpro) {
        if (showPfam) {
            this.pfamAccordionButton.classList.remove('collapsed');
            this.pfamAccordion.classList.add('show');
            this.interproAccordionButton.classList.add('collapsed');
            this.interproAccordion.classList.remove('show');
        } else if (showInterpro) {
            this.pfamAccordionButton.classList.add('collapsed');
            this.pfamAccordion.classList.remove('show');
            this.interproAccordionButton.classList.remove('collapsed');
            this.interproAccordion.classList.add('show');
        } else {
            this.pfamAccordionButton.classList.add('collapsed');
            this.interproAccordionButton.classList.add('collapsed');
            this.pfamAccordion.classList.remove('show');
            this.interproAccordion.classList.remove('show');
        }
    }

    updateLegend() {
        const legendData = [];

        for (const familyId of this.highlightedFamilyIds) {
            const md = this.familyNameMap.get(familyId) ?? {};
            legendData.push({
                familyId: familyId,
                familyName: md.name || familyId,
                color: md.color || '#00000000',
            });
        }

        legendData.sort((a, b) => { a.familyId.localeCompare(b.familyId.localeCompare) });

        this.legendContainerTarget.innerHTML = '';

        for (const itemData of legendData) {
            const legendItem = document.createElement('div');
            legendItem.className = 'family-legend-item';
            legendItem.innerHTML = `
                <span class="family-legend-item-color" style="background-color: ${itemData.color}" data-action="click->enzymefunctioninitiative--gnd-viewer-bundle--gnd-filter#clearLegendItem"><i class="bi bi-x" data-family-id="${itemData.familyId}"></i></span>
                <span class="family-legend-item-name">${itemData.familyName}</span>
            `;
            this.legendContainerTarget.appendChild(legendItem);
        }

        if (legendData.length > 0) {
            this.legendContainerTarget.classList.remove('d-none');
        } else {
            this.legendContainerTarget.classList.add('d-none');
        }
    }

    disable() {
        this.fieldsetTarget.disabled = true;
        this.element.classList.add('is-loading');
    }

    enable() {
        this.fieldsetTarget.disabled = false;
        this.element.classList.remove('is-loading');
    }

    /**
     * Update the text box that shows the number of arrows that were selected.
     */
    updateSelectionStats() {
        const numArrowsSelected = this.svgCanvasOutlet.getHighlightedGndCount();
        this.dispatch('arrowHighlightCountUpdated', { detail: { numArrowsSelected }, prefix: 'efi-gnd-global' });
    }

    /**
     * Create a checkbox element that represents the family and return it.
     * @returns {dom element} representing a div containing the checkbox
     */
    createFilterElement(familyId, familyName) {
        // Create the checkbox element
        const div = document.createElement('div');
        div.className = 'form-check filter-item';
        div.innerHTML = `
            <label class="form-check-label">
                <input class="form-check-input" type="checkbox" value="${familyId}" id="fam-${familyId}" data-action="change->enzymefunctioninitiative--gnd-viewer-bundle--gnd-filter#handleFamilyToggle" data-enzymefunctioninitiative--gnd-viewer-bundle--gnd-filter-target="checkbox" data-family-id="${familyId}" data-family-name="${familyName}">
                ${familyName}
            </label>
        `;

        return div;
    }

    /**
     * Add a mapping of family ID to family name.
     */
    addFamilyNameMapping(item) {
        for (let i = 0; i < item.Pfam.length; i++) {
            this.familyNameMap.set(item.Pfam[i].toUpperCase(), { name: item.PfamMerged[i], color: item.Colors[i] });
        }
        for (let i = 0; i < item.InterPro.length; i++) {
            this.familyNameMap.set(item.InterPro[i].toUpperCase(), { name: item.InterProMerged[i], color: '' });
        }
    }

    /**
     * Called internally, initiated by the user in this controller, to check or uncheck a filter item.
     * Calls the svg canvas controller and updates the legend.
     */
    toggleFamily(familyId, isChecked) {
        this.svgCanvasOutlet.toggleFamily(familyId, isChecked);
        this.updateLegendFamilyIds(familyId, isChecked);
        this.updateLegend();
        this.updateSelectionStats();
    }

    toggleAndUpdateCheckbox(familyId, isChecked) {
        this.toggleFamily(familyId, isChecked);
        this.updateCheckbox(familyId, isChecked);
    }

    updateLegendFamilyIds(familyId, isChecked) {
        if (isChecked) {
            this.highlightedFamilyIds.add(familyId);
        } else {
            this.highlightedFamilyIds.delete(familyId);
        }
    }

    updateCheckbox(familyId, isChecked) {
        this.familyCheckboxMap.get(familyId.toUpperCase()).checked = isChecked;
    }
}

