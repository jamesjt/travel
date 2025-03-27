// Timeline setup
function initTimeline() {
    if (allTripsData.length === 0) {
        console.warn('No trip data available for timeline.');
        return;
    }

    // Define layout parameters
    margin = { top: 20, right: 20, bottom: 30, left: 20 };
    const rowHeight = 15; // Height of each row
    const iconRowsHeight = rows.length * rowHeight; // Total height for icon rows (5 * 15 = 75px)
    const axisHeight = 30; // Space for the axis
    height = iconRowsHeight + axisHeight; // Total content height (75 + 30 = 105px)
    const timelineDiv = document.getElementById('timeline');
    const width = timelineDiv.offsetWidth - margin.left - margin.right;

    // Create SVG with adjusted height
    svg = d3.select('.timeline-bar')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);

    g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Define x-scale for dates with padding
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

    // Add icon rows
    rows.forEach((row, rowIndex) => {
        const rowY = rowIndex * rowHeight;

        // Add background rectangle for the row
        iconGroups.append('rect')
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
        eventsByDatePerRow[rowIndex] = eventsByDate; // Store globally for zoom access

        // Place icons for each date
        eventsByDate.forEach((events, date) => {
            const n = events.length; // Number of events on this date for this row
            const iconSize = 12; // Icon size
            const gap = 2; // Gap between icons
            const totalWidth = n * iconSize + (n - 1) * gap; // Total width for all icons
            const startX = xScale(date) - totalWidth / 2 + iconSize / 2; // Center icons around date position

            events.forEach((event, i) => {
                const xPos = startX + i * (iconSize + gap); // Position each icon side by side
                const yPos = rowY + rowHeight / 2; // Center vertically in row

                iconGroups.append('text')
                    .attr('class', 'icon-text') // Use CSS to set Font Awesome properties
                    .attr('x', xPos)
                    .attr('y', yPos)
                    .attr('fill', colorMapping[event.eventType]) // Match map marker color
                    .attr('font-size', '12px')
                    .attr('text-anchor', 'middle') // Center horizontally
                    .attr('dominant-baseline', 'central') // Center vertically
                    .text(unicodeByIcon[iconMapping[event.eventType]]) // Set icon Unicode
                    .datum({ event: event, rowIndex: rowIndex }) // Associate event and row index
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

    // Add zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 50]) // Allow zooming in and out within these limits
        .translateExtent([[0, 0], [width, height]]) // Allow panning within the timeline bounds
        .on('zoom', zoomed);

    svg.call(zoom).call(zoom.transform, d3.zoomIdentity);

    // Zoom handler function
    function zoomed(event) {
        const transform = event.transform;
        const newXScale = transform.rescaleX(xScale);

        // Dynamic tick generation based on zoom level
        let ticks;
        if (transform.k > 10) {
            ticks = d3.timeDay.every(1); // Show every day at the most zoomed-in level
        } else if (transform.k > 5) {
            ticks = d3.timeWeek.every(1); // Show every week at medium zoom
        } else {
            ticks = d3.timeMonth.every(1); // Show every month at lower zoom
        }

        const xAxis = d3.axisBottom(newXScale).ticks(ticks);
        gX.call(xAxis);

        // Update icon positions
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

    // Handle window resize
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
        // Update background rectangles
        iconGroups.selectAll('rect')
            .attr('width', newWidth);
        zoom.translateExtent([[0, 0], [newWidth, height]]);
        svg.call(zoom);
    });
}
