// script.js

// Define icon mappings for event types using Font Awesome icons
const iconMapping = {
    'Travel - Plane': 'plane',
    'Travel - Car': 'car',
    'Travel - Bike': 'bicycle',
    'Travel - Boat': 'ship',
    'Breakfast': 'coffee',
    'Lunch': 'utensils',
    'Dinner': 'wine-glass',
    'Drinks': 'cocktail',
    'Ruins': 'archway',
    'Museum': 'landmark',
    'Hotel': 'bed',
    'Walk': 'walking'
};

// Define color mappings for event types
const colorMapping = {
    'Travel - Plane': 'blue',
    'Travel - Car': 'green',
    'Travel - Bike': 'orange',
    'Travel - Boat': 'purple',
    'Breakfast': 'red',
    'Lunch': 'red',
    'Dinner': 'red',
    'Drinks': 'red',
    'Ruins': 'gray',
    'Museum': 'gray',
    'Hotel': 'pink',
    'Walk': 'yellow'
};

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
        // Parse all rows into allTripsData, including eventType
        allTripsData = results.data.map((d, i) => ({
            id: i + 1,
            date: d3.timeParse("%B %d, %Y")(d.Date),
            lat: parseFloat(d.Latitude),
            lng: parseFloat(d.Longitude),
            description: d.Description || 'No description',
            photos: d.Photos || '',
            eventType: d['Event Type'] // Assuming CSV has an "Event Type" column
        })).filter(d => d.date); // Keep all rows with a valid date

        // Filter for mapTripsData with valid coordinates
        mapTripsData = allTripsData.filter(d => !isNaN(d.lat) && !isNaN(d.lng));

        // Initialize views
        initTimeline();  // Initialize the timeline with allTripsData
        initSidebar();
        initMap();
        fitMapToBounds();
    }
});

// Timeline setup
function initTimeline() {
    if (allTripsData.length === 0) {
        console.warn('No trip data available for timeline.');
        return;
    }

    const margin = { top: 20, right: 20, bottom: 30, left: 20 };
    const width = document.getElementById('timeline').offsetWidth - margin.left - margin.right;
    const height = 120 - margin.top - margin.bottom;

    const svg = d3.select('.timeline-bar')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
        .domain(d3.extent(allTripsData, d => d.date))
        .range([0, width]);

    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x));

    svg.selectAll('.trip')
        .data(allTripsData)
        .enter()
        .append('circle')
        .attr('class', 'trip')
        .attr('cx', d => x(d.date))
        .attr('cy', height / 2)
        .attr('r', 5)
        .attr('fill', '#3498db')
        .on('click', (event, d) => focusTrip(d.id));
}

// Map setup
function initMap() {
    mapTripsData.forEach(trip => {
        // Get icon and color based on eventType, with defaults
        const iconName = iconMapping[trip.eventType] || 'question';
        const markerColor = colorMapping[trip.eventType] || 'blue';
        
        // Create custom icon using Leaflet.awesome-markers
        const customIcon = L.AwesomeMarkers.icon({
            icon: iconName,
            prefix: 'fa', // Use Font Awesome prefix
            markerColor: markerColor
        });

        const marker = L.marker([trip.lat, trip.lng], { icon: customIcon }).bindPopup(`
            <div class="popup-event-date">${d3.timeFormat("%B %d, %Y")(trip.date)}</div>
            <div class="popup-short-summary">${trip.description}</div>
        `);
        marker.tripId = trip.id; // Assign trip ID to marker for identification
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
            .html(`<img src="icon-arrow-accordion.svg" class="toggle-indicator" alt="toggle"> ${year} <span class="event-count">${trips.length}</span>`)
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
            if (marker.tripId === id) {
                marker.openPopup();
            }
        });
    } else {
        console.log('No location data for this trip. Map not centered.');
    }
}
