// script.js

// Initialize map
const map = L.map('map').setView([20, 0], 2); // Default world view
const markers = L.markerClusterGroup();
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles © Esri — Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
}).addTo(map);

// Global variables
let allTripsData = []; // All rows with a valid date
let mapTripsData = []; // Only rows with valid location data
let focusedTrip = null;

// Fetch and parse CSV data
Papa.parse('https://docs.google.com/spreadsheets/d/e/2PACX-1vS_E4hP9hOaj5i-jn0eAlZoYceevN7oqNyVsitp9SVUgrQtewIdesdfw8R2tQtFGigyCIPb6S7wxehA/pub?output=csv', {
    download: true,
    header: true,
    complete: function(results) {
        // Parse all rows into allTripsData
        allTripsData = results.data.map((d, i) => ({
            id: i + 1,
            date: d3.timeParse("%B %d, %Y")(d.Date),
            lat: parseFloat(d.Latitude),
            lng: parseFloat(d.Longitude),
            description: d.Description || 'No description',
            photos: d.Photos || ''
        })).filter(d => d.date); // Keep all rows with a valid date

        // Filter for mapTripsData with valid coordinates
        mapTripsData = allTripsData.filter(d => !isNaN(d.lat) && !isNaN(d.lng));

        // Initialize views
        initSidebar();
        initMap();
        fitMapToBounds();
    }
});

// Map setup
function initMap() {
    mapTripsData.forEach(trip => {
        const marker = L.marker([trip.lat, trip.lng], {
            icon: L.divIcon({
                className: 'numbered-marker',
                html: trip.id,
                iconSize: [24, 24]
            })
        }).bindPopup(`
            <div class="popup-event-date">${d3.timeFormat("%B %d, %Y")(trip.date)}</div>
            <div class="popup-short-summary">${trip.description}</div>
        `);
        marker.on('click', () => focusTrip(trip.id));
        markers.addLayer(marker);
    });
    map.addLayer(markers);
}

function fitMapToBounds() {
    if (mapTripsData.length > 0) {
        const bounds = L.latLngBounds(mapTripsData.map(t => [t.lat, t.lng]));
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// Sidebar setup
function initSidebar() {
    const byYear = d3.group(allTripsData, d => d.date.getFullYear());
    const sidebar = d3.select('#event-list');

    byYear.forEach((trips, year) => {
        const yearDiv = sidebar.append('div').attr('class', 'year');
        const toggle = yearDiv.append('div')
            .attr('class', 'toggle')
            .html(`<span class="toggle-indicator">▶</span>${year} <span class="event-count">${trips.length}</span>`)
            .on('click', function() {
                const list = d3.select(this.nextElementSibling);
                const isOpen = list.style('display') === 'block';
                list.style('display', isOpen ? 'none' : 'block');
                d3.select(this).classed('open', !isOpen);
            });

        const yearList = yearDiv.append('div').attr('class', 'year-list');
        trips.forEach(trip => {
            yearList.append('div')
                .attr('class', 'event-container')
                .html(`
                    <div class="state-icons"><div class="state-icon active"></div></div>
                    <div class="event-item" data-id="${trip.id}">
                        <div class="event-date"><span class="event-number-circle">${trip.id}</span>${d3.timeFormat("%B %d")(trip.date)}</div>
                        <div class="event-summary">${trip.description}</div>
                    </div>
                `)
                .on('click', () => focusTrip(trip.id));
        });
    });
}

// Focus trip across views
function focusTrip(id) {
    if (focusedTrip === id) return;
    focusedTrip = id;

    // Update sidebar highlight
    d3.selectAll('.event-item').classed('focused', false);
    d3.select(`.event-item[data-id="${id}"]`).classed('focused', true);

    // Center map if location data exists
    const trip = allTripsData.find(t => t.id === id);
    if (!isNaN(trip.lat) && !isNaN(trip.lng)) {
        map.setView([trip.lat, trip.lng], 10);
        markers.eachLayer(marker => {
            if (marker.options.icon.options.html === id.toString()) {
                marker.openPopup();
            }
        });
    } else {
        console.log('No location data for this trip. Map not centered.');
    }
}
