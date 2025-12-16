<?php

namespace Efi\GndViewerBundle\Dto;

use Efi\Gnd\Dto\GndQueryParams;
use Efi\Gnd\Enum\SequenceVersion;
use Symfony\Component\HttpFoundation\InputBag;

readonly class GndRequestParams
{
    public ?int $window;
    public ?float $scaleFactor;
    public ?SequenceVersion $sequenceVersion;
    public ?string $unirefId;
    public ?string $rawQuery;

    public function __construct(InputBag $bag)
    {
        $this->window = $bag->getInt('window') ?: GndQueryParams::getDefaultWindow();
        $this->scaleFactor = $bag->has('scale-factor') ? (float) $bag->get('scale-factor') : GndQueryParams::getDefaultScaleFactor();
        $this->sequenceVersion = SequenceVersion::tryFrom($bag->get('seq-ver')) ?? GndQueryParams::getDefaultSequenceVersion();
        $this->unirefId = $bag->get('uniref-id');
        $this->rawQuery = $bag->get('query');
    }

    public function toGndQueryParams(): GndQueryParams
    {
        return new GndQueryParams($this->window, $this->scaleFactor, $this->sequenceVersion, $this->rawQuery, $this->unirefId);
    }
}
