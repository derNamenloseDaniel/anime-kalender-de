// Filter der Übersicht: Label, Ziel, Suchtext. Eingebettet von uebersicht-html.mjs, kein fetch, kein externes Skript.
(function () {
  var zustand = { label: 'alle', ziel: 'alle', suche: '' }
  var zeilen = Array.prototype.slice.call(document.querySelectorAll('li.e'))
  function passt(li) {
    var labels = li.getAttribute('data-labels') || ''
    var l = zustand.label
    if (l === 'lokal' && labels.indexOf('lokal') < 0) return false
    if (l === 'nacht' && labels.indexOf('nacht') < 0) return false
    if (l === 'beide' && !(labels.indexOf('lokal') >= 0 && labels.indexOf('nacht') >= 0)) return false
    if (l === 'offen' && labels !== '') return false
    if (zustand.ziel !== 'alle' && li.getAttribute('data-ziel') !== zustand.ziel) return false
    return !zustand.suche || (li.getAttribute('data-text') || '').indexOf(zustand.suche) >= 0
  }
  function anwenden() {
    zeilen.forEach(function (li) { li.hidden = !passt(li) })
    Array.prototype.slice.call(document.querySelectorAll('details.thema, details.ziel, details.abschnitt')).reverse().forEach(function (d) {
      var sichtbar = d.querySelectorAll('li.e:not([hidden])').length
      var zahl = d.querySelector(':scope > summary .zahl[data-zahl]')
      if (zahl) zahl.textContent = '(' + sichtbar + ')'
      d.hidden = d.classList.contains('abschnitt') ? false : sichtbar === 0
    })
  }
  function knoepfe(feld) {
    var alle = Array.prototype.slice.call(document.querySelectorAll('button[data-feld="' + feld + '"]'))
    alle.forEach(function (b) {
      b.addEventListener('click', function () {
        zustand[feld] = b.getAttribute('data-wert')
        alle.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false') })
        anwenden()
      })
    })
  }
  knoepfe('label')
  knoepfe('ziel')
  document.getElementById('suche').addEventListener('input', function (e) {
    zustand.suche = e.target.value.trim().toLowerCase()
    anwenden()
  })
})()
