
export default class Util {
    /**
     * Find the Stimulus controller that is attached to an element.
     * @param {Object} - Stimulus application
     * @param {String} - ID of DOM element that controller is attached to
     * @param {String} - controller ID
     * @returns {Object} - Stimulus controller object
     */
    static findController(application, elementId, controllerIdentifier) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`Element with ID "${elementId}" and controller "${controllerIdentifier}" not found.`);
            return null;
        }
        return application.getControllerForElementAndIdentifier(element, controllerIdentifier);
    }

    /**
     * Dispatches an event to the efi-gnd-global namespace indicating that the controller is
     * connected and ready to go.
     * @param {Controller} controller - Stimulus controller to initiate the event from
     * @param {String} controllerName - name of the controller; needs to match the ones in the
     *     main application required list (e.g. viewer.html.twig, data-efi-...-required-controllers-value='["name", ...]'
     *     if not specified or null, then use the identifier of the controller
     */
    static signalReady(controller, controllerName = null) {
        controller.dispatch('controllerReady', {
            detail: { name: controllerName ?? controller.identifier },
            bubbles: true,
            prefix: 'efi-gnd-global',
        });
    }
}
