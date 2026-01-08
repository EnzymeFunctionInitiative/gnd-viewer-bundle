<?php

namespace Efi\GndViewerBundle\Dto;

interface QueryInterface
{
    function get(string $queryKey, mixed $default = null): string|int|float|bool|null;
}
