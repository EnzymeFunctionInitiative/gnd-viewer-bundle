<?php

namespace Efi\GndViewerBundle\Dto;

interface QueryInterface
{
    function getInt(string $queryKey): ?int;
    function has(string $queryKey): bool;
    function get(string $queryKey, mixed $default = null): string|int|float|bool|null;
}
