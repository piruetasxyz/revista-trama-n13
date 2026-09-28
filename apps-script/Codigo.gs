// pegar en Extensiones → Apps Script dentro de la hoja de cálculo.
// desplegar como aplicación web: "Ejecutar como: yo", "Quién tiene acceso: cualquier persona".
// la hoja sigue siendo privada; solo sale lo que este script devuelve.

// si no existe una pestaña con este nombre, se usa la primera
const NOMBRE_PESTANA = 'personas';
// cada columna contiene el nombre de la persona elegida para ese tipo
const TIPOS_CONEXION = ['ideas', 'procesos', 'resultados'];

function doGet() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = libro.getSheetByName(NOMBRE_PESTANA) || libro.getSheets()[0];
  const filas = hoja.getDataRange().getDisplayValues();
  const encabezados = filas.shift().map((encabezado) => encabezado.trim().toLowerCase());
  const indice = (columna) => encabezados.indexOf(columna);

  const personas = filas
    .filter((fila) => fila[indice('id')].trim() !== '')
    .map((fila) => ({
      id: fila[indice('id')].trim(),
      nombre: fila[indice('nombre')].trim(),
      conexiones: TIPOS_CONEXION.map((tipo) => ({ tipo, nombre: fila[indice(tipo)].trim() })).filter(
        (conexion) => conexion.nombre
      ),
    }));

  return ContentService.createTextOutput(JSON.stringify({ personas })).setMimeType(
    ContentService.MimeType.JSON
  );
}
