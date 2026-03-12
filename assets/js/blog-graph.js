(function () {
  'use strict';

  // Node visual sizes
  var SIZE = { category: 13, tag: 10, post: 7 }; // radius-equivalent half-size

  function getCSSVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function getColors() {
    return {
      postFill:     getCSSVar('--global-theme-color')      || '#1a73e8',
      tagFill:      getCSSVar('--global-text-color-light') || '#828282',
      categoryFill: getCSSVar('--global-hover-color')      || '#e8a838',
      linkColor:    getCSSVar('--global-divider-color')    || '#e0e0e0',
      textColor:    getCSSVar('--global-text-color')       || '#333333',
      cardBg:       getCSSVar('--global-card-bg-color')    || '#ffffff',
    };
  }

  // Wrap SVG <text> into multiple <tspan> lines.
  // maxWidth is in SVG user units (px at scale=1).
  function wrapText(textSelection, maxWidth) {
    textSelection.each(function () {
      var el = d3.select(this);
      var fullText = el.text();
      var words = fullText.split(/\s+/);
      var dy0 = parseFloat(el.attr('dy')) || 0;

      el.text(null); // clear existing text

      var tspan = el.append('tspan').attr('x', 0).attr('dy', dy0);
      var line = [];

      words.forEach(function (word) {
        line.push(word);
        tspan.text(line.join(' '));
        if (tspan.node().getComputedTextLength() > maxWidth && line.length > 1) {
          line.pop();
          tspan.text(line.join(' '));
          line = [word];
          tspan = el.append('tspan').attr('x', 0).attr('dy', '1.2em').text(word);
        }
      });
    });
  }

  function initGraph() {
    var data = window.blogGraphData;
    if (!data || !data.nodes || !data.nodes.length) return;

    var widget = document.getElementById('blog-graph-widget');
    var svgEl = document.getElementById('blog-graph');
    if (!widget || !svgEl) return;

    var width = widget.clientWidth - 32;
    var height = parseInt(svgEl.getAttribute('height')) || 380;

    var svg = d3.select('#blog-graph').attr('width', width).attr('height', height);

    // Root group for zoom/pan
    var g = svg.append('g');

    var zoomBehavior = d3.zoom()
      .scaleExtent([0.1, 5])
      .on('zoom', function (event) {
        g.attr('transform', event.transform);
      });

    svg.call(zoomBehavior);

    // Fit all nodes into the viewport. dur=0 for instant, omit for animated (600ms).
    function fitToScreen(dur) {
      if (!data.nodes.length) return;
      var xs = data.nodes.map(function (d) { return d.x; });
      var ys = data.nodes.map(function (d) { return d.y; });
      var minX = Math.min.apply(null, xs);
      var maxX = Math.max.apply(null, xs);
      var minY = Math.min.apply(null, ys);
      var maxY = Math.max.apply(null, ys);
      var graphW = maxX - minX || 1;
      var graphH = maxY - minY || 1;
      var padding = 60; // room for labels beyond node edges
      var scale = Math.min(
        (width  - padding * 2) / graphW,
        (height - padding * 2) / graphH
      );
      var tx = (width  - graphW * scale) / 2 - minX * scale;
      var ty = (height - graphH * scale) / 2 - minY * scale;
      svg.transition().duration(dur !== undefined ? dur : 600).call(
        zoomBehavior.transform,
        d3.zoomIdentity.translate(tx, ty).scale(scale)
      );
    }

    // Button click: animated. On-load: instant (dur=0).
    window.blogGraphFitToScreen = function () { fitToScreen(600); };

    // Collision radius per type
    function collideR(d) {
      if (d.type === 'category') return SIZE.category + 50;
      if (d.type === 'tag')      return SIZE.tag      + 40;
      return SIZE.post + 45;
    }

    // Pre-position disconnected components side-by-side so they don't tangle.
    // Must run before simulation (while data.links still use string IDs).
    (function () {
      var adj = {};
      data.nodes.forEach(function (n) { adj[n.id] = []; });
      data.links.forEach(function (l) {
        if (adj[l.source]) adj[l.source].push(l.target);
        if (adj[l.target]) adj[l.target].push(l.source);
      });
      var visited = {};
      var components = [];
      var nodeById = {};
      data.nodes.forEach(function (n) { nodeById[n.id] = n; });
      data.nodes.forEach(function (n) {
        if (visited[n.id]) return;
        var comp = [];
        var queue = [n.id];
        while (queue.length) {
          var id = queue.shift();
          if (visited[id]) continue;
          visited[id] = true;
          if (nodeById[id]) comp.push(nodeById[id]);
          (adj[id] || []).forEach(function (nb) {
            if (!visited[nb]) queue.push(nb);
          });
        }
        components.push(comp);
      });
      // Largest component first (centred)
      components.sort(function (a, b) { return b.length - a.length; });
      var n = components.length;
      // Space components evenly, max 260px apart, centred in viewport
      var gap = Math.min(260, width / (n + 1));
      var totalW = gap * (n - 1);
      var startX = (width - totalW) / 2;
      components.forEach(function (comp, i) {
        var cx = startX + i * gap;
        comp.forEach(function (node) {
          node.x = cx + (Math.random() - 0.5) * 50;
          node.y = height * 0.5 + (Math.random() - 0.5) * 50;
        });
      });
    }());

    // Force simulation
    var simulation = d3
      .forceSimulation(data.nodes)
      .force(
        'link',
        d3.forceLink(data.links)
          .id(function (d) { return d.id; })
          .distance(function (l) {
            var types = [l.source.type, l.target.type];
            if (types.indexOf('category') !== -1) return 100;
            return 90;
          })
          .strength(0.7)
      )
      .force('charge', d3.forceManyBody().strength(-280))
      .force('x', d3.forceX(width / 2).strength(0.02))
      .force('y', d3.forceY().y(function (d) {
        if (d.type === 'category') return height * 0.15;
        if (d.type === 'tag')      return height * 0.45;
        return height * 0.75;
      }).strength(0.3))
      .force('collide', d3.forceCollide().radius(collideR));

    // Pre-run ticks synchronously so the layout is ready immediately on page load.
    simulation.stop();
    for (var i = 0; i < 200; i++) simulation.tick();
    fitToScreen(0); // instant fit — no delay
    simulation.alpha(0.1).restart(); // continue refining quietly

    // Links
    var link = g
      .append('g')
      .attr('class', 'blog-graph-links')
      .selectAll('line')
      .data(data.links)
      .enter()
      .append('line')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.55);

    // Nodes
    var node = g
      .append('g')
      .attr('class', 'blog-graph-nodes')
      .selectAll('g')
      .data(data.nodes)
      .enter()
      .append('g')
      .attr('class', function (d) { return 'blog-graph-node blog-graph-node--' + d.type; })
      .style('cursor', 'pointer')
      .call(
        d3.drag()
          .on('start', function (event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on('drag', function (event, d) {
            d.fx = event.x; d.fy = event.y;
          })
          .on('end', function (event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null; d.fy = null;
          })
      )
      .on('click', function (event, d) {
        event.stopPropagation();
        window.location.href = d.url;
      });

    // Category nodes: squares (largest)
    var catS = SIZE.category;
    node
      .filter(function (d) { return d.type === 'category'; })
      .append('rect')
      .attr('width',  catS * 2)
      .attr('height', catS * 2)
      .attr('x', -catS)
      .attr('y', -catS)
      .attr('rx', 3);

    // Tag nodes: diamonds / rotated squares (medium)
    var tagS = SIZE.tag;
    node
      .filter(function (d) { return d.type === 'tag'; })
      .append('rect')
      .attr('width',  tagS * 2)
      .attr('height', tagS * 2)
      .attr('x', -tagS)
      .attr('y', -tagS)
      .attr('transform', 'rotate(45)')
      .attr('rx', 1);

    // Post nodes: circles (smallest)
    node
      .filter(function (d) { return d.type === 'post'; })
      .append('circle')
      .attr('r', SIZE.post)
      .attr('stroke-width', 1.5);

    // Labels — full text, will be wrapped
    var labelDy   = { category: catS + 10, tag: tagS + 13, post: SIZE.post + 13 };
    var labelSize = { category: '13px',    tag: '11px',    post: '9px' };
    var label = node.append('text')
      .attr('dy', function (d) { return labelDy[d.type] || 18; })
      .attr('text-anchor', 'middle')
      .attr('font-size', function (d) { return labelSize[d.type] || '9px'; })
      .attr('font-family', 'inherit')
      .attr('pointer-events', 'none')
      .text(function (d) {
        if (d.type === 'tag')      return '#' + d.label;
        if (d.type === 'category') return d.label;
        return d.nodename || d.title;
      });

    // Wrap labels — wider budget for larger node types
    var wrapWidth = { category: 110, tag: 100, post: 90 };
    label.each(function (d) {
      wrapText(d3.select(this), wrapWidth[d.type] || 90);
    });

    // Tooltip — always shows the full title
    var tooltip = d3.select('body')
      .append('div')
      .attr('class', 'blog-graph-tooltip')
      .style('position',       'absolute')
      .style('padding',        '5px 9px')
      .style('border-radius',  '4px')
      .style('font-size',      '12px')
      .style('pointer-events', 'none')
      .style('opacity',        0)
      .style('z-index',        9999)
      .style('max-width',      '220px')
      .style('line-height',    '1.4');

    node
      .on('mouseover', function (event, d) {
        tooltip.transition().duration(120).style('opacity', 0.95);
        var label = d.type === 'tag' || d.type === 'category' ? d.label : d.title;
        tooltip.text(label)
          .style('left', event.pageX + 12 + 'px')
          .style('top',  event.pageY - 30 + 'px');
      })
      .on('mousemove', function (event) {
        tooltip
          .style('left', event.pageX + 12 + 'px')
          .style('top',  event.pageY - 30 + 'px');
      })
      .on('mouseout', function () {
        tooltip.transition().duration(250).style('opacity', 0);
      });

    function applyColors() {
      var c = getColors();
      link.attr('stroke', c.linkColor);
      node.filter(function (d) { return d.type === 'post';     }).select('circle').attr('fill', c.postFill).attr('stroke', c.cardBg);
      node.filter(function (d) { return d.type === 'tag';      }).select('rect').attr('fill', c.tagFill);
      node.filter(function (d) { return d.type === 'category'; }).select('rect').attr('fill', c.categoryFill);
      node.select('text').attr('fill', c.textColor);
      tooltip
        .style('background',  c.cardBg)
        .style('color',       c.textColor)
        .style('border',      '1px solid ' + c.linkColor)
        .style('box-shadow',  '0 2px 6px rgba(0,0,0,0.15)');
    }

    applyColors();

    var observer = new MutationObserver(applyColors);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    simulation.on('tick', function () {
      link
        .attr('x1', function (d) { return d.source.x; })
        .attr('y1', function (d) { return d.source.y; })
        .attr('x2', function (d) { return d.target.x; })
        .attr('y2', function (d) { return d.target.y; });
      node.attr('transform', function (d) {
        return 'translate(' + d.x + ',' + d.y + ')';
      });
    });

    window.addEventListener('resize', function () {
      var newWidth = widget.clientWidth - 32;
      svg.attr('width', newWidth);
      simulation.force('x', d3.forceX(newWidth / 2).strength(0.05));
      simulation.alpha(0.3).restart();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGraph);
  } else {
    initGraph();
  }
})();
