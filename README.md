# revista-trama-n13

visualización de 60 personas como blobs flotantes: 15 personas principales, y cada una elige a 3 personas nuevas, una para ideas, otra para procesos y otra para resultados (45 conexiones), hecha con [p5.js](https://p5js.org) 2.3.4.

## archivos

- `index.html`: página con el canvas a pantalla completa.
- `script.js`: carga de datos, validación y dibujo.
- `datos.json`: datos de respaldo, se usan si la hoja no responde.
- `apps-script/Codigo.gs`: script para exponer la hoja de cálculo privada como json.

## hoja de cálculo

una fila por persona (idealmente en una pestaña llamada `personas`; si no existe, se usa la primera):

| id | nombre | ideas | procesos | resultados |
|---|---|---|---|---|
| 1 | Pedro Silva | idea01 | proceso01 | resultado01 |

- `ideas`, `procesos` y `resultados` contienen el nombre de la persona elegida para cada tipo.
- cada persona elegida se dibuja como un blob pequeño alrededor de quien la eligió, con el color de su tipo (ver `TIPOS_CONEXION` en `script.js`).
- los nombres de las personas elegidas aparecen al pasar el mouse por su grupo; para mostrarlos siempre, cambiar `MOSTRAR_TODOS_LOS_NOMBRES` a `true`.
- la hoja queda privada: solo quienes tienen acceso pueden editarla.

## conectar la hoja

1. en la hoja: extensiones → apps script, pegar `apps-script/Codigo.gs`.
2. implementar → nueva implementación → aplicación web.
   - ejecutar como: yo.
   - quién tiene acceso: cualquier persona.
3. copiar la url que termina en `/exec` y pegarla en `URL_DATOS` en `script.js`.

los cambios en la hoja se ven al recargar la página, sin volver a implementar. si se modifica el script, hay que actualizar la implementación (implementar → administrar implementaciones → editar → nueva versión).

## correr localmente

`fetch` no funciona con `file://`, así que hay que usar un servidor:

```sh
python3 -m http.server
```

y abrir http://localhost:8000. los avisos de datos inválidos aparecen en la consola del navegador.
