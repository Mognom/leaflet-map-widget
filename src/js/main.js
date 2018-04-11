/*
 * leaflet-map
 * https://github.com/mognom/leaflet-map-widget
 *
 * Copyright (c) 2018 CoNWeT
 * Licensed under the MIT license.
 */

/* globals L HeatmapOverlay*/

(function () {

    "use strict";
    L.Icon.Default.prototype.options.iconUrl = "../../../css/marker-icon.png";

    var PoIs = {};
    var map;

    // Start listening to endpoints and initialize map base layer
    var init = function init() {

        // Register callbacks
        MashupPlatform.wiring.registerCallback('poiInput', function (poi_info) {
            poi_info = parseInputEndpointData(poi_info);
    
            if (!Array.isArray(poi_info)) {
                poi_info = [poi_info];
            }
            poi_info.forEach(registerPoI);

            sendVisiblePoIs();
        });
    
        MashupPlatform.wiring.registerCallback('replacePoIs', function (poi_info) {
            poi_info = parseInputEndpointData(poi_info);
    
            removePoIs();
            if (!Array.isArray(poi_info)) {
                poi_info = [poi_info];
            }
            poi_info.forEach(registerPoI);

            sendVisiblePoIs();
        });

        MashupPlatform.wiring.registerCallback("heatmap", function(config) {
            var data = parseInputEndpointData(config);

            addHeatmap(data);
        });

        createMap();
    };
    
    var createMap = function createMap() {

        var baseLayer = L.tileLayer(
            'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>',
                maxZoom: parseInt(MashupPlatform.prefs.get('maxZoom'), 10),
                minZoom: parseInt(MashupPlatform.prefs.get('minxZoom'), 10)
            }
        );

        var initialCenter = MashupPlatform.prefs.get("initialCenter").split(",").map(Number);
        if (initialCenter.length != 2 || !Number.isFinite(initialCenter[0]) || !Number.isFinite(initialCenter[1])) {
            initialCenter = [0, 0];
        }

        map = new L.Map('mapid', {
            center: new L.LatLng(initialCenter[1], initialCenter[0]),
            zoom: parseInt(MashupPlatform.prefs.get('initialZoom'), 10)
        });
        baseLayer.addTo(map);

        map.on("moveend", sendVisiblePoIs);
        map.on("zoomend", sendVisiblePoIs);
    };

    var parseInputEndpointData = function parseInputEndpointData(data) {
        if (typeof data === "string") {
            try {
                data = JSON.parse(data);
            } catch (e) {
                throw new MashupPlatform.wiring.EndpointTypeError();
            }
        } else if (data == null || typeof data !== "object") {
            throw new MashupPlatform.wiring.EndpointTypeError();
        }
        return data;
    };

    // Remove all markers
    var removePoIs = function removePoIs(){
        map.eachLayer(function (layer) {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });

        PoIs = {};
    };

    var registerPoI = function registerPoI(poi_info) {
        var poi;

        poi = PoIs[poi_info.id];

        var pos = L.latLng(poi_info.location.coordinates[1], poi_info.location.coordinates[0]);
        if (poi == null) {
            poi = L.marker(pos);
            poi.addTo(map);
        } else {
            poi.setLatLng(pos);
        }

        // Add popup
        if (poi_info.title || poi_info.infoWindow) {
            poi.bindPopup("<b>" + poi_info.title + "</b><br>" + poi_info.infoWindow);
        }

        // Configure icon
        var icon, style;
        if (typeof poi_info.icon === 'string') {
            icon = {
                src: poi_info.icon
            };
        } else if (poi_info.icon != null && typeof poi_info.icon === 'object') {
            icon = Object.assign({}, poi_info.icon);
        }

        if (poi_info.icon != null && poi_info.icon !== "") {
            style = L.icon({
                iconUrl: icon.src,
                iconAnchor: [12, 42]
            });
        }

        poi.setIcon(style);

        // Save PoI data to send it on the map's outputs
        poi.data = poi_info;

        // bind event to send function
        poi.on("click", sendSelectedPoI.bind(poi));

        PoIs[poi_info.id] = poi;
    };

    var sendVisiblePoIs = function sendVisiblePoIs() {
        // Skip if there no endpoint connected
        if (!MashupPlatform.widget.outputs.poiListOutput.connected) {
            return;
        }

        // Gather visible pois
        var data = [];
        for (var poi in PoIs) {
            if(map.getBounds().contains(PoIs[poi].getLatLng())) { 
                data.push(PoIs[poi].data);
            }
        }
        
        MashupPlatform.widget.outputs.poiListOutput.pushEvent(data);
    };

    var sendSelectedPoI = function sendSelectedPoI() {
        MashupPlatform.widget.outputs.poiListOutput.pushEvent(this.data);
    };

    // Add a heatmap layer
    var heatmapLayer;
    var addHeatmap = function addHeatmap(data) {
        if (heatmapLayer) {
            map.removeLayer(heatmapLayer);
            heatmapLayer = null;
        }

        if (data.features.length <= 0) {
            return;
        }

        var cfg = {
            // radius should be small ONLY if scaleRadius is true (or small radius is intended)
            // if scaleRadius is false it will be the constant radius used in pixels
            "radius": data.radius,
            "maxOpacity": 0.8,
            // scales the radius based on map zoom
            "scaleRadius": true, 
            // if set to false the heatmap uses the global maximum for colorization
            // if activated: uses the data maximum within the current map boundaries 
            //   (there will always be a red spot with useLocalExtremas true)
            "useLocalExtrema": data.useLocalExtrema || true,
            // which field name in your data represents the latitude - default "lat"
            latField: 'lat',
            // which field name in your data represents the longitude - default "lng"
            lngField: 'lng',
            // which field name in your data represents the data value - default "value"
            valueField: 'weight'
        };
        
        heatmapLayer = new HeatmapOverlay(cfg);
        heatmapLayer.addTo(map);

        var source = {
            max: data.max,
            data: data.features
        };
        heatmapLayer.setData(source);
    };

    init();

})();