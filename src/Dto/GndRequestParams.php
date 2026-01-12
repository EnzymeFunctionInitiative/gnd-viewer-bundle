<?php

namespace Efi\GndViewerBundle\Dto;

use Efi\Gnd\Dto\GndQueryParams;
use Efi\Gnd\Enum\SequenceVersion;

readonly class GndRequestParams
{
    public function __construct(
        public ?int $window = null,
        public ?float $scaleFactor = null,
        public ?SequenceVersion $sequenceVersion = null,
        public ?string $unirefId = null,
        public ?string $rawQuery = null,
        public ?array $ranges = null, // Used by Gene Graphics export
    )
    {
    }

    public static function fromQueryInterface(QueryInterface $bag)
    {
        return new static(
            $bag->getInt('window') ?: GndQueryParams::getDefaultWindow(),
            $bag->has('scale-factor') ? (float) $bag->get('scale-factor') : GndQueryParams::getDefaultScaleFactor(),
            SequenceVersion::tryFrom($bag->get('seq-ver')) ?? GndQueryParams::getDefaultSequenceVersion(),
            $bag->get('uniref-id'),
            $bag->get('query'),
        );
    }

    public function toGndQueryParams(): GndQueryParams
    {
        return new GndQueryParams(
            $this->window ?: GndQueryParams::getDefaultWindow(),
            $this->scaleFactor ?: GndQueryParams::getDefaultScaleFactor(),
            $this->sequenceVersion ?: GndQueryParams::getDefaultSequenceVersion(),
            $this->rawQuery,
            $this->unirefId
        );
    }
}
