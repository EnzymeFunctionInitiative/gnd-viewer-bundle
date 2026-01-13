
if (!Set.prototype.intersection) {
    Set.prototype.intersection = function(other) {
        const otherSet = new Set(other);
        return new Set([...this].filter(item => otherSet.has(item)));
    };
}

if (!Set.prototype.difference) {
    Set.prototype.difference = function(other) {
        const otherSet = new Set(other);
        return new Set([...this].filter(item => !otherSet.has(item)));
    };
}

