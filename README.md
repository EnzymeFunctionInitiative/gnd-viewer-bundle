# gnd-viewer-bundle
Symfony bundle for GND viewer user interface

    # Add to composer.json:

        "repositories": [
            {
                "type": "path",
                "url": "/viewer/bundle/path"
            },
            {
                "type": "path",
                "url": "/efi-gnd-lib/library/path"
            }
        ]

    composer require @efi/gnd-viewer-bundle
   
    # Need to add to assets/controllers.json in consuming app:

        "@efi/gnd-viewer-bundle": {
             "gnd_app": { "fetch": "eager", "enabled": true },
             "gnd_single_gnd": { "fetch": "eager", "enabled": true },
             "gnd_filter": { "fetch": "eager", "enabled": true },
             "gnd_gene_window": { "fetch": "eager", "enabled": true },
             "gnd_info_popup": { "fetch": "eager", "enabled": true },
             "gnd_loading": { "fetch": "eager", "enabled": true },
             "gnd_search_form": { "fetch": "eager", "enabled": true },
             "gnd_svg_canvas": { "fetch": "eager", "enabled": true }
        } 


    ##### Add to importmap.php

    ####    '@efi/gnd-viewer-bundle/styles/gnd.css' => [
    ####        'path' => '@efi/gnd-viewer-bundle/styles/gnd.css',
    ####    ],

    ####php bin/console importmap:require "@efi/gnd-viewer-bundle/styles/gnd.css"
