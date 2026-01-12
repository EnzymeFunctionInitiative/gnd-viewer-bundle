<?php

namespace Efi\GndViewerBundle\Service;

use Efi\Gnd\Dto\GndMetadata;
use Efi\Gnd\Enum\SequenceVersion;
use Efi\Gnd\Interface\GndReaderInterface;
use Efi\GndViewerBundle\Dto\GndRequestParams;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class GeneGraphicsExporter implements \IteratorAggregate
{
    public function __construct(
        private readonly GndViewerService $gndViewerService,
        private readonly GndRequestParams $params,
    )
	{
    }

    public function getIterator(): \Generator
    {
        $gndReader = $this->gndViewerService->getReader();
        $gndParams = $this->params->toGndQueryParams();

        $indices = $gndReader->getRangeIndices($this->params->ranges, $gndParams);

        yield "Genome\tID\tStart\tStop\tSize (nt)\tStrand\tFunction\tFC\tSS\tSet\n";

        foreach ($gndReader->iterateRawGndData($indices, $gndParams) as $gnd) {
            $queryProcessed = false;
            foreach ($gnd["neighbors"] as $nb) {
                // Add the query sequence in the proper location
                if ($nb["num"] > $gnd["attributes"]["num"] && $queryProcessed === false) {
                    $queryProcessed = true;
                    yield $this->getFormattedLine($gnd["attributes"]["organism"], $gnd);
                }
                yield $this->getFormattedLine($gnd["attributes"]["organism"], $nb);
            }
            if (!$queryProcessed) {
                yield $this->getFormattedLine($gnd["attributes"]["organism"], $gnd);
            }
        }
    }

    private function getFormattedLine(string $organism, array $data): string
    {
        if (!isset($data["accession"])) {
            return "";
        }

        $pfam = implode("; ", $data["pfam_desc"]);
        if (!$pfam) {
            $pfam = "none";
        }

        $interpro = "";
        if (is_array($data["ipro_family"])) {
            $interpro = implode("; ", preg_grep("/^(?!none)/", $data["ipro_family"]));
            if ($interpro) {
                $interpro = "; InterPro=$interpro";
            }
        }

        $line = implode("\t", [
            $organism,
            $data["accession"],
            round($data["start"] / 3),
            round($data["stop"] / 3),
            $data["seq_len"],
            ($data["direction"] == "complement" ? "-" : "+"),
            $pfam . $interpro,
            "",
            "",
            "",
        ]);
        $line .= "\n";

        return $line;
    }
}
