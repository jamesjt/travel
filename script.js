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
    zoomAnimation: true,
    zoomSnap: 1
}).setView([20, 0], 2);

// Initialize marker cluster group with adjusted clustering settings
const markers = L.markerClusterGroup({
    maxClusterRadius: 1,
    disableClusteringAtZoom: 5
});

L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles © Esri — Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
}).addTo(map);

// Global variables
let allTripsData = [];
let mapTripsData = [];
let focusedTrip = null;

// D3 timeline global variables
let svg, g, gX, iconGroups, xScale, height, margin;
let eventsByDatePerRow = {};

// Function to convert Google Drive view link to thumbnail or full image URL
function convertGoogleDriveUrl(viewUrl, type = 'thumbnail', size = 100) {
    const fileIdMatch = viewUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch) {
        const fileId = fileIdMatch[1];
        if (type === 'thumbnail') {
            return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
        } else {
            return `https://drive.google.com/uc?export=view&id=${fileId}`;
        }
    }
    return viewUrl;
}

// Fetch and parse CSV data
Papa.parse('https://docs.google.com/spreadsheets/d/e/2PACX-1vS_E4hP9hOaj5i-jn0eAlZoYceevN7oqNyVsitp9SVUgrQtewIdesdfw8R2tQtFGigyCIPb6S7wxehA/pub?output=csv', {
    download: true,
    header: true,
    complete: function(results) {
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
            eventType: d['Event Type']
        })).filter(d => d.date);

        mapTripsData = allTripsData.filter(d => !isNaN(d.lat) && !isNaN(d.lng));

        initTimeline();
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

    margin = { top: 20, right: 20, bottom: 30, left: 20 };
    const rowHeight = 15;
    const iconRowsHeight = rows.length * rowHeight;
    const axisHeight = 30;
    height = iconRowsHeight + axisHeight;
    const timelineDiv = document.getElementById('timeline');
    const width = timelineDiv.offsetWidth - margin.left - margin.right;

    svg = d3.select('.timeline-bar')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const minDate = d3.min(allTripsData, d => d.date);
    const maxDate = d3.max(allTripsData, d => d.date);
    const oneYearInMs = 365 * 24 * 60 * 60 * 1000;
    xScale = d3.scaleTime()
        .domain([new Date(minDate.getTime() - oneYearInMs), new Date(maxDate.getTime() + oneYearInMs)])
        .range([0, width]);

    const xAxis = d3.axisBottom(xScale)
        .ticks(d3.timeYear.every(1))
        .tickFormat(d3.timeFormat('%Y'));

    gX = g.append('g')
        .attr('class', 'axis axis--x')
        .attr('transform', `translate(0,${iconRowsHeight})`)
        .call(xAxis);

    iconGroups = g.append('g')
        .attr('class', 'icon-group');

    rows.forEach((row, rowIndex) => {
        const rowY = rowIndex * rowHeight;

        iconGroups.append('rect')
            .attr('x', 0)
            .attr('y', rowY)
            .attr('width', width)
            .attr('height', rowHeight)
            .attr('fill', row.color)
            .attr('opacity', 0.3);

        const rowEvents = allTripsData.filter(d => row.types.includes(d.eventType));
        const eventsByDate = d3.group(rowEvents, d => d3.timeDay(d.date));
        eventsByDatePerRow[rowIndex] = eventsByDate;

        eventsByDate.forEach((events, date) => {
            const n = events.length;
            const iconSize = 12;
            const gap = 2;
            const totalWidth = n * iconSize + (n - 1) * gap;
            const startX = xScale(date) - totalWidth / 2 + iconSize / 2;

            events.forEach((event, i) => {
                const xPos = startX + i * (iconSize + gap);
                const yPos = rowY + rowHeight / 2;

                iconGroups.append('text')
                    .attr('class', 'icon-text')
                    .attr('x', xPos)
                    .attr('y', yPos)
                    .attr('fill', colorMapping[event.eventType])
                    .attr('font-size', '12px')
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'central')
                    .text(unicodeByIcon[iconMapping[event.eventType]])
                    .datum({ event: event, rowIndex: rowIndex })
                    .on('mouseover', function(event) {
                        const data = d3.select(this).datum();
                        const eventData = data.event;
                        const tooltip = d3.select('#timeline-tooltip');
                        tooltip.style('display', 'block')
                            .html(`
                                <div class='event-date'> ${d3.timeFormat("%B %d, %Y")(eventData.date)}</div>
                                <div class='event-summary'> ${eventData.summary}</div>
                                <div class='event-description'> ${eventData.description}</div>
                                <div class='event-review'> ${eventData.review}</div>
                                <div class='event-rating'> ${eventData.rating}</div>
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

    const zoom = d3.zoom()
        .scaleExtent([0.1, 50])
        .translateExtent([[0, 0], [width, height]])
        .on('zoom', zoomed);

    svg.call(zoom).call(zoom.transform, d3.zoomIdentity);

    function zoomed(event) {
        const transform = event.transform;
        const newXScale = transform.rescaleX(xScale);

        let ticks;
        if (transform.k > 10) {
            ticks = d3.timeDay.every(1);
        } else if (transform.k > 5) {
            ticks = d3.timeWeek.every(1);
        } else {
            ticks = d3.timeMonth.every(1);
        }

        const xAxis = d3.axisBottom(newXScale).ticks(ticks);
        gX.call(xAxis);

        iconGroups.selectAll('.icon-text')
            .attr('x', function(d) {
                const rowIndex = d.rowIndex;
                const event = d.event;
                const eventsByDate = eventsByDatePerRow[rowIndex];
                const date = d3.timeDay(event.date);
                const events = eventsByDate.get(date) || [];
                const n = events.length;
                const iconSize = 12;
                const gap = 2;
                const totalWidth = n * iconSize + (n - 1) * gap;
                const startX = newXScale(date) - totalWidth / 2 + iconSize / 2;
                const i = events.indexOf(event);
                return i === -1 ? newXScale(date) : startX + i * (iconSize + gap);
            });
    }

    window.addEventListener('resize', () => {
        const newWidth = timelineDiv.offsetWidth - margin.left - margin.right;
        svg.attr('width', newWidth + margin.left + margin.right);
        xScale.range([0, newWidth]);
        gX.call(d3.axisBottom(xScale));
        iconGroups.selectAll('.icon-text')
            .attr('x', function(d) {
                const rowIndex = d.rowIndex;
                const event = d.event;
                const eventsByDate = eventsByDatePerRow[rowIndex];
                const date = d3.timeDay(event.date);
                const events = eventsByDate.get(date) || [];
                const n = events.length;
                const iconSize = 12;
                const gap = 2;
                const totalWidth = n * iconSize + (n - 1) * gap;
                const startX = xScale(date) - totalWidth / 2 + iconSize / 2;
                const i = events.indexOf(event);
                return i === -1 ? xScale(date) : startX + i * (iconSize + gap);
            });
        iconGroups.selectAll('rect')
            .attr('width', newWidth);
        zoom.translateExtent([[0, 0], [newWidth, height]]);
        svg.call(zoom);
    });
}

// Map setup
function initMap() {
    mapTripsData.forEach(trip => {
        const iconName = iconMapping[trip.eventType] || 'question';
        const markerColor = colorMapping[trip.eventType] || 'blue';
        
        const customIcon = L.AwesomeMarkers.icon({
            icon: iconName,
            prefix: 'fa',
            markerColor: markerColor
        });

        const marker = L.marker([trip.lat, trip.lng], { icon: customIcon }).bindPopup(`
            <div class="popup-event-date">${d3.timeFormat("%B %d, %Y")(trip.date)}</div>
            <div class="popup-short-summary">${trip.summary}</div>
        `);
        marker.tripId = trip.id;

        marker.on('mouseover', function() {
            if (!this.getPopup().isOpen()) {
                this.openPopup();
                this._openedViaHover = true;
            }
        });
        marker.on('mouseout', function() {
            if (this._openedViaHover) {
                this.closePopup();
                this._openedViaHover = false;
            }
        });

        marker.on('click', function() {
            focusTrip(trip.id);
            this.openPopup();
            this._openedViaHover = false;
        });

        markers.addLayer(marker);
    });
    map.addLayer(markers);

    map.on('popupclose', function(e) {
        if (e.popup._source) {
            e.popup._source._openedViaHover = false;
        }
    });
}

function fitMapToBounds() {
    if (mapTripsData.length > 0) {
        const bounds = L.latLngBounds(mapTripsData.map(t => [t.lat, t.lng]));
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// Sidebar setup with photo positioning
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
        const byDay = d3.group(trips, d => d3.timeFormat("%B %d, %Y")(d.date));

        byDay.forEach((dayTrips, date) => {
            const dayContainer = yearList.append('div')
                .attr('class', 'day-container');

            const dayDate = dayContainer.append('div')
                .attr('class', 'day-date')
                .html(`<span class="event-date">${date}</span> <img src="icon-arrow-accordion.svg" class="toggle-indicator" alt="toggle">`)
                .on('click', function() {
                    const events = d3.select(this.nextElementSibling);
                    const isOpen = events.style('display') === 'block';
                    events.style('display', isOpen ? 'none' : 'block');
                    d3.select(this).select('.toggle-indicator').style('transform', isOpen ? 'rotate(-90deg)' : 'rotate(0deg)');
                });

            const eventsContainer = dayContainer.append('div')
                .attr('class', 'events-container')
                .style('display', 'none');

            dayTrips.forEach(trip => {
                const eventItem = eventsContainer.append('div')
                    .attr('class', 'event-item')
                    .attr('data-id', trip.id);

                // Event summary container
                const summaryContainer = eventItem.append('div')
                    .attr('class', 'event-summary-container')
                    .html(`
                        <div class="event-icon"><i class="fas fa-${iconMapping[trip.eventType]}"></i></div>
                        <div class="event-summary">${trip.summary}</div>
                    `)
                    .on('click', () => focusTrip(trip.id));

                summaryContainer.select('.event-icon i')
                    .style('color', colorMapping[trip.eventType] || '#3498db');

                // Photos container below summary
                if (trip.photos && trip.photos.trim() !== '') {
                    const photoUrls = trip.photos.split(',').map(url => url.trim());
                    const photosDiv = eventItem.append('div')
                        .attr('class', 'event-photos');

                    const wrapper = photosDiv.append('div')
                        .attr('class', 'photos-wrapper');

                    photoUrls.forEach((url, index) => {
                        const thumbnailUrl = convertGoogleDriveUrl(url, 'thumbnail');
                        wrapper.append('img')
                            .attr('class', 'event-photo')
                            .attr('src', thumbnailUrl)
                            .attr('alt', 'Event photo')
                            .on('click', () => openOverlay(photoUrls, index));
                    });

                    if (photoUrls.length > 3) {
                        const prevArrow = photosDiv.append('button')
                            .attr('class', 'prev-arrow')
                            .html('<');
                        const nextArrow = photosDiv.append('button')
                            .attr('class', 'next-arrow')
                            .html('>');

                        let currentIndex = 0;
                        const photoWidth = 100;
                        const maxIndex = photoUrls.length - 3;

                        nextArrow.on('click', () => {
                            if (currentIndex < maxIndex) {
                                currentIndex++;
                                wrapper.style('transform', `translateX(-${currentIndex * photoWidth}px)`);
                            }
                        });

                        prevArrow.on('click', () => {
                            if (currentIndex > 0) {
                                currentIndex--;
                                wrapper.style('transform', `translateX(-${currentIndex * photoWidth}px)`);
                            }
                        });
                    }
                }
            });
        });
    });
}

// Focus trip across views
function focusTrip(id) {
    if (focusedTrip === id) return;
    focusedTrip = id;

    d3.selectAll('.event-item').classed('focused', false);
    d3.selectAll('.day-container').classed('focused', false);
    const eventItem = d3.select(`.event-item[data-id="${id}"]`);
    eventItem.classed('focused', true);
    eventItem.node().parentElement.parentElement.classList.add('focused');

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

// Overlay functions with error handling
let currentPhotos = [];
let currentIndex = 0;

function openOverlay(photos, index) {
    currentPhotos = photos;
    currentIndex = index;
    const overlay = d3.select('#photo-overlay');
    overlay.style('display', 'block');
    updateOverlayPhoto();
}

function updateOverlayPhoto() {
    const photoUrl = convertGoogleDriveUrl(currentPhotos[currentIndex], 'thumbnail', 800); // Use larger thumbnail for overlay
    const overlayPhoto = d3.select('#overlay-photo');
    console.log('Setting overlay image to:', photoUrl); // Debug log
    overlayPhoto.attr('src', photoUrl)
        .on('load', function() {
            console.log('Overlay image loaded successfully');
        })
        .on('error', function() {
            console.warn('Failed to load overlay image:', photoUrl);
            overlayPhoto.attr('src', 'images/fallback.jpg'); // Update with your actual fallback image path
        });
}

function nextPhoto() {
    if (currentIndex < currentPhotos.length - 1) {
        currentIndex++;
        updateOverlayPhoto();
    }
}

function prevPhoto() {
    if (currentIndex > 0) {
        currentIndex--;
        updateOverlayPhoto();
    }
}

function closeOverlay() {
    d3.select('#photo-overlay').style('display', 'none');
}

// Set up overlay event listeners
d3.select('.photo-container .next-arrow').on('click', nextPhoto);
d3.select('.photo-container .prev-arrow').on('click', prevPhoto);
d3.select('.close-button').on('click', closeOverlay);
d3.select('.overlay-background').on('click', closeOverlay);
d3.select('.photo-container').on('click', function(event) {
    event.stopPropagation();
});
