// url de la aplicación web de apps script (termina en /exec).
// si está vacía o falla, se usa datos.json como respaldo.
const URL_DATOS = '';
const RUTA_RESPALDO = 'datos.json';

// cada persona principal elige a una persona nueva por tipo
const TIPOS_CONEXION = [
  { tipo: 'ideas', color: '#e4572e' },
  { tipo: 'procesos', color: '#1b998b' },
  { tipo: 'resultados', color: '#3a5ba0' },
];
const COLOR_PRINCIPAL = '#2b2b2b';
const COLOR_FONDO = '#f4f1ea';
// si es false, los nombres de las personas elegidas solo aparecen al pasar el mouse por su grupo
const MOSTRAR_TODOS_LOS_NOMBRES = false;

let personas = [];
let conexiones = [];
let radio = 30;
let grupoActivo = null;

async function cargarDatos() {
  if (URL_DATOS) {
    try {
      const respuesta = await fetch(URL_DATOS);
      if (!respuesta.ok) throw new Error(`estado ${respuesta.status}`);
      return await respuesta.json();
    } catch (error) {
      console.warn('no se pudo cargar la hoja, usando respaldo:', error);
    }
  }
  const respuesta = await fetch(RUTA_RESPALDO);
  return respuesta.json();
}

function crearPersona(datos) {
  return { ...datos, vx: 0, vy: 0, semilla: random(1000) };
}

// arma personas principales, personas elegidas y conexiones.
// solo se dibuja quien tiene nombre: filas o celdas vacías no generan blob.
function construir(datos) {
  const filas = (datos.personas || []).filter((fila) => String(fila.nombre || '').trim());

  personas = [];
  conexiones = [];
  const nombresVistos = new Set();

  filas.forEach((fila, i) => {
    const angulo = (TWO_PI * i) / filas.length;
    const distancia = min(width, height) * 0.32;
    const principal = crearPersona({
      id: String(fila.id ?? i).trim(),
      nombre: String(fila.nombre).trim(),
      principal: true,
      color: COLOR_PRINCIPAL,
      x: width / 2 + cos(angulo) * distancia,
      y: height / 2 + sin(angulo) * distancia,
    });
    principal.grupo = principal;
    personas.push(principal);

    const elegidas = fila.conexiones || [];
    TIPOS_CONEXION.forEach(({ tipo, color }, indiceTipo) => {
      const elegida = elegidas.find((conexion) => conexion.tipo === tipo);
      const nombre = elegida ? String(elegida.nombre || '').trim() : '';
      if (!nombre) return;
      if (nombresVistos.has(nombre)) {
        console.warn(`${nombre} aparece más de una vez; se dibuja como personas distintas`);
      }
      nombresVistos.add(nombre);

      const anguloElegida = angulo + ((indiceTipo - 1) * TWO_PI) / 3;
      const elegidaPersona = crearPersona({
        id: `${principal.id}-${tipo}`,
        nombre,
        principal: false,
        tipo,
        color,
        grupo: principal,
        x: principal.x + cos(anguloElegida) * radio * 3,
        y: principal.y + sin(anguloElegida) * radio * 3,
      });
      personas.push(elegidaPersona);
      conexiones.push({ origen: principal, destino: elegidaPersona, color });
    });
  });
}

function radioDe(persona) {
  return persona.principal ? radio : radio * 0.5;
}

async function setup() {
  createCanvas(windowWidth, windowHeight);
  radio = min(width, height) * 0.035;
  textFont('system-ui, sans-serif');
  construir(await cargarDatos());
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  radio = min(width, height) * 0.035;
}

function draw() {
  background(COLOR_FONDO);
  actualizar();

  // se revisan primero las elegidas, que se dibujan encima
  const bajoMouse = [...personas]
    .reverse()
    .find((persona) => dist(mouseX, mouseY, persona.x, persona.y) < radioDe(persona));
  grupoActivo = bajoMouse ? bajoMouse.grupo : null;

  for (const conexion of conexiones) dibujarConexion(conexion);
  for (const persona of personas) dibujarBlob(persona);
  dibujarLeyenda();
}

// flotación suave: deriva con ruido, repulsión entre blobs y resortes entre cada principal y sus elegidas
function actualizar() {
  const t = millis() * 0.0002;
  const separacionGrupos = min(width, height) * 0.24;
  const largoResorte = radio * 2.8;

  for (const persona of personas) {
    const angulo = noise(persona.semilla, t) * TWO_PI * 2;
    const deriva = persona.principal ? 0.03 : 0.02;
    persona.ax = cos(angulo) * deriva;
    persona.ay = sin(angulo) * deriva;
    if (persona.principal) {
      persona.ax += (width / 2 - persona.x) * 0.00003;
      persona.ay += (height / 2 - persona.y) * 0.00003;
    }
  }

  for (let i = 0; i < personas.length; i++) {
    for (let j = i + 1; j < personas.length; j++) {
      const a = personas[i];
      const b = personas[j];
      let separacion = (radioDe(a) + radioDe(b)) * 1.6;
      if (a.principal && b.principal) separacion = separacionGrupos;
      // hermanas del mismo grupo se reparten alrededor de su principal
      else if (!a.principal && !b.principal && a.grupo === b.grupo) separacion = largoResorte * 1.6;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = max(sqrt(dx * dx + dy * dy), 0.01);
      if (d < separacion) {
        const empuje = ((separacion - d) / separacion) * 0.3;
        a.ax -= (dx / d) * empuje;
        a.ay -= (dy / d) * empuje;
        b.ax += (dx / d) * empuje;
        b.ay += (dy / d) * empuje;
      }
    }
  }

  for (const { origen, destino } of conexiones) {
    const dx = destino.x - origen.x;
    const dy = destino.y - origen.y;
    const d = max(sqrt(dx * dx + dy * dy), 0.01);
    const tension = (d - largoResorte) * 0.002;
    origen.ax += (dx / d) * tension * 0.2;
    origen.ay += (dy / d) * tension * 0.2;
    destino.ax -= (dx / d) * tension;
    destino.ay -= (dy / d) * tension;
  }

  for (const persona of personas) {
    const margen = radioDe(persona) * 1.5;
    persona.vx = (persona.vx + persona.ax) * 0.94;
    persona.vy = (persona.vy + persona.ay) * 0.94;
    const rapidez = sqrt(persona.vx ** 2 + persona.vy ** 2);
    if (rapidez > 1.5) {
      persona.vx *= 1.5 / rapidez;
      persona.vy *= 1.5 / rapidez;
    }
    persona.x = constrain(persona.x + persona.vx, margen, width - margen);
    persona.y = constrain(persona.y + persona.vy, margen, height - margen);
  }
}

function dibujarBlob(persona) {
  const t = millis() * 0.0006;
  const activa = grupoActivo === persona.grupo;
  const atenuada = grupoActivo && !activa;
  const r0 = radioDe(persona) * (activa ? 1.12 : 1);

  noStroke();
  const relleno = color(persona.color);
  relleno.setAlpha(atenuada ? 60 : 230);
  fill(relleno);

  beginShape();
  const puntos = persona.principal ? 48 : 32;
  for (let i = 0; i < puntos; i++) {
    const angulo = (TWO_PI * i) / puntos;
    const deformacion = noise(persona.semilla + cos(angulo), persona.semilla + sin(angulo), t);
    const r = r0 * (0.8 + deformacion * 0.4);
    vertex(persona.x + cos(angulo) * r, persona.y + sin(angulo) * r);
  }
  endShape(CLOSE);

  if (!persona.principal && !MOSTRAR_TODOS_LOS_NOMBRES && !activa) return;

  fill(atenuada ? 170 : 30);
  textAlign(CENTER, TOP);
  textSize(max(persona.principal ? 12 : 10, radioDe(persona) * (persona.principal ? 0.4 : 0.6)));
  text(persona.nombre, persona.x, persona.y + r0 * 1.15);
}

function dibujarConexion({ origen, destino, color: colorTipo }) {
  const activa = grupoActivo === origen;
  const trazo = color(colorTipo);
  trazo.setAlpha(grupoActivo && !activa ? 30 : 170);
  stroke(trazo);
  strokeWeight(activa ? 3 : 2);
  line(origen.x, origen.y, destino.x, destino.y);
}

function dibujarLeyenda() {
  const tamano = max(12, radio * 0.4);
  const x = 20;
  let y = height - 20 - tamano * 1.6 * (TIPOS_CONEXION.length - 1);
  textSize(tamano);
  textAlign(LEFT, CENTER);
  for (const { tipo, color } of TIPOS_CONEXION) {
    noStroke();
    fill(color);
    circle(x + tamano * 0.5, y, tamano);
    fill(30);
    text(tipo, x + tamano * 1.4, y);
    y += tamano * 1.6;
  }
}
