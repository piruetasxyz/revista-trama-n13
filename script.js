// url de la aplicación web de apps script (termina en /exec).
// si está vacía o falla, se usa datos.json como respaldo.
const URL_DATOS = '';
const RUTA_RESPALDO = 'datos.json';

const PERSONAS_ESPERADAS = 15;

// cada persona elige a una persona por tipo; el orden define la curvatura de cada arco
const TIPOS_CONEXION = [
  { tipo: 'ideas', color: '#e4572e' },
  { tipo: 'procesos', color: '#1b998b' },
  { tipo: 'resultados', color: '#3a5ba0' },
];
const COLOR_BLOB = '#2b2b2b';
const COLOR_FONDO = '#f4f1ea';

let personas = [];
let conexiones = [];
let radio = 30;
let personaActiva = null;

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

// arma personas y conexiones, avisando en consola de cualquier dato raro
function construir(datos) {
  const filas = datos.personas || [];
  if (filas.length !== PERSONAS_ESPERADAS) {
    console.warn(`se esperaban ${PERSONAS_ESPERADAS} personas, llegaron ${filas.length}`);
  }

  personas = filas.map((fila, i) => {
    const angulo = (TWO_PI * i) / filas.length;
    const distancia = min(width, height) * 0.3;
    return {
      id: String(fila.id).trim(),
      nombre: fila.nombre,
      x: width / 2 + cos(angulo) * distancia + random(-20, 20),
      y: height / 2 + sin(angulo) * distancia + random(-20, 20),
      vx: 0,
      vy: 0,
      semilla: random(1000),
    };
  });

  const porId = new Map(personas.map((persona) => [persona.id, persona]));
  conexiones = [];

  for (const fila of filas) {
    const origen = porId.get(String(fila.id).trim());
    const elegidas = fila.conexiones || [];
    for (const [indiceTipo, { tipo, color }] of TIPOS_CONEXION.entries()) {
      const elegida = elegidas.find((conexion) => conexion.tipo === tipo);
      const idDestino = elegida ? String(elegida.id).trim() : '';
      const destino = porId.get(idDestino);
      if (!idDestino) {
        console.warn(`${fila.id} no tiene ${tipo}`);
      } else if (!destino) {
        console.warn(`${fila.id} tiene en ${tipo} un id inexistente: ${idDestino}`);
      } else if (destino === origen) {
        console.warn(`${fila.id} se eligió a sí misma en ${tipo}`);
      } else {
        conexiones.push({ origen, destino, tipo, color, indiceTipo });
      }
    }
  }

  const esperadas = PERSONAS_ESPERADAS * TIPOS_CONEXION.length;
  if (conexiones.length !== esperadas) {
    console.warn(`se esperaban ${esperadas} conexiones, hay ${conexiones.length}`);
  }
}

async function setup() {
  createCanvas(windowWidth, windowHeight);
  radio = min(width, height) * 0.04;
  textFont('system-ui, sans-serif');
  construir(await cargarDatos());
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  radio = min(width, height) * 0.04;
}

function draw() {
  background(COLOR_FONDO);
  actualizar();

  personaActiva = personas.find((persona) => dist(mouseX, mouseY, persona.x, persona.y) < radio) || null;

  for (const conexion of conexiones) dibujarConexion(conexion);
  for (const persona of personas) dibujarBlob(persona);
  dibujarLeyenda();
}

function dibujarLeyenda() {
  const tamano = max(12, radio * 0.35);
  const x = 20;
  let y = height - 20 - tamano * 1.6 * (TIPOS_CONEXION.length - 1);
  textSize(tamano);
  textAlign(LEFT, CENTER);
  for (const { tipo, color } of TIPOS_CONEXION) {
    stroke(color);
    strokeWeight(3);
    line(x, y, x + tamano * 2, y);
    noStroke();
    fill(30);
    text(tipo, x + tamano * 2.6, y);
    y += tamano * 1.6;
  }
}

// flotación suave: deriva con ruido, repulsión entre blobs y resortes en las conexiones
function actualizar() {
  const t = millis() * 0.0002;
  const largoReposo = min(width, height) * 0.3;
  const separacionMinima = radio * 4;

  for (const persona of personas) {
    const angulo = noise(persona.semilla, t) * TWO_PI * 2;
    persona.ax = cos(angulo) * 0.03 + (width / 2 - persona.x) * 0.00003;
    persona.ay = sin(angulo) * 0.03 + (height / 2 - persona.y) * 0.00003;
  }

  for (let i = 0; i < personas.length; i++) {
    for (let j = i + 1; j < personas.length; j++) {
      const a = personas[i];
      const b = personas[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = max(sqrt(dx * dx + dy * dy), 0.01);
      if (d < separacionMinima) {
        const empuje = ((separacionMinima - d) / separacionMinima) * 0.4;
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
    const tension = (d - largoReposo) * 0.00015;
    origen.ax += (dx / d) * tension;
    origen.ay += (dy / d) * tension;
    destino.ax -= (dx / d) * tension;
    destino.ay -= (dy / d) * tension;
  }

  const margen = radio * 1.5;
  for (const persona of personas) {
    persona.vx = (persona.vx + persona.ax) * 0.96;
    persona.vy = (persona.vy + persona.ay) * 0.96;
    const rapidez = sqrt(persona.vx ** 2 + persona.vy ** 2);
    if (rapidez > 1.2) {
      persona.vx *= 1.2 / rapidez;
      persona.vy *= 1.2 / rapidez;
    }
    persona.x = constrain(persona.x + persona.vx, margen, width - margen);
    persona.y = constrain(persona.y + persona.vy, margen, height - margen);
  }
}

function dibujarBlob(persona) {
  const t = millis() * 0.0006;
  const atenuada = personaActiva && personaActiva !== persona && !estanConectadas(personaActiva, persona);

  noStroke();
  const relleno = color(COLOR_BLOB);
  relleno.setAlpha(atenuada ? 70 : 230);
  fill(relleno);

  beginShape();
  const puntos = 48;
  for (let i = 0; i < puntos; i++) {
    const angulo = (TWO_PI * i) / puntos;
    const deformacion = noise(persona.semilla + cos(angulo), persona.semilla + sin(angulo), t);
    const r = radio * (0.8 + deformacion * 0.4) * (persona === personaActiva ? 1.15 : 1);
    vertex(persona.x + cos(angulo) * r, persona.y + sin(angulo) * r);
  }
  endShape(CLOSE);

  fill(atenuada ? 160 : 30);
  textAlign(CENTER, TOP);
  textSize(max(11, radio * 0.35));
  text(persona.nombre, persona.x, persona.y + radio * 1.25);
}

// curva hacia un lado según la dirección, así a→b y b→a quedan como arcos distintos;
// cada tipo curva distinto, así una misma persona elegida en dos tipos no se superpone
function dibujarConexion({ origen, destino, color: colorTipo, indiceTipo }) {
  const dx = destino.x - origen.x;
  const dy = destino.y - origen.y;
  const d = sqrt(dx * dx + dy * dy);
  if (d < radio * 2) return;

  const curvatura = 0.1 + indiceTipo * 0.08;
  const cx = (origen.x + destino.x) / 2 - dy * curvatura;
  const cy = (origen.y + destino.y) / 2 + dx * curvatura;

  // puntos de la bezier cuadrática, recortados fuera de los blobs
  const puntos = [];
  const pasos = 30;
  for (let i = 0; i <= pasos; i++) {
    const t = i / pasos;
    const x = (1 - t) ** 2 * origen.x + 2 * (1 - t) * t * cx + t ** 2 * destino.x;
    const y = (1 - t) ** 2 * origen.y + 2 * (1 - t) * t * cy + t ** 2 * destino.y;
    if (dist(x, y, origen.x, origen.y) > radio && dist(x, y, destino.x, destino.y) > radio * 1.1) {
      puntos.push([x, y]);
    }
  }
  if (puntos.length < 2) return;

  const involucrada = !personaActiva || origen === personaActiva || destino === personaActiva;
  const trazo = color(colorTipo);
  trazo.setAlpha(involucrada ? 180 : 25);

  noFill();
  stroke(trazo);
  strokeWeight(personaActiva && involucrada ? 2.5 : 1.5);
  beginShape();
  for (const [x, y] of puntos) vertex(x, y);
  endShape();

  // punta de flecha en el destino
  const [x1, y1] = puntos[puntos.length - 2];
  const [x2, y2] = puntos[puntos.length - 1];
  const angulo = atan2(y2 - y1, x2 - x1);
  const tamano = max(6, radio * 0.25);
  noStroke();
  fill(trazo);
  push();
  translate(x2, y2);
  rotate(angulo);
  triangle(0, 0, -tamano, -tamano * 0.5, -tamano, tamano * 0.5);
  pop();
}

function estanConectadas(a, b) {
  return conexiones.some(
    ({ origen, destino }) => (origen === a && destino === b) || (origen === b && destino === a)
  );
}
