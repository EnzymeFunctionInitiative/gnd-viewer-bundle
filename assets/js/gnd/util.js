
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
            console.warn(`Element with ID "${elementId}" not found.`);
            return null;
        }
        return application.getControllerForElementAndIdentifier(element, controllerIdentifier);
    }
}
