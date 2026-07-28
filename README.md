# Hábitos

Registro diario de **comidas, entrenamientos y cuerpo**, con exportación mensual para analizar. PWA liviana, sin frameworks y **100 % offline**: todos los datos viven en el dispositivo.

![PWA](https://img.shields.io/badge/PWA-instalable-10B981) ![Offline](https://img.shields.io/badge/offline-100%25-0E9E6E) ![Sin dependencias](https://img.shields.io/badge/deps-0-3B82F6) ![Licencia](https://img.shields.io/badge/uso-personal-8A9A92)

---

## Qué es

Una app de seguimiento de hábitos pensada para el uso diario desde el celular. Registrás lo que comés y tomás, tus entrenamientos, tu peso/IMC y tu descanso, y al fin de mes exportás todo a CSV listo para tabla dinámica. No hay servidor, no hay cuenta, no hay nube: el navegador guarda todo localmente y la app funciona sin internet una vez instalada.

## Características

### 🍽️ Comida
- **Cuatro comidas**: desayuno, almuerzo, merienda y cena, cada una con su lista de alimentos.
- **Autocompletado inteligente**: al tocar el campo aparece un desplegable con los alimentos que ya cargaste antes, ordenados por frecuencia de uso. Ideal para lo que repetís seguido — un toque y lo agregás.
- **Edición rápida**: tocás el nombre del alimento (o el ícono de lápiz) para corregirlo; si lo dejás vacío, se elimina.
- **Bebidas** por chips con contador: cerveza, vino, fernet, gaseosa y agua, más un botón "Otro" para cargar cualquier otra (café, mate, jugo…). Las alcohólicas se marcan aparte.
- **Suplementos** con stepper: creatina (paso de 1 g) y proteína (paso de 5 g).
- **Resumen del día**: comidas hechas (x/4) y suplementos. (Bebidas y agua se siguen registrando en sus chips, pero no en el resumen superior.)

### 🏋️ Entreno
- Registro de sesiones por tipo (**fútbol, gimnasio, otro**), con duración en minutos, **intensidad** (suave / media / alta) y una nota opcional.
- **Resumen**: sesiones, minutos totales, tipos distintos y horas de sueño.
- **Descanso**: horas de sueño de anoche, con stepper de a media hora.

### 📊 Cuerpo (IMC)
- Cálculo de **IMC** a partir de altura (perfil) y peso registrado.
- **Escala OMS** visual con las bandas: bajo peso, normal, sobrepeso y obesidad, y un marcador que ubica tu valor.
- Registro de **peso** con fecha (retroactiva si hace falta) y **cintura opcional**.
- **Evolución del peso**: sparkline SVG de los últimos 14 registros + listado con IMC por fecha.

### 📈 Resumen
- **Racha** de días completos consecutivos (+ tu mejor racha histórica).
- **Métricas** del mes: comidas por día, agua por día, entrenos y minutos, días con alcohol.
- **Heatmap de adherencia**: calendario **navegable** (flechas ‹ ›) con cada día coloreado según qué tan completo lo cargaste. Un día cuenta como **completo** con las 4 comidas + agua + (entreno o descanso) + suplementos (creatina y proteína). Tocás un día para abrirlo.
- **Constancia por día de la semana** (barras) y **evolución del peso** del mes.
- Todo se calcula sobre los datos existentes: no agrega ni cambia nada del modelo de datos.

### 💾 Datos
- **Exportar CSV del mes** o **CSV completo** (una fila por registro, listo para tabla dinámica).
- **Backup JSON** de todos los datos y **restaurar** desde archivo (por si cambiás de celular).
- **Instalar** la PWA en la pantalla de inicio (con guía específica para iPhone).
- **Zona peligrosa**: borrar todo el historial del dispositivo.

### 🎨 Extras
- **Tema claro / oscuro** automático según el sistema, con toggle manual (se recuerda).
- **Navegación por fecha**: día anterior / siguiente / volver a hoy.
- **Feedback háptico** (vibración) en las acciones donde el dispositivo lo soporta.
- **Localización es-AR**: coma decimal, nombres de días y meses en español.

---

## Formato de exportación (CSV)

Separador `;` y BOM UTF-8, para que **Excel en es-AR** lo abra en columnas sin romper acentos ni decimales.

| Columna | Descripción |
|---|---|
| `FechaISO` | `YYYY-MM-DD` (ordena y se parsea sin ambigüedad) |
| `Fecha` | `DD/MM/YYYY` (legible en Excel) |
| `DiaSemana` | lunes, martes… (para patrones por día) |
| `Tipo` | Comida · Bebida · Bebida alcohólica · Suplemento · Entrenamiento · Cuerpo · Descanso |
| `Categoria` | Ej: Almuerzo, Cerveza, Creatina, Fútbol, Peso, IMC, Sueño |
| `Detalle` | Texto libre (alimento, nota del entreno, etc.) |
| `Cantidad` | Valor numérico (con coma decimal) |
| `Unidad` | unidad, copa, vaso, g, min, kg, cm, h… |

---

## Instalación y uso

Al ser una PWA no requiere instalación desde tienda:

- **Android / Chrome**: abrí la web y usá "Instalar app" (o el botón *Instalar* en la sección Datos).
- **iPhone / Safari**: tocá **Compartir** ⬆️ y luego **Agregar a inicio**.

Una vez instalada funciona sin conexión. Los datos quedan **solo en ese dispositivo**, así que conviene **hacer backup seguido** desde la sección Datos.

---

## Stack técnico

- **HTML + CSS + JavaScript vanilla**. Sin frameworks, sin build, **cero dependencias**.
- **Almacenamiento**: `localStorage` (claves `habitos_data_v1`, `habitos_profile_v1`, `habitos_theme`).
- **Service Worker** con estrategia *cache-first* para funcionamiento offline total y **auto-actualización**: al subir una versión nueva, el SW fresco se instala, toma control y la app se recarga sola.
- **Hosting**: pensado para GitHub Pages (todo estático).
- Ajuste de altura específico para **iOS instalado** (standalone), donde `100dvh` queda corto y la barra flotante se desacomoda.

## Estructura del proyecto

```
habitos/
├── index.html      # UI + estilos (design tokens, tema claro/oscuro, layout)
├── app.js          # Toda la lógica (estado, render, export/import, PWA)
├── sw.js           # Service Worker (caché offline + auto-update)
├── manifest.json   # Manifest PWA (nombre, íconos, tema, standalone)
├── favicon.png
├── apple-touch-icon.png
├── mark.png
├── icon-192.png
├── icon-512.png
└── icon-maskable-512.png
```

## Modelo de datos

Cada día se guarda bajo su fecha (`YYYY-MM-DD`) con esta forma:

```js
{
  meals:   { desayuno:[], almuerzo:[], merienda:[], cena:[] }, // arrays de strings
  drinks:  { cerveza:0, vino:0, fernet:0, gaseosa:0, agua:0 }, // contadores
  otros:   { "café":2, ... },                                  // bebidas libres
  supp:    { creatina:0, proteina:0 },                         // gramos
  training:[ { tipo, nombre, duracion, intensidad, nota } ],
  peso:    null,   // kg
  cintura: null,   // cm (opcional)
  sueno:   null    // horas
}
```

El perfil (altura, para el IMC) se guarda aparte en `habitos_profile_v1`.

---

## Desarrollo y deploy

No hay pasos de build: se editan los archivos y se suben tal cual.

> ⚠️ **Importante**: cada vez que cambies `index.html`, `app.js` o cualquier asset, **subí el número de versión de la caché** en `sw.js` (`const CACHE = 'habitos-vN'`). Sin eso, las apps ya instaladas siguen sirviendo la copia vieja del caché y no verían los cambios.

Flujo típico:

1. Editar los archivos.
2. Bumpear `CACHE` en `sw.js` (v6 → v7, etc.).
3. Subir a GitHub (GitHub Pages publica automáticamente).
4. Abrir la PWA una vez para que el SW nuevo tome control y recargue.

---

## Privacidad

100 % local. **Ningún dato sale del dispositivo**: no hay backend, ni analytics, ni cuentas. La contracara es que si perdés o reseteás el dispositivo sin backup, perdés el historial. Por eso: backup seguido.

---

## Roadmap / ideas

- [ ] Filtrar el autocompletado de alimentos por comida (que el desayuno no sugiera cosas de la cena).
- [ ] Objetivos diarios configurables (agua, proteína, etc.).
- [ ] Vista semanal / mensual con métricas agregadas.

---

Hecho para uso personal. Sin fines comerciales.
