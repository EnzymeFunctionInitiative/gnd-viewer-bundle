import { Controller } from '@hotwired/stimulus';

export default class GndSearchFormController extends Controller {
    static targets = ['query', 'submitButton', 'searchAlert'];

    connect() {
        this.enableUnirefToggleEvents = false;

        const radioButtons = document.querySelectorAll('input[name="uniref-toggle"]');

        // If it exists, then add handler to detect changes between sequence type
        if (radioButtons.length) {
            radioButtons.forEach((btn) => {
                btn.addEventListener('change', (event) => {
                    if (this.enableUnirefToggleEvents) {
                        this.dispatchSearchEvent();
                    }
                });
            });
        }
    }

    /**
     * Get the search query value.
     */
    getSearchQuery() {
        return this.queryTarget.value;
    }

    getSequenceVersion() {
        const selectedRadio = document.querySelector('input[name="uniref-toggle"]:checked');
        if (selectedRadio) {
            return selectedRadio.value;
        } else {
            return 'uniprot';
        }
    }

    submit(event) {
        // Prevent form from normal HTML submission
        event.preventDefault();
        this.submitButtonTarget.disabled = true;

        this.searchAlertTarget.classList.add('d-none');

        this.dispatchSearchEvent();
    }

    dispatchSearchEvent() {
        const query = this.getSearchQuery();
        const seqVersion = this.getSequenceVersion();

        this.enableUnirefToggleEvents = true;

        // Dispatch an event to listeners with the search query
        this.dispatch('submitSearch', {
            detail: { query: query, sequenceVersion: seqVersion }
        });
    }

    /**
     * Event from gnd-app
     */
    invalidSearch() {
        this.searchAlertTarget.classList.remove('d-none');
        this.submitButtonTarget.disabled = false;
    }

    /**
     * Event from gnd-app
     */
    finishedBatchRetrieval() {
        this.submitButtonTarget.disabled = false;
    }
}

