import { Controller } from '@hotwired/stimulus';

export default class GndLoadingController extends Controller {
    static targets = ['footerActions', 'footerMessage', 'footerProgressContainer', 'footerProgressBar'];

    progressTimerInterval = null;

    connect() {
    }

    disconnect() {
        clearInterval(this.progressTimerInterval);
    }

    showMore() {
        this.startLoadingProcess();
    }

    showAll() {
        this.startLoadingProcess();
    }

    startLoadingProcess() {
        // STATE 1: LOADING
        // Hide buttons and the message, show the progress bar
        this.footerActionsTarget.classList.add('d-none');
        this.footerMessageTarget.classList.add('d-none');
        this.footerProgressContainerTarget.classList.remove('d-none');
        
        // Reset progress bar
        let currentProgress = 0;
        this.footerProgressBarTarget.style.width = '0%';

        // Animate the progress bar
        this.progressTimerInterval = setInterval(() => {
            currentProgress += 1;
            this.footerProgressBarTarget.style.width = currentProgress + '%';
            
            if (currentProgress >= 100) {
                clearInterval(this.progressTimerInterval);
                
                // Simulate a random success or failure after a short delay
                setTimeout(() => {
                    // 60% chance of success, 40% chance of failure
                    const isSuccess = Math.random() > 0.4; 
                    
                    if (isSuccess) {
                        this.handleSuccess();
                    } else {
                        this.handleError();
                    }
                }, 500);
            }
        }, 15);
    }

    handleSuccess() {
        // STATE 2: SUCCESS
        // Hide progress, show buttons and a success message
        this.footerProgressContainerTarget.classList.add('d-none');
        this.footerActionsTarget.classList.remove('d-none');
        
        this.footerMessageTarget.textContent = 'Loaded successfully.';
        this.footerMessageTarget.classList.remove('d-none', 'text-danger');
        this.footerMessageTarget.classList.add('text-muted');
    }

    handleError() {
        // STATE 3: ERROR
        // Hide progress, show buttons and a red error message
        this.footerProgressContainerTarget.classList.add('d-none');
        this.footerActionsTarget.classList.remove('d-none');
        
        this.footerMessageTarget.textContent = 'Error: Could not load data.';
        this.footerMessageTarget.classList.remove('d-none', 'text-muted');
        this.footerMessageTarget.classList.add('text-danger'); // Use Bootstrap's danger color
    }
}
