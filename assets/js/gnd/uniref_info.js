import Constants from './constants.js';

export default class GndUnirefInfo {
    UNIREF_LABELS = new Map([
        [Constants.UNIPROT, 'UniProt'],
        [Constants.UNIREF90, 'UniRef90'],
        [Constants.UNIREF50, 'UniRef50']
    ]);

    constructor(useUniref, unirefVersion, childUnirefVersion) {
        this.isUniref = useUniref;
        this.unirefVersion = unirefVersion;
        this.childUnirefVersion = childUnirefVersion;
        this.isChildUniref = this.childUnirefVersion !== this.unirefVersion;
    }

    useUniref() {
        return this.isUniref;
    }

    getUnirefIdTypeName() {
        return this.UNIREF_LABELS.get( this.isChildUniref ? this.childUnirefVersion : this.unirefVersion );
    }

    getIdTypeFieldName() {
        return this.UNIREF_LABELS.get( this.isChildUniref ? Constants.UNIPROT : Constants.UNIREF90 );
    }

    getUnirefClusterTypeName() {
        return this.UNIREF_LABELS.get( this.isChildUniref ? Constants.UNIREF90 : this.unirefVersion );
    }

    /**
     * Get the number of IDs for in the given UniRef representatige ID.  If the input ID
     * is UniRef50, the return value is number of UniRef90 IDs, and if the input ID is UniRef90
     * the return value is the number of UniProt IDs in the UniRef cluster.
     * @param {GndDrawableGene} data - data representing a query gene
     * @return number of IDs
     */
    getNumIdsInUnirefCluster(data) {
        const numIds = (this.unirefVersion !== this.childUnirefVersion || this.unirefVersion === Constants.UNIREF90) ? data.NumUniref90Ids : data.NumUniref50Ids;
        return numIds;
    }

    /**
     * Get a URL that is used to load a new window for displaying a "zoom in" view of a UniRef cluster.
     * @param {GndDrawableGene} data - data representing a query gene
     * @return string URL
     */
    getUnirefUrl(data) {
        const url = new URL(window.location.href);
        url.searchParams.set('uniref-id', data.Id);
        url.searchParams.set('seq-ver', this.childUnirefVersion);

        const unirefUrl = url.toString();

        return unirefUrl;
    }
}
