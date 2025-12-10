
/**
 * Represents an individual gene in the GND (e.g. the arrow).
 */
class GndDrawableGene {
    /**
     * Creates an instance a diagram.
     * @param {object} rawData - The raw data from the API for the given gene (either query or neighbor)
     * @param {GndColor} colorService - The service that assigns colors to the arrows
     * @param {bool} isQuery - Flag to determine if the gene is the query gene (central gene)
     */
    constructor(rawData, colorService, isQuery) {
        this.Attr = rawData;
        this.Id = rawData.accession;
        this.Organism = rawData.organism;
        this.TaxonId = rawData.taxon_id;
        this.EnaId = rawData.id;
        this.ClusterNum = rawData.cluster_num;
        this.Evalue = rawData.evalue;
        this.RelStart = parseFloat(rawData.rel_start);
        this.RelWidth = parseFloat(rawData.rel_width);
        this.IsComplement = rawData.direction === "complement";
        this.IsSwissProt = rawData.anno_status == 1 || rawData.anno_status === "Reviewed";
        this.SequenceLength = rawData.seq_len;
        this.Description = rawData.desc;
        this.NumUniref50Ids = typeof rawData.uniref50_size !== 'undefined' ? rawData.uniref50_size : 0;
        this.NumUniref90Ids = typeof rawData.uniref90_size !== 'undefined' ? rawData.uniref90_size : 0;
        
        this.Pfam = rawData.pfam;
        this.InterPro = rawData.interpro;
        
        this.PfamMerged = this.mergeFamily(rawData.pfam, rawData.pfam_desc);
        this.InterProMerged = this.mergeFamily(rawData.interpro, rawData.interpro_desc);

        // Assign colors to the gene representation.  Since each Pfam has it's own color, there
        // may be more than one color, so this is an array.
        this.Colors = colorService.assignColor(rawData, isQuery); 

        this.IsQuery = isQuery;
        if (isQuery) {
            this.LeftContigEnd = this.RightContigEnd = false;
            // Is the end of contig on left or right
            if (rawData.is_bound & 1) {
                this.LeftContigEnd = true;
            }
            if (rawData.is_bound & 2) {
                this.RightContigEnd = true;
            }
        }
    }

    mergeFamily(famList, famDesc) {
        if (!famList || !famDesc) return [];
        return famList.map((fam, i) => `${fam} (${famDesc[i]})`);
    }
}


/**
 * Represents a GND, i.e. a line of gene arrows in the data frame.
 */
class GndDrawableDiagram {
    /**
     * Creates an instance a diagram.
     * @param {object} diagramItem - The raw data from the API for the given diagram (query and neighbors)
     * @param {GndColor} colorService - The service that assigns colors to the arrows
     */
    constructor(diagramItem, colorService) {
        this.Query = new GndDrawableGene(diagramItem.attributes, colorService, true);
        this.N = diagramItem.neighbors.map(nbRawData => new GndDrawableGene(nbRawData, colorService, false));
    }
}


/**
 * Reprents the individual gene arrows in the entire GND data frame, i.e. the current set of
 * diagrams that are displayed in the browser.  This is updated with every set or batch request.
 * An instance is only valid for a single user query.
 */
export default class GndDiagramStore {
    /**
     * Creates an instance of the data store.
     * @param {GndColor} colorService - The service that assigns colors to the arrows
     */
	constructor(colorService) {
        this.colorService = colorService;
        this.diagramIdMap = new Map();
    }

    /**
     * Reset the data store; this occurs when the user updates the search (i.e. by searching for a
     * new cluster or sequence ID).
     */
    reset() {
        this.diagramIdMap = new Map();
    }

    /**
     * Update the store with new data obtained from a query to the backend.  Data is appended
     * to the internal data structure rather than replaced.
     * @param {object} jsonData - The json data structure returned from the API
     * @returns {GndDrawableDiagram[]} List of diagrams that were created
     */
	updateStore(jsonData) {

	    // Use `map` to transform the raw data array into an array of Diagram objects
    	const newDiagrams = jsonData.data.map(diagramItem => new GndDrawableDiagram(diagramItem, this.colorService));

        // For each new diagram, add all of the genes to the ID map
        for (const diagram of newDiagrams) {
            if (diagram.Query && diagram.Query.Id) {
                this.diagramIdMap.set(diagram.Query.Id, diagram.Query);
            }
            for (const nb of diagram.N) {
                this.diagramIdMap.set(nb.Id, nb);
            }
        }

        return newDiagrams;
	}

    /**
     * Get the GndDrawableGene for the given sequence ID.
     * @param {string} geneId - Identifier for the gene
     * @returns {GndDrawableGene} Object representing parameters for an individual gene
     */
    getData(arrowId) {
        // Don't bother with validation because everything is added internally so the data should
        // be consistent.
        return this.diagramIdMap.get(arrowId);
    }
}

