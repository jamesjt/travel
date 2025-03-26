// script.js

// Define icon mappings for event types using Font Awesome icons
const iconMapping = {
    'Travel - Plane': 'plane',
    'Travel - Car': 'car',
    'Travel - Bike': 'bicycle',
    'Travel - Boat': 'ship',
    'Breakfast': 'utensils',
    'Lunch': 'utensils',
    'Dinner': 'utensils',
    'Drinks': 'cocktail',
    'Cafe': 'coffee',
    'Ruins': 'archway',
    'Museum': 'landmark',
    'Hotel': 'bed',
    'Walk': 'walking'
};

// Define color mappings for event types
const colorMapping = {
    'Travel - Plane': 'black',
    'Travel - Car': 'black',
    'Travel - Bike': 'black',
    'Travel - Boat': 'black',
    'Breakfast': 'red',
    'Lunch': 'red',
    'Dinner': 'red',
    'Drinks': 'red',
    'Cafe': 'red',
    'Ruins': 'blue',
    'Museum': 'blue',
    'Hotel': 'gray',
    'Walk': 'green'
};

// Define rows with their colors and event types for the timeline
// Updated order: travel, hotel, meals, ruins/museums, walk
const rows = [
    { color: 'black', types: ['Travel - Plane', 'Travel - Car', 'Travel - Bike', 'Travel - Boat'] },
    { color: 'gray', types: ['Hotel'] },
    { color: 'red', types: ['Breakfast', 'Lunch', 'Dinner', 'Drinks', 'Cafe'] },
    { color: 'blue', types: ['Ruins', 'Museum'] },
    { color: 'green', types: ['Walk'] }
];

// Define Unicode mappings for Font Awesome icons
const unicodeByIcon = {
    'plane': '\uf072',
    'car': '\uf1b9',
    'bicycle': '\uf206',
    'ship': '\uf21a',
    'utensils': '\uf2e7',
    'cocktail': '\uf561',
    'coffee': '\uf0f4',
    'archway': '\uf557',
    'landmark': '\uf66f',
    'bed': '\uf236',
    'walking': '\uf554'
};

// Initialize map with smooth zoom options
const map = L.map('map', {
    zoomAnimation: true, // Enable smooth zoom transitions
    zoomSnap: 1 // Finer zoom increments (half levels)
}).setView([20, 0], 2); // Default world view

// Initialize marker cluster group with adjusted clustering settings
const markers = L.markerClusterGroup({
    maxClusterRadius: 1, // Clusters form only when markers are within X pixels
    disableClusteringAtZoom: 5 // No clustering at zoom level 15 and above
});

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
            summary: d.Summary || 'No summary',
            description: d.Description || 'No description',
            review: d.Review || 'No review',
            rating: d.Rating || 'No rating',
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

    // Define layout parameters
    const margin = { top: 20, right: 20, bottom: 30, left: 20 };
    const rowHeight = 15; // Changed from 20px to 15px
    const iconRowsHeight = rows.length * rowHeight; // 5 * 15 = 75px
    const axisHeight = 30; // Space for the axis (reduced from timelineHeight of 70px since circles are removed)
    const height = iconRowsHeight + axisHeight; // Total content height = 75 + 30 = 105px
    const width = document.getElementById('timeline').offsetWidth - margin.left - margin.right;

    // Create SVG with adjusted height
    const svg = d3.select('.timeline-bar')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Define x-scale for dates
    const x = d3.scaleTime()
        .domain(d3.extent(allTripsData, d => d.date))
        .range([0, width]);

    // Add icon rows
    rows.forEach((row, rowIndex) => {
        const rowY = rowIndex * rowHeight;

        // Add background rectangle for the row
        svg.append('rect')
            .attr('x', 0)
            .attr('y', rowY)
            .attr('width', width)
            .attr('height', rowHeight)
            .attr('fill', row.color)
            .attr('opacity', 0.3);

        // Filter events for this row
        const rowEvents = allTripsData.filter(d => row.types.includes(d.eventType));

        // Group events by day
        const eventsByDate = d3.group(rowEvents, d => d3.timeDay(d.date));

        // Place icons for each date
        eventsByDate.forEach((events, date) => {
            const n = events.length; // Number of events on this date for this row
            const iconSize = 12; // Reduced from 15px to 12px to scale with row height
            const gap = 2; // Gap between icons (unchanged)
            const totalWidth = n * iconSize + (n - 1) * gap; // Total width for all icons
            const startX = x(date) - totalWidth / 2 + iconSize / 2; // Center icons around date position

            events.forEach((event, i) => {
                const xPos = startX + i * (iconSize + gap); // Position each icon side by side
                const yPos = rowY + rowHeight / 2; // Center vertically in row

                svg.append('text')
                    .attr('class', 'icon-text') // Use CSS to set Font Awesome properties
                    .attr('x', xPos)
                    .attr('y', yPos)
                    .attr('fill', colorMapping[event.eventType]) // Match map marker color
                    .attr('font-size', '12px') // Reduced from 15px to 12px
                    .attr('text-anchor', 'middle') // Center horizontally
                    .attr('dominant-baseline', 'central') // Center vertically
                    .text(unicodeByIcon[iconMapping[event.eventType]]) // Set icon Unicode
                    .datum(event) // Associate data with the element
                    .on('mouseover', function(event) {
                        const eventData = d3.select(this).datum();
                        const tooltip = d3.select('#timeline-tooltip');
                        tooltip.style('display', 'block')
                            .html(`
                                <strong>Date:</strong> ${d3.timeFormat("%B %d, %Y")(eventData.date)}<br>
                                <strong>Summary:</strong> ${eventData.summary}<br>
                                <strong>Description:</strong> ${eventData.description}<br>
                                <strong>Review:</strong> ${eventData.review}<br>
                                <strong>Rating:</strong> ${eventData.rating}
                            `)
                            .style('left', (event.pageX + 10) + 'px')
                            .style('top', (event.pageY - 10) + 'px');
                    })
                    .on('mouseout', function() {
                        d3.select('#timeline-tooltip').style('display', 'none');
                    });
            });
        });
    });

    // Add timeline axis below icon rows
    svg.append('g')
        .attr('transform', `translate(0,${iconRowsHeight})`) // Adjusted to sit directly below icon rows
        .call(d3.axisBottom(x));
    // Circles have been removed as per request
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
            <div class="popup-short-summary">${trip.summary}</div>
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
                        <div class="event-summary">${trip.summary}</div>
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
