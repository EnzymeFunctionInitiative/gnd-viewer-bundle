
export default class Util {
    static findController(application, elementId, controllerIdentifier) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`Element with ID "${elementId}" not found.`);
            return null;
        }
        return application.getControllerForElementAndIdentifier(element, controllerIdentifier);
    }
}
