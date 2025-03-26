// script.js

// Initialize map
const map = L.map('map').setView([20, 0], 2); // World view
const markers = L.markerClusterGroup();
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles © Esri — Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
}).addTo(map);

// Global variables
let tripsData = [];
let focusedTrip = null;

// Fetch and parse CSV data
Papa.parse('https://docs.google.com/spreadsheets/d/e/2PACX-1vS_E4hP9hOaj5i-jn0eAlZoYceevN7oqNyVsitp9SVUgrQtewIdesdfw8R2tQtFGigyCIPb6S7wxehA/pub?output=csv', {
    download: true,
    header: true,
    complete: function(results) {
        tripsData = results.data.map((d, i) => ({
            id: i + 1,
            date: d3.timeParse("%B %d, %Y")(d.Date), // Updated to match CSV date format
            lat: parseFloat(d.Latitude),
            lng: parseFloat(d.Longitude),
            description: d.Description || 'No description',
            photos: d.Photos || '' // Optional column for photo URLs
        })).filter(d => d.date && !isNaN(d.lat) && !isNaN(d.lng)); // Filter invalid entries

        // Optional: Uncomment for debugging
        // console.log('Parsed tripsData:', tripsData);

        initTimeline();
        initMap();
        initSidebar();
        initListView();
        initGraphView();
        fitMapToBounds();
    }
});

// Timeline setup
function initTimeline() {
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
        .domain(d3.extent(tripsData, d => d.date))
        .range([0, width]);

    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x));

    svg.selectAll('.trip')
        .data(tripsData)
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
    tripsData.forEach(trip => {
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
    if (tripsData.length === 0) {
        console.warn('No valid trip data to fit bounds. Defaulting to world view.');
        map.setView([20, 0], 2); // Default to world view
        return;
    }
    const bounds = L.latLngBounds(tripsData.map(t => [t.lat, t.lng]));
    if (!bounds.isValid()) {
        console.error('Bounds are not valid. Check latitude and longitude values.');
        return;
    }
    map.fitBounds(bounds, { padding: [50, 50] });
}

// Sidebar setup
function initSidebar() {
    const byYear = d3.group(tripsData, d => d.date.getFullYear());
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

// List view setup
function initListView() {
    const listView = d3.select('#list-view');
    tripsData.forEach(trip => {
        listView.append('div')
            .attr('class', 'event-entry')
            .attr('data-id', trip.id)
            .html(`
                <div class="event-header">
                    <span class="event-number">${trip.id}</span>
                    <span>${d3.timeFormat("%B %d, %Y")(trip.date)}</span>
                </div>
                <div class="event-summary">${trip.description}</div>
            `)
            .on('click', () => focusTrip(trip.id));
    });
}

// Graph view setup (Detailed view)
function initGraphView() {
    const graphView = d3.select('#graph-view');
    tripsData.forEach(trip => {
        graphView.append('div')
            .attr('class', 'event-row')
            .attr('data-id', trip.id)
            .html(`
                <div class="event-header">
                    <span class="event-date-text">${d3.timeFormat("%B %d, %Y")(trip.date)}</span>
                </div>
                <div class="event-content">
                    <p>${trip.description}</p>
                    ${trip.photos ? `<div class="image-section"><img src="${trip.photos}" alt="Trip Photo"></div>` : ''}
                </div>
            `)
            .on('click', () => focusTrip(trip.id));
    });
}

// View switching
document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const view = btn.getAttribute('data-view');
        ['map', 'graph-view', 'list-view'].forEach(v => {
            document.getElementById(v).style.display = v === view ? 'block' : 'none';
        });
    });
});

// Focus trip across views
function focusTrip(id) {
    if (focusedTrip === id) return;
    focusedTrip = id;

    // Update sidebar
    d3.selectAll('.event-item').classed('focused', false);
    d3.select(`.event-item[data-id="${id}"]`).classed('focused', true);

    // Update list view
    d3.selectAll('.event-entry').classed('focused', false);
    d3.select(`.event-entry[data-id="${id}"]`).classed('focused', true);

    // Update graph view
    d3.selectAll('.event-row').classed('focused', false);
    d3.select(`.event-row[data-id="${id}"]`).classed('focused', true);

    // Center map and open popup
    const trip = tripsData.find(t => t.id === id);
    map.setView([trip.lat, trip.lng], 10);
    markers.eachLayer(marker => {
        if (marker.options.icon.options.html === id.toString()) {
            marker.openPopup();
        }
    });
}
