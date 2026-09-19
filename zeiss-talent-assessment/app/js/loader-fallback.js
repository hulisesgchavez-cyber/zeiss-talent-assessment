/* Carga las bibliotecas locales (carpeta vendor/) si el CDN no está disponible,
 * por ejemplo en una red sin acceso a internet. Debe ejecutarse justo después
 * de las etiquetas <script> del CDN. */
(function () {
  var s = document.currentScript;
  var base = (s && s.getAttribute('data-vendor')) || 'vendor/';
  if (!window.Chart) document.write('<script src="' + base + 'chart.umd.min.js"><\/script>');
  if (!window.jspdf) document.write('<script src="' + base + 'jspdf.umd.min.js"><\/script>');
})();
