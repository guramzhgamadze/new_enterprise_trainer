/* ==================== PART CHOOSER ====================
   Runs before the trainer engine. It decides which part is shown (#units-1-3 / #units-4-6 in the
   address, else the part chosen last time, else the chooser screen), fills the menus of that part
   and sets PART, from which the engine reads its data and its storage keys. Each part keeps its own
   statistics in localStorage (ne13v1/ne13snv1, ne46v1/ne46snv1). Switching parts reloads the page. */
var NE_PART_KEY = "ne_trainer_part";

function nePartFromHash() {
  var h = (location.hash || "").replace("#", "");
  for (var id in NE_PARTS) {
    if (NE_PARTS[id].slug === h) return id;
  }
  return null;
}

function neLoadSaved() {
  try {
    var s = localStorage.getItem(NE_PART_KEY);
    return NE_PARTS[s] ? s : null;
  } catch (e) {
    return null;
  }
}

function neSave(id) {
  try {
    localStorage.setItem(NE_PART_KEY, id);
  } catch (e) {}
}

var NE_ID = nePartFromHash() || neLoadSaved();
var NE_SHOW_CHOOSER = !NE_ID;
if (!NE_ID) NE_ID = "13";
var PART = NE_PARTS[NE_ID];
if (!NE_SHOW_CHOOSER) {
  neSave(NE_ID);
  if (location.hash !== "#" + PART.slug && window.history && history.replaceState) {
    history.replaceState(null, "", "#" + PART.slug);
  }
}

function choosePart(id) {
  if (!NE_PARTS[id]) return;
  neSave(id);
  var hash = "#" + NE_PARTS[id].slug;
  if (id === NE_ID) {
    if (window.history && history.replaceState) history.replaceState(null, "", hash);
    neHideChooser();
    return;
  }
  location.replace(location.pathname + location.search + hash);
  location.reload();
}

function neHideChooser() {
  var el = document.getElementById("chooser");
  el.hidden = true;
  document.body.classList.remove("choosing");
  document.title = PART.name + " Trainer - New Enterprise C1";
}

window.addEventListener("hashchange", function () {
  var id = nePartFromHash();
  if (id && id !== NE_ID) {
    neSave(id);
    location.reload();
  }
});

(function neFillPage() {
  document.getElementById("side-nav").innerHTML = PART.navSide.join("\n");
  document.getElementById("drawer-nav").innerHTML = PART.navDrawer.join("\n");
  document.getElementById("cbars").innerHTML = PART.bars.join("\n");
  document.getElementById("qt").textContent = PART.qt;
  document.getElementById("logo-part").textContent = PART.name;
  document.title = NE_SHOW_CHOOSER ? "New Enterprise C1 Trainer" : PART.name + " Trainer - New Enterprise C1";
  var btns = document.querySelectorAll(".ps-btn");
  for (var i = 0; i < btns.length; i++) {
    var on = btns[i].getAttribute("data-part") === NE_ID;
    btns[i].classList.toggle("active", on);
    btns[i].setAttribute("aria-pressed", on ? "true" : "false");
  }
  var cards = "";
  ["13", "46"].forEach(function (id) {
    var p = NE_PARTS[id];
    var units = p.units.map(function (u, k) {
      var n = p.CATS[k].slice(1);
      return '<li><span class="pc-n">Unit ' + n + "</span>" + u + "</li>";
    }).join("");
    cards += '<button class="part-card" data-part="' + id + '" onclick="choosePart(this.dataset.part)">' +
      '<span class="pc-name">' + p.name + "</span>" +
      '<ul class="pc-units">' + units + "</ul>" +
      '<span class="pc-meta">' + p.total + " questions · " + p.cards + " flashcards</span>" +
      "</button>";
  });
  document.getElementById("chooser-cards").innerHTML = cards;
  if (NE_SHOW_CHOOSER) {
    document.getElementById("chooser").hidden = false;
    document.body.classList.add("choosing");
  }
  // On the desktop layout merged.css shows each "Mistakes" button of the side menu as a
  // small red count next to its category; the button's own words become its tooltip.
  var misButtons = document.querySelectorAll("#side-nav .mis-nb");
  for (var m = 0; m < misButtons.length; m++) {
    var words = "";
    var nodes = misButtons[m].childNodes;
    for (var n = 0; n < nodes.length; n++) {
      if (nodes[n].nodeType === 3) words += nodes[n].textContent;
    }
    misButtons[m].title = words.trim();
  }
})();

/* ==================== DRAWER ON A WIDER WINDOW ====================
   The mobile drawer (menu) opens below 768px. If the window then grows past 768px (a rotated
   tablet, a widened or zoomed-out window), close it: otherwise it stays open over the desktop
   layout and the page cannot scroll, because openDrawer() sets the body's overflow to hidden.
   merged.css also hides the drawer on the desktop layout. closeDrawer() is defined in the engine
   below (a function declaration in the same script, so it exists when this runs). */
(function neCloseDrawerWhenWide() {
  if (!window.matchMedia) return;
  var narrow = window.matchMedia("(max-width: 768px)");
  function onChange() {
    if (!narrow.matches && document.getElementById("drawer").classList.contains("open")) {
      closeDrawer();
    }
  }
  if (narrow.addEventListener) {
    narrow.addEventListener("change", onChange);
  } else if (narrow.addListener) {
    narrow.addListener(onChange);
  }
})();
