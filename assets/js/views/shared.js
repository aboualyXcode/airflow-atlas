// Pieces every view shares: the canvas-and-panel frame, chips, the component inspector, small
// tables and the node capacity calculator.
(function (KA) {
  "use strict";
  var u = KA.u, esc = u.esc, md = KA.md;
  var ui = {};

  ui.frame = function (main, cls) {
    main.innerHTML =
      '<div class="stage ' + (cls || "") + '">' +
      '<section class="canvas" aria-label="Diagram"><div class="canvas-head"></div><div class="canvas-body"></div><div class="canvas-foot"></div></section>' +
      '<aside class="panel" aria-label="Details"><div class="panel-inner"></div></aside></div>';
    return {
      head: u.$(".canvas-head", main), body: u.$(".canvas-body", main), foot: u.$(".canvas-foot", main),
      panel: u.$(".panel-inner", main), scroller: u.$(".panel", main),
    };
  };
  ui.setPanel = function (f, html) { f.panel.innerHTML = html; f.scroller.scrollTop = 0; };

  ui.kind = function (k) { return '<span class="kind kind--' + k + '">' + (k === "cause" ? "Cause" : "Symptom") + "</span>"; };
  ui.layer = function (id) { var l = KA.idx.layer(id); return '<span class="chip chip--layer">' + esc(l ? l.name : id) + "</span>"; };
  ui.scope = function (s) { return '<span class="chip">' + (s === "aws" ? "On AWS" : "Any Airflow deployment") + "</span>"; };
  ui.plane = function (p) { return '<span class="plane plane--' + p + '">' + esc(KA.data.planes[p].name) + "</span>"; };
  ui.compChip = function (id, view) {
    var c = KA.data.components[id];
    return c ? '<a class="chip chip--comp plane-dot--' + c.plane + '" href="#/' + (view || ui.viewFor(id)) + "/c/" + id + '">' + esc(c.name) + "</a>" : "";
  };
  ui.viewFor = function (id) {
    return KA.data.maps.cluster.stations.some(function (s) { return s.id === id; }) ? "architecture" : "aws";
  };
  ui.code = function (text) { return text ? md.codeBlock(KA.text(text)) : ""; };
  ui.table = function (cols, rows, cls) {
    return '<div class="table-wrap"><table class="' + (cls || "") + '"><thead><tr>' + cols.map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") +
      "</tr></thead><tbody>" + rows.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + md.inline(String(c)) + "</td>"; }).join("") + "</tr>"; }).join("") +
      "</tbody></table></div>";
  };
  ui.pipe = function (steps) {
    return '<ol class="pipe">' + steps.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ol>";
  };
  ui.legend = function () {
    var P = KA.data.planes;
    return '<ul class="legend" aria-label="Colour key">' + Object.keys(P).map(function (k) {
      return '<li><span class="swatch plane-dot--' + k + '" aria-hidden="true"></span>' + esc(P[k].name) + "</li>";
    }).join("") + "</ul>";
  };

  // ---------------------------------------------------------------- component inspector
  ui.inspector = function (id, mapDef, view) {
    var c = KA.data.components[id];
    if (!c) return "<p>Unknown component.</p>";
    var talks = [];
    mapDef.edges.forEach(function (e) {
      if (e.from === id) talks.push({ dir: "to", other: e.to, label: e.label });
      if (e.to === id) talks.push({ dir: "from", other: e.from, label: e.label });
    });
    var starts = KA.idx.originatingAt(id), touching = KA.idx.touching(id).filter(function (f) { return starts.indexOf(f) < 0; });
    var flows = KA.idx.flowsThrough(id).filter(function (fl) { return fl.map === mapDef.id; });
    var html = '<header class="ph">' + ui.plane(c.plane) + "<h1>" + esc(c.name) + "</h1>" +
      (c.full && c.full !== c.name ? '<p class="ph-full">' + esc(c.full) + "</p>" : "") + "</header>" +
      '<p class="lede">' + esc(c.what) + "</p>" +
      "<h2>How it works inside</h2>" + ui.pipe(c.inside) +
      "<h2>What it does</h2><ul>" + c.does.map(function (d) { return "<li>" + esc(d) + "</li>"; }).join("") + "</ul>";
    if (talks.length) {
      html += "<h2>Connections on this map</h2><ul class=\"talks\">" + talks.map(function (t) {
        return '<li><button type="button" class="link" data-select="' + t.other + '">' + esc(KA.geom.label(mapDef, t.other)) + "</button>" +
          '<span class="talks-dir">' + (t.dir === "to" ? "it calls" : "calls it") + "</span> " + esc(t.label) + "</li>";
      }).join("") + "</ul>";
    }
    html += "<h2>In production</h2><ul>" + c.production.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>" +
      "<h2>On AWS</h2><p>" + esc(c.aws) + "</p>" +
      "<h2>Look at it</h2>" + c.look.map(function (l) { return ui.code(l); }).join("");
    if (starts.length) html += "<h2>Failures that start here</h2><p class=\"chips\">" + KA.failChips(starts.map(function (f) { return f.id; })) + "</p>";
    if (touching.length) html += "<h2>Also involved in</h2><p class=\"chips\">" + KA.failChips(touching.map(function (f) { return f.id; })) + "</p>";
    if (flows.length) html += "<h2>Flows through it</h2><ul class=\"flowlist\">" + flows.map(function (fl) {
      return '<li><a href="#/' + view + "/flow/" + fl.id + '">' + esc(fl.title) + "</a></li>";
    }).join("") + "</ul>";
    if (c.config && c.config.length) html += "<h2>Reference configuration</h2><ul>" + c.config.map(function (p) {
      return '<li><a href="' + esc(p) + '"><code>' + esc(p) + "</code></a></li>";
    }).join("") + "</ul>";
    return html;
  };

  // ---------------------------------------------------------------- sizing calculator
  // A first-order model of worker slots: concurrent tasks at peak = task runs in the peak hour
  // times average duration. Sensors in poke mode and long tasks need headroom on top.
  ui.capacity = function (host, opts) {
    opts = opts || {};
    var d = KA.data.ops.capacity.calc;
    function field(k, label, v, step) { return "<label>" + label + '<input type="number" min="0" step="' + step + '" data-k="' + k + '" value="' + v + '"></label>'; }
    host.innerHTML = '<div class="calc' + (opts.compact ? " calc--compact" : "") + '"><div class="calc-in">' +
      field("runs", "Task runs per day", d.runsPerDay, 1000) +
      field("peak", "Share in the busiest hour (%)", d.peakShare, 1) +
      field("minutes", "Average task duration (min)", d.minutes, 1) +
      field("perWorker", "Tasks per worker (concurrency)", d.perWorker, 1) +
      field("workers", "Workers", d.workers, 1) +
      field("days", "Days of history kept", d.days, 30) +
      '</div><div class="calc-out" aria-live="polite"></div></div>';
    var out = u.$(".calc-out", host);
    function num(k) { return Math.max(0, +u.$('[data-k="' + k + '"]', host).value || 0); }
    function bar(name, used, cap, text) {
      var p = cap ? Math.min(100, used / cap * 100) : 0;
      return '<div class="cbar' + (used > cap ? " cbar--over" : "") + '"><div class="cbar-head"><b>' + name + "</b><span>" + text + '</span></div><div class="cbar-track"><span class="cbar-use" style="width:' + p.toFixed(1) + '%"></span></div></div>';
    }
    function calc() {
      var runs = num("runs"), share = num("peak") / 100, mins = num("minutes"), per = Math.max(1, num("perWorker")), w = Math.max(1, num("workers")), days = num("days");
      var concurrent = runs * share * mins / 60, slots = w * per;
      var need = Math.max(1, Math.ceil(concurrent / (per * 0.7)));
      var rows = runs * days;
      out.innerHTML = '<p class="calc-answer"><b>' + need + "</b> workers keep the busiest hour under 70% of slots; you have " + w + ". " + (need <= w ? "That is enough." : "Add workers, raise concurrency, or spread the schedule.") + "</p>" +
        bar("Slots in use at peak", concurrent, slots, concurrent.toFixed(0) + " of " + slots + " slots (" + w + " workers × " + per + ")") +
        bar("Parallelism needed", slots, Math.max(slots, 1), "set core.parallelism to at least " + slots) +
        '<p class="calc-note">The metadata database will hold about <b>' + (rows / 1e6).toFixed(1) + " million</b> task instance rows for " + days + " days of history: schedule <code>airflow db clean</code> to keep it there. Sensors in poke mode hold a slot for as long as they wait; make them deferrable. Assumes tasks spread evenly within the hour.</p>";
    }
    host.addEventListener("input", calc);
    host.addEventListener("change", calc);
    calc();
  };

  KA.ui = ui;
})(window.KA);
