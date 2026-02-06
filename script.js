// script.js

// ===== Theme Toggle (runs immediately before rendering) =====
(function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);

    document.addEventListener('DOMContentLoaded', () => {
        const toggle = document.getElementById('theme-toggle');
        const icon = document.getElementById('theme-icon');

        function updateIcon() {
            const current = document.documentElement.getAttribute('data-theme');
            icon.className = current === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
        updateIcon();

        toggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
            updateIcon();
            updateTimelineColors();
        });
    });
})();

// ===== Theme-Aware Color Helpers =====
const eventCategoryVarMap = {
    'Travel - Plane': '--color-event-travel',
    'Travel - Car': '--color-event-travel',
    'Travel - Bike': '--color-event-travel',
    'Travel - Boat': '--color-event-travel',
    'Breakfast': '--color-event-food',
    'Lunch': '--color-event-food',
    'Dinner': '--color-event-food',
    'Drinks': '--color-event-food',
    'Cafe': '--color-event-food',
    'Ruins': '--color-event-culture',
    'Museum': '--color-event-culture',
    'Hotel': '--color-event-hotel',
    'Walk': '--color-event-walk'
};

const rowColorVarMap = {
    'black': '--color-event-travel',
    'red': '--color-event-food',
    'blue': '--color-event-culture',
    'purple': '--color-event-hotel',
    'green': '--color-event-walk'
};

const markerCategoryVarMap = {
    'Travel - Plane': '--color-marker-travel',
    'Travel - Car': '--color-marker-travel',
    'Travel - Bike': '--color-marker-travel',
    'Travel - Boat': '--color-marker-travel',
    'Breakfast': '--color-marker-food',
    'Lunch': '--color-marker-food',
    'Dinner': '--color-marker-food',
    'Drinks': '--color-marker-food',
    'Cafe': '--color-marker-food',
    'Ruins': '--color-marker-culture',
    'Museum': '--color-marker-culture',
    'Hotel': '--color-marker-hotel',
    'Walk': '--color-marker-walk'
};

function getEventColor(eventType) {
    const varName = eventCategoryVarMap[eventType] || '--color-accent';
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function getMarkerColor(eventType) {
    const varName = markerCategoryVarMap[eventType] || '--color-accent';
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function getRowColor(colorName) {
    const varName = rowColorVarMap[colorName] || '--color-accent';
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function updateTimelineColors() {
    if (!iconGroups) return;
    iconGroups.selectAll('.icon-text').attr('fill', function(d) {
        return getEventColor(d.event.eventType);
    });
    iconGroups.selectAll('rect').each(function(d, i) {
        d3.select(this).attr('fill', getRowColor(rows[i].color));
    });
}

// ===== Icon Mappings =====
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

// Define rows with their colors and event types for the timeline
const rows = [
    { color: 'black', types: ['Travel - Plane', 'Travel - Car', 'Travel - Bike', 'Travel - Boat'] },
    { color: 'purple', types: ['Hotel'] },
    { color: 'red', types: ['Breakfast', 'Lunch', 'Dinner', 'Drinks', 'Cafe'] },
    { color: 'blue', types: ['Ruins', 'Museum'] },
    { color: 'green', types: ['Walk'] }
];

// Lane filter labels (parallel to rows array)
const laneLabels = [
    { label: 'Travel', icon: 'plane' },
    { label: 'Hotel', icon: 'bed' },
    { label: 'Food', icon: 'utensils' },
    { label: 'Culture', icon: 'landmark' },
    { label: 'Walk', icon: 'walking' }
];
let hiddenLanes = new Set();
let allMarkers = [];

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
    maxClusterRadius: 20,
    disableClusteringAtZoom: 15,
    spiderfyOnMaxZoom: true,
    zoomToBoundsOnClick: false,
    showCoverageOnHover: false,
    iconCreateFunction: function(cluster) {
        const children = cluster.getAllChildMarkers();
        const count = children.length;
        // Pip size and layout
        const pipSize = 9;
        const centerR = 14; // center circle radius
        const gap = 3; // space between pip edge and center circle
        const orbitR = centerR + gap + pipSize / 2; // pip center orbit radius
        const diameter = Math.ceil((orbitR + pipSize / 2) * 2) + 2; // total icon size
        const cx = diameter / 2;
        const cy = diameter / 2;
        // Build pips — one per marker, arranged in a circle
        let pips = '';
        const angleStep = (Math.PI * 2) / count;
        let angle = -Math.PI / 2; // start at top
        children.forEach(m => {
            const color = getMarkerColor(m._tripEventType);
            const x = cx + orbitR * Math.cos(angle) - pipSize / 2;
            const y = cy + orbitR * Math.sin(angle) - pipSize / 2;
            pips += `<div class="cluster-pip" style="left:${x}px;top:${y}px;background:${color}"></div>`;
            angle += angleStep;
        });
        const html = `<div class="cluster-wrapper" style="width:${diameter}px;height:${diameter}px">
            ${pips}
            <div class="cluster-center" style="width:${centerR * 2}px;height:${centerR * 2}px">
                <span class="cluster-count">${count}</span>
            </div>
        </div>`;
        return L.divIcon({
            html: html,
            className: 'marker-cluster-pip',
            iconSize: L.point(diameter, diameter)
        });
    }
});

L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri'
}).addTo(map);

// Global variables
let allTripsData = [];
let mapTripsData = [];
let focusedTrip = null;

// D3 timeline global variables
let svg, g, gX, iconGroups, xScale, height, margin;
let eventsByDatePerRow = {};
let clusterGroup;
let timelineZoom;
let timelineWidth;
let timelineZoomed; // reference to zoomed() closure
let expandedClusterIds = new Set(); // track manually expanded clusters

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
        initViewSwitching();
        initListView();
        initGraphView();
        initSidebarSearch();
        initLaneFilters();

        // Hide loading overlay
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
            setTimeout(() => loadingOverlay.remove(), 400);
        }
    },
    error: function(error) {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.querySelector('.loading-spinner').innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <p>Failed to load trip data</p>
                <p class="error-detail">Check your internet connection and refresh.</p>
            `;
        }
    }
});

// Timeline clustering
const MERGE_GAP = 4;
const ICON_SIZE = 12;
const ICON_GAP = 2;

function computeRowClusters(rowIndex, newXScale, hiddenTypes) {
    const eventsByDate = eventsByDatePerRow[rowIndex];
    if (!eventsByDate) return [];

    const dateGroups = [];
    eventsByDate.forEach((events, date) => {
        const visible = events.filter(e => !hiddenTypes.has(e.eventType) && !expandedClusterIds.has(e.id));
        if (visible.length === 0) return;
        const x = newXScale(date);
        const n = visible.length;
        const halfW = (n * ICON_SIZE + (n - 1) * ICON_GAP) / 2;
        dateGroups.push({ date, events: visible, x, left: x - halfW, right: x + halfW });
    });

    dateGroups.sort((a, b) => a.x - b.x);

    const clusters = [];
    let cur = null;
    dateGroups.forEach(grp => {
        if (!cur) {
            cur = { events: [...grp.events], left: grp.left, right: grp.right, dateCount: 1 };
        } else if (grp.left - cur.right < MERGE_GAP) {
            cur.events.push(...grp.events);
            cur.right = Math.max(cur.right, grp.right);
            cur.dateCount++;
        } else {
            clusters.push(cur);
            cur = { events: [...grp.events], left: grp.left, right: grp.right, dateCount: 1 };
        }
    });
    if (cur) clusters.push(cur);

    return clusters.map(c => ({
        events: c.events,
        cx: (c.left + c.right) / 2,
        isCluster: c.dateCount > 1,
        rowIndex: rowIndex
    }));
}

function updateTimelineClusters(clusters) {
    if (!clusterGroup) return;
    const rowHeight = 15;

    const groups = clusterGroup.selectAll('.timeline-cluster')
        .data(clusters, d => `${d.rowIndex}-${d.cx.toFixed(0)}`);

    groups.exit().remove();

    const enter = groups.enter()
        .append('g')
        .attr('class', 'timeline-cluster')
        .style('cursor', 'pointer');

    const merged = enter.merge(groups);

    merged.each(function(d) {
        const el = d3.select(this);
        el.selectAll('*').remove();

        const cy = d.rowIndex * rowHeight + rowHeight / 2;
        el.attr('transform', `translate(${d.cx}, ${cy})`);

        el.append('text')
            .attr('class', 'timeline-cluster-count')
            .attr('x', 0)
            .attr('y', 0)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'central')
            .attr('fill', getEventColor(d.events[0].eventType))
            .text(d.events.length);
    });

    // Hover & click handlers
    merged
        .on('mouseover', function(mouseEvent, d) {
            const tooltipEl = document.getElementById('timeline-tooltip');
            const byType = d3.group(d.events, e => e.eventType);
            const dates = d.events.map(e => e.date).sort((a, b) => a - b);
            const startDate = d3.timeFormat("%b %d")(dates[0]);
            const endDate = d3.timeFormat("%b %d, %Y")(dates[dates.length - 1]);

            let html = `<div class='tip-header'>
                <i class='fas fa-layer-group tip-icon'></i>
                <span class='tip-type'>${d.events.length} Events</span>
            </div>
            <div class='tip-date'>${startDate} — ${endDate}</div>`;

            byType.forEach((evts, type) => {
                const iconName = iconMapping[type] || 'question';
                const color = getEventColor(type);
                html += `<div class='tip-cluster-row'>
                    <i class='fas fa-${iconName}' style='color:${color}'></i>
                    <span>${type}: ${evts.length}</span>
                </div>`;
            });

            tooltipEl.innerHTML = html;
            tooltipEl.style.display = 'block';

            const tipRect = tooltipEl.getBoundingClientRect();
            const viewW = window.innerWidth;
            const viewH = window.innerHeight;
            let left = mouseEvent.pageX + 10;
            let top = mouseEvent.pageY - 10;
            if (mouseEvent.clientX + 10 + tipRect.width > viewW) left = mouseEvent.pageX - tipRect.width - 10;
            if (mouseEvent.clientY - 10 + tipRect.height > viewH) top = mouseEvent.pageY - tipRect.height - 10;
            tooltipEl.style.left = left + 'px';
            tooltipEl.style.top = top + 'px';
        })
        .on('mouseout', function() {
            document.getElementById('timeline-tooltip').style.display = 'none';
        })
        .on('click', function(mouseEvent, d) {
            // Expand cluster — show individual icons in place
            d.events.forEach(e => expandedClusterIds.add(e.id));
            document.getElementById('timeline-tooltip').style.display = 'none';
            // Re-run clustering to reflect the expansion
            if (svg && timelineZoomed) {
                timelineZoomed({ transform: d3.zoomTransform(svg.node()) });
            }
        });
}

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
    timelineWidth = width;

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

    clusterGroup = g.append('g')
        .attr('class', 'cluster-group');

    rows.forEach((row, rowIndex) => {
        const rowY = rowIndex * rowHeight;

        iconGroups.append('rect')
            .attr('x', 0)
            .attr('y', rowY)
            .attr('width', width)
            .attr('height', rowHeight)
            .attr('fill', getRowColor(row.color))
            .attr('opacity', 0.15);

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
                    .attr('fill', getEventColor(event.eventType))
                    .attr('font-size', '12px')
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'central')
                    .text(unicodeByIcon[iconMapping[event.eventType]])
                    .datum({ event: event, rowIndex: rowIndex })
                    .on('mouseover', function(event) {
                        const data = d3.select(this).datum();
                        const eventData = data.event;
                        const tooltipEl = document.getElementById('timeline-tooltip');

                        // Grow icon on hover
                        d3.select(this).attr('font-size', '15px');

                        const iconName = iconMapping[eventData.eventType] || 'question';
                        tooltipEl.innerHTML = `
                            <div class='tip-header'>
                                <i class='fas fa-${iconName} tip-icon' style='color: ${getEventColor(eventData.eventType)}'></i>
                                <span class='tip-type'>${eventData.eventType}</span>
                            </div>
                            <div class='tip-date'>${d3.timeFormat("%B %d, %Y")(eventData.date)}</div>
                            <div class='tip-summary'>${eventData.summary}</div>
                        `;
                        tooltipEl.style.display = 'block';

                        // Position with viewport bounds checking
                        const tipRect = tooltipEl.getBoundingClientRect();
                        const viewW = window.innerWidth;
                        const viewH = window.innerHeight;
                        let left = event.pageX + 10;
                        let top = event.pageY - 10;

                        if (event.clientX + 10 + tipRect.width > viewW) {
                            left = event.pageX - tipRect.width - 10;
                        }
                        if (event.clientY - 10 + tipRect.height > viewH) {
                            top = event.pageY - tipRect.height - 10;
                        }

                        tooltipEl.style.left = left + 'px';
                        tooltipEl.style.top = top + 'px';
                    })
                    .on('mouseout', function() {
                        d3.select(this).attr('font-size', '12px');
                        document.getElementById('timeline-tooltip').style.display = 'none';
                    })
                    .on('click', function() {
                        const data = d3.select(this).datum();
                        focusTrip(data.event.id);
                        d3.select('#timeline-tooltip').style('display', 'none');
                    })
                    .style('cursor', 'pointer');
            });
        });
    });

    timelineZoom = d3.zoom()
        .scaleExtent([0.1, 50])
        .translateExtent([[0, 0], [width, height]])
        .on('zoom', zoomed);

    svg.call(timelineZoom).call(timelineZoom.transform, d3.zoomIdentity);

    timelineZoomed = zoomed;
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

        // Reposition all icons
        iconGroups.selectAll('.icon-text')
            .attr('x', function(d) {
                const rowIndex = d.rowIndex;
                const evt = d.event;
                const eventsByDate = eventsByDatePerRow[rowIndex];
                const date = d3.timeDay(evt.date);
                const events = eventsByDate.get(date) || [];
                const n = events.length;
                const totalWidth = n * ICON_SIZE + (n - 1) * ICON_GAP;
                const startX = newXScale(date) - totalWidth / 2 + ICON_SIZE / 2;
                const i = events.indexOf(evt);
                return i === -1 ? newXScale(date) : startX + i * (ICON_SIZE + ICON_GAP);
            });

        // Reset expanded clusters on zoom scale change
        if (expandedClusterIds.size > 0 && transform.k !== (zoomed._lastK || null)) {
            expandedClusterIds.clear();
        }
        zoomed._lastK = transform.k;

        // Compute clusters and update visibility
        const hiddenTypes = new Set();
        hiddenLanes.forEach(i => rows[i].types.forEach(t => hiddenTypes.add(t)));

        const allClusters = [];
        rows.forEach((row, rowIndex) => {
            if (hiddenLanes.has(rowIndex)) return;
            const rowClusters = computeRowClusters(rowIndex, newXScale, hiddenTypes);
            allClusters.push(...rowClusters);
        });

        const clusteredEventIds = new Set();
        allClusters.filter(c => c.isCluster).forEach(c => {
            c.events.forEach(e => clusteredEventIds.add(e.id));
        });

        // Show/hide individual icons based on filters + clustering
        iconGroups.selectAll('.icon-text')
            .attr('display', function(d) {
                if (hiddenTypes.has(d.event.eventType)) return 'none';
                if (clusteredEventIds.has(d.event.id)) return 'none';
                return null;
            });

        updateTimelineClusters(allClusters.filter(c => c.isCluster));
    }

    window.addEventListener('resize', () => {
        const newWidth = timelineDiv.offsetWidth - margin.left - margin.right;
        timelineWidth = newWidth;
        svg.attr('width', newWidth + margin.left + margin.right);
        xScale.range([0, newWidth]);
        iconGroups.selectAll('rect').attr('width', newWidth);
        timelineZoom.translateExtent([[0, 0], [newWidth, height]]);
        svg.call(timelineZoom);
        // Re-trigger zoom to reposition icons and recalculate clusters
        zoomed({ transform: d3.zoomTransform(svg.node()) });
    });
}

// Map setup
function initMap() {
    mapTripsData.forEach(trip => {
        const iconName = iconMapping[trip.eventType] || 'question';

        const customIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div class="marker-circle" style="background-color: ${getMarkerColor(trip.eventType)}">
                       <i class="fas fa-${iconName}"></i>
                   </div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            popupAnchor: [0, -16]
        });

        const marker = L.marker([trip.lat, trip.lng], { icon: customIcon }).bindPopup(`
            <div class="tip-header">
                <i class="fas fa-${iconName} tip-icon" style="color: ${getEventColor(trip.eventType)}"></i>
                <span class="tip-type">${trip.eventType}</span>
            </div>
            <div class="tip-date">${d3.timeFormat("%B %d, %Y")(trip.date)}</div>
            <div class="tip-summary">${trip.summary}</div>
        `);
        marker.tripId = trip.id;
        marker._hoverTimeout = null;

        marker.on('mouseover', function() {
            const self = this;
            if (!self.getPopup().isOpen()) {
                self._hoverTimeout = setTimeout(function() {
                    self.openPopup();
                    self._openedViaHover = true;
                }, 120);
            }
        });
        marker.on('mouseout', function() {
            if (this._hoverTimeout) {
                clearTimeout(this._hoverTimeout);
                this._hoverTimeout = null;
            }
            if (this._openedViaHover) {
                this.closePopup();
                this._openedViaHover = false;
            }
        });

        marker.on('click', function() {
            if (this._hoverTimeout) {
                clearTimeout(this._hoverTimeout);
                this._hoverTimeout = null;
            }
            focusTrip(trip.id, true);
            this.openPopup();
            this._openedViaHover = false;
        });

        marker._tripEventType = trip.eventType;
        allMarkers.push(marker);
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

// Sidebar setup
function initSidebar() {
    const byYear = d3.group(allTripsData, d => d.date.getFullYear());
    const sidebar = d3.select('#event-list');

    byYear.forEach((trips, year) => {
        const yearDiv = sidebar.append('div').attr('class', 'year');
        yearDiv.append('div')
            .attr('class', 'toggle')
            .html(`<i class="fas fa-chevron-down toggle-indicator"></i> ${year} <span class="event-count">${trips.length}</span>`)
            .on('click', function() {
                const list = this.nextElementSibling;
                const isOpen = list.classList.contains('show');
                list.classList.toggle('show', !isOpen);
                d3.select(this).classed('open', !isOpen);
            });

        const yearList = yearDiv.append('div').attr('class', 'year-list');
        const byDay = d3.group(trips, d => d3.timeFormat("%B %d, %Y")(d.date));

        byDay.forEach((dayTrips, date) => {
            const dayContainer = yearList.append('div')
                .attr('class', 'day-container');

            dayContainer.append('div')
                .attr('class', 'day-date')
                .html(`<i class="fas fa-chevron-down toggle-indicator"></i> <span class="event-date">${date}</span>`)
                .on('click', function() {
                    const events = this.nextElementSibling;
                    const isOpen = events.classList.contains('show');
                    events.classList.toggle('show', !isOpen);
                    d3.select(this).select('.toggle-indicator')
                        .style('transform', isOpen ? 'rotate(-90deg)' : 'rotate(0deg)');
                });

            const eventsContainer = dayContainer.append('div')
                .attr('class', 'events-container show');

            dayTrips.forEach(trip => {
                const eventItem = eventsContainer.append('div')
                    .attr('class', 'event-item')
                    .attr('data-id', trip.id);

                const summaryContainer = eventItem.append('div')
                    .attr('class', 'event-summary-container')
                    .html(`
                        <div class="event-icon"><i class="fas fa-${iconMapping[trip.eventType]}"></i></div>
                        <div class="event-summary">${trip.summary}</div>
                    `)
                    .on('click', () => focusTrip(trip.id));

                summaryContainer.select('.event-icon i')
                    .style('color', getEventColor(trip.eventType));

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
                            .html('<i class="fas fa-chevron-left"></i>');
                        const nextArrow = photosDiv.append('button')
                            .attr('class', 'next-arrow')
                            .html('<i class="fas fa-chevron-right"></i>');

                        let currentIndex = 0;
                        const photoWidth = 60; // 56px photo + 4px gap
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
// skipMapMove: when true, don't pan/zoom the map (used for direct marker clicks)
function focusTrip(id, skipMapMove) {
    if (focusedTrip === id) return;
    focusedTrip = id;

    d3.selectAll('.event-item').classed('focused', false);
    d3.selectAll('.day-container').classed('focused', false);
    const eventItem = d3.select(`.event-item[data-id="${id}"]`);
    if (!eventItem.node()) return;

    // Expand parent accordions so the item is visible
    const node = eventItem.node();

    // Expand events-container (day accordion)
    const eventsContainer = node.closest('.events-container');
    if (eventsContainer) {
        eventsContainer.classList.add('show');
        const dayDate = eventsContainer.previousElementSibling;
        if (dayDate && dayDate.classList.contains('day-date')) {
            dayDate.querySelector('.toggle-indicator').style.transform = 'rotate(0deg)';
        }
    }

    // Expand year-list (year accordion)
    const yearList = node.closest('.year-list');
    if (yearList) {
        yearList.classList.add('show');
        const yearToggle = yearList.previousElementSibling;
        if (yearToggle && yearToggle.classList.contains('toggle')) {
            d3.select(yearToggle).classed('open', true);
        }
    }

    eventItem.classed('focused', true);
    const dayContainer = node.closest('.day-container');
    if (dayContainer) dayContainer.classList.add('focused');

    // Scroll the sidebar to the focused item
    node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    const trip = allTripsData.find(t => t.id === id);
    if (!isNaN(trip.lat) && !isNaN(trip.lng) && !skipMapMove) {
        // Zoom to at least disableClusteringAtZoom so the marker is unclustered
        const minZoom = 15;
        const targetZoom = Math.max(map.getZoom(), minZoom);
        map.setView([trip.lat, trip.lng], targetZoom);
        markers.eachLayer(marker => {
            if (marker.tripId === id) {
                marker.openPopup();
            }
        });
    }
}

// ===== Photo Overlay =====
let currentPhotos = [];
let currentIndex = 0;

function openOverlay(photos, index) {
    currentPhotos = photos;
    currentIndex = index;
    const overlay = document.getElementById('photo-overlay');
    overlay.classList.add('active');
    updateOverlayPhoto();
}

function updateOverlayPhoto() {
    const imgElement = document.getElementById('overlay-photo');
    const rawUrl = currentPhotos[currentIndex];
    const sizes = [800, 400, 200, 100];
    let attempt = 0;

    imgElement.classList.remove('loaded');

    // Update photo counter
    const counter = document.getElementById('photo-counter');
    if (counter) {
        counter.textContent = `${currentIndex + 1} / ${currentPhotos.length}`;
    }

    // Update arrow disabled states
    const prevBtn = document.querySelector('#photo-overlay .prev-arrow');
    const nextBtn = document.querySelector('#photo-overlay .next-arrow');
    if (prevBtn) prevBtn.classList.toggle('disabled', currentIndex === 0);
    if (nextBtn) nextBtn.classList.toggle('disabled', currentIndex === currentPhotos.length - 1);

    function tryLoad() {
        const photoUrl = convertGoogleDriveUrl(rawUrl, 'thumbnail', sizes[attempt]);
        imgElement.onload = function() {
            imgElement.classList.add('loaded');
        };
        imgElement.onerror = function() {
            attempt++;
            if (attempt < sizes.length) {
                tryLoad();
            } else {
                imgElement.onerror = null;
                imgElement.alt = 'Image failed to load';
                imgElement.classList.add('loaded');
            }
        };
        imgElement.src = photoUrl;
    }

    tryLoad();
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
    const overlay = document.getElementById('photo-overlay');
    overlay.classList.remove('active');
}

// Set up overlay event listeners
d3.select('.photo-container .next-arrow').on('click', nextPhoto);
d3.select('.photo-container .prev-arrow').on('click', prevPhoto);
d3.select('.close-button').on('click', closeOverlay);
d3.select('.overlay-background').on('click', closeOverlay);
d3.select('.photo-container').on('click', function(event) {
    event.stopPropagation();
});

// Keyboard support for overlay
document.addEventListener('keydown', (e) => {
    const overlay = document.getElementById('photo-overlay');
    if (!overlay.classList.contains('active')) return;

    if (e.key === 'Escape') closeOverlay();
    if (e.key === 'ArrowRight') nextPhoto();
    if (e.key === 'ArrowLeft') prevPhoto();
});

// ===== View Switching =====
function initViewSwitching() {
    const viewBtns = document.querySelectorAll('.view-btn');
    const mapEl = document.getElementById('map');
    const graphEl = document.getElementById('graph-view');
    const listEl = document.getElementById('list-view');

    viewBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            viewBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const view = btn.dataset.view;
            mapEl.style.display = view === 'map' ? 'block' : 'none';
            graphEl.style.display = view === 'graph' ? 'block' : 'none';
            listEl.style.display = view === 'list' ? 'block' : 'none';

            if (view === 'map') {
                setTimeout(() => map.invalidateSize(), 100);
            }
        });
    });
}

// ===== List View =====
function initListView() {
    const listView = document.getElementById('list-view');
    listView.innerHTML = '';

    const sorted = [...allTripsData].sort((a, b) => b.date - a.date);

    sorted.forEach(trip => {
        const card = document.createElement('div');
        card.className = 'list-card';
        card.setAttribute('data-id', trip.id);

        const iconName = iconMapping[trip.eventType] || 'question';
        const color = getEventColor(trip.eventType);
        const dateStr = d3.timeFormat("%B %d, %Y")(trip.date);
        const stars = trip.rating !== 'No rating' ? '&#9733;'.repeat(Math.min(parseInt(trip.rating) || 0, 5)) : '';

        card.innerHTML = `
            <div class="list-card-header">
                <i class="fas fa-${iconName} list-card-icon" style="color: ${color}"></i>
                <span class="list-card-type">${trip.eventType}</span>
                <span class="list-card-date">${dateStr}</span>
                ${stars ? `<span class="list-card-rating">${stars}</span>` : ''}
            </div>
            <div class="list-card-summary">${trip.summary}</div>
            ${trip.description !== 'No description' ? `<div class="list-card-desc">${trip.description}</div>` : ''}
            ${trip.review !== 'No review' ? `<div class="list-card-review">${trip.review}</div>` : ''}
        `;

        card.addEventListener('click', () => {
            // Switch to map view and focus
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('.view-btn[data-view="map"]').classList.add('active');
            document.getElementById('map').style.display = 'block';
            document.getElementById('graph-view').style.display = 'none';
            document.getElementById('list-view').style.display = 'none';
            setTimeout(() => map.invalidateSize(), 100);
            focusTrip(trip.id);
        });

        listView.appendChild(card);
    });
}

// ===== Graph/Details View =====
function initGraphView() {
    const graphView = document.getElementById('graph-view');

    const totalEvents = allTripsData.length;
    const dates = allTripsData.map(d => d.date).sort((a, b) => a - b);
    const dateRange = dates.length > 0
        ? `${d3.timeFormat("%b %d, %Y")(dates[0])} — ${d3.timeFormat("%b %d, %Y")(dates[dates.length - 1])}`
        : 'N/A';

    const locations = new Set(allTripsData.map(d => d.summary));
    const eventTypes = d3.group(allTripsData, d => d.eventType);

    let breakdownHTML = '';
    eventTypes.forEach((events, type) => {
        const iconName = iconMapping[type] || 'question';
        const color = getEventColor(type);
        breakdownHTML += `
            <div class="detail-row">
                <i class="fas fa-${iconName}" style="color: ${color}"></i>
                <span class="detail-type">${type}</span>
                <span class="detail-count">${events.length}</span>
            </div>
        `;
    });

    graphView.innerHTML = `
        <div class="details-dashboard">
            <h2 class="details-title">Trip Summary</h2>
            <div class="details-stats">
                <div class="stat-card">
                    <div class="stat-value">${totalEvents}</div>
                    <div class="stat-label">Total Events</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${locations.size}</div>
                    <div class="stat-label">Unique Locations</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${eventTypes.size}</div>
                    <div class="stat-label">Event Types</div>
                </div>
            </div>
            <div class="details-date-range">${dateRange}</div>
            <h3 class="details-subtitle">Breakdown by Type</h3>
            <div class="details-breakdown">
                ${breakdownHTML}
            </div>
        </div>
    `;
}

// ===== Resize Handle =====
function initResizeHandle() {
    const handle = document.querySelector('.resize-handle');
    const sidebar = document.getElementById('sidebar');
    if (!handle || !sidebar) return;

    let isDragging = false;

    handle.addEventListener('mousedown', (e) => {
        isDragging = true;
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const newWidth = Math.min(Math.max(e.clientX, 150), 800);
        sidebar.style.flex = `0 0 ${newWidth}px`;
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            map.invalidateSize();
        }
    });
}

// ===== Sidebar Search =====
function initSidebarSearch() {
    const searchInput = document.getElementById('sidebar-search');
    if (!searchInput) return;

    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase().trim();
        const eventItems = document.querySelectorAll('.event-item');
        const dayContainers = document.querySelectorAll('.day-container');
        const yearDivs = document.querySelectorAll('.year');

        if (!query) {
            // Restore: show all items, collapse all accordions
            eventItems.forEach(item => item.style.display = '');
            dayContainers.forEach(dc => dc.style.display = '');
            yearDivs.forEach(yd => yd.style.display = '');
            document.querySelectorAll('.year-list').forEach(yl => yl.classList.remove('show'));
            document.querySelectorAll('.events-container').forEach(ec => ec.classList.remove('show'));
            document.querySelectorAll('.year .toggle').forEach(t => d3.select(t).classed('open', false));
            document.querySelectorAll('.toggle-indicator').forEach(ti => ti.style.transform = '');
            return;
        }

        // Filter event items
        eventItems.forEach(item => {
            const id = parseInt(item.getAttribute('data-id'));
            const trip = allTripsData.find(t => t.id === id);
            const matches = trip && (
                trip.summary.toLowerCase().includes(query) ||
                trip.description.toLowerCase().includes(query) ||
                trip.eventType.toLowerCase().includes(query) ||
                trip.review.toLowerCase().includes(query)
            );
            item.style.display = matches ? '' : 'none';
        });

        // Show/hide day containers based on whether they have visible items
        dayContainers.forEach(dc => {
            const visibleItems = dc.querySelectorAll('.event-item:not([style*="display: none"])');
            if (visibleItems.length > 0) {
                dc.style.display = '';
                // Auto-expand
                const eventsContainer = dc.querySelector('.events-container');
                if (eventsContainer) eventsContainer.classList.add('show');
                const indicator = dc.querySelector('.toggle-indicator');
                if (indicator) indicator.style.transform = 'rotate(0deg)';
            } else {
                dc.style.display = 'none';
            }
        });

        // Show/hide year groups based on whether they have visible day containers
        yearDivs.forEach(yd => {
            const visibleDays = yd.querySelectorAll('.day-container:not([style*="display: none"])');
            if (visibleDays.length > 0) {
                yd.style.display = '';
                const yearList = yd.querySelector('.year-list');
                if (yearList) yearList.classList.add('show');
                const toggle = yd.querySelector('.toggle');
                if (toggle) d3.select(toggle).classed('open', true);
            } else {
                yd.style.display = 'none';
            }
        });
    });
}

// ===== Lane Filters =====
function initLaneFilters() {
    const container = document.getElementById('lane-toggles');
    if (!container) return;

    // Convert a color to rgba with given alpha (matches timeline lane row opacity)
    function colorWithAlpha(color, alpha) {
        const temp = document.createElement('div');
        temp.style.color = color;
        document.body.appendChild(temp);
        const computed = getComputedStyle(temp).color;
        document.body.removeChild(temp);
        const match = computed.match(/[\d.]+/g);
        if (match) {
            return `rgba(${match[0]}, ${match[1]}, ${match[2]}, ${alpha})`;
        }
        return color;
    }

    laneLabels.forEach((lane, i) => {
        const btn = document.createElement('button');
        btn.className = 'lane-btn active';
        btn.dataset.lane = i;
        btn.innerHTML = `<i class="fas fa-${lane.icon}"></i>`;
        const rowColor = colorWithAlpha(getRowColor(rows[i].color), 0.15);
        const iconColor = getEventColor(rows[i].types[0]);
        btn.style.backgroundColor = rowColor;
        btn.querySelector('i').style.color = iconColor;
        btn.dataset.rowColor = rowColor;
        btn.dataset.iconColor = iconColor;
        btn.addEventListener('click', () => {
            if (hiddenLanes.has(i)) {
                hiddenLanes.delete(i);
                btn.classList.add('active');
                btn.style.backgroundColor = btn.dataset.rowColor;
                btn.querySelector('i').style.color = btn.dataset.iconColor;
            } else {
                hiddenLanes.add(i);
                btn.classList.remove('active');
                btn.style.backgroundColor = 'transparent';
                btn.querySelector('i').style.color = '';
            }
            applyFilters();
        });
        container.appendChild(btn);
    });

    document.getElementById('filter-map').addEventListener('change', applyFilters);
    document.getElementById('filter-sidebar').addEventListener('change', applyFilters);
}

function applyFilters() {
    // Collect hidden event types
    const hiddenTypes = new Set();
    hiddenLanes.forEach(i => {
        rows[i].types.forEach(t => hiddenTypes.add(t));
    });

    // Timeline: hide/show row backgrounds
    if (iconGroups) {
        iconGroups.selectAll('rect').attr('display', function(d, i) {
            return hiddenLanes.has(i) ? 'none' : null;
        });
    }
    // Re-trigger zoom handler to recalculate icon visibility + clustering
    if (svg && timelineZoomed) {
        timelineZoomed({ transform: d3.zoomTransform(svg.node()) });
    }

    // Map filtering
    const filterMap = document.getElementById('filter-map').checked;
    allMarkers.forEach(marker => {
        const isHidden = filterMap && hiddenTypes.has(marker._tripEventType);
        if (isHidden && markers.hasLayer(marker)) {
            markers.removeLayer(marker);
        } else if (!isHidden && !markers.hasLayer(marker)) {
            markers.addLayer(marker);
        }
    });

    // Sidebar filtering
    const filterSidebar = document.getElementById('filter-sidebar').checked;
    const eventItems = document.querySelectorAll('.event-item');
    eventItems.forEach(item => {
        const id = parseInt(item.getAttribute('data-id'));
        const trip = allTripsData.find(t => t.id === id);
        if (!trip) return;
        const isHidden = filterSidebar && hiddenTypes.has(trip.eventType);
        item.style.display = isHidden ? 'none' : '';
    });

    // Hide empty day containers and year groups
    if (filterSidebar && hiddenTypes.size > 0) {
        document.querySelectorAll('.day-container').forEach(dc => {
            const visible = dc.querySelectorAll('.event-item:not([style*="display: none"])');
            dc.style.display = visible.length > 0 ? '' : 'none';
        });
        document.querySelectorAll('.year').forEach(yd => {
            const visible = yd.querySelectorAll('.day-container:not([style*="display: none"])');
            yd.style.display = visible.length > 0 ? '' : 'none';
        });
    } else {
        document.querySelectorAll('.day-container').forEach(dc => dc.style.display = '');
        document.querySelectorAll('.year').forEach(yd => yd.style.display = '');
    }
}

// Initialize resize handle on page load
document.addEventListener('DOMContentLoaded', () => {
    initResizeHandle();
});
