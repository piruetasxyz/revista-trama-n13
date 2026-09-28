# revista-trama-n13

visualización de 15 personas como blobs flotantes, cada una conectada a otras 3 (45 conexiones dirigidas), hecha con [p5.js](https://p5js.org) 2.3.4.

## archivos

- `index.html`: página con el canvas a pantalla completa.
- `script.js`: carga de datos, validación y dibujo.
- `datos.json`: datos de respaldo, se usan si la hoja no responde.
- `apps-script/Codigo.gs`: script para exponer la hoja de cálculo privada como json.

## hoja de cálculo

una pestaña llamada `personas`, con una fila por persona:

| id | nombre | color | conexion_1 | conexion_2 | conexion_3 |
|---|---|---|---|---|---|
| p01 | persona 1 | #e4572e | p02 | p06 | p15 |

- `conexion_1..3` contienen los `id` de las personas elegidas.
- `color` es opcional (hex); si está vacío se asigna uno automáticamente.
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
