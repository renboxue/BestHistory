# BestHistory

<p align="center"><img src="../../assets/besthistory-icon.png" alt="BestHistory" width="112" /></p>
<p align="center"><strong>Convierte el historial del navegador en una caja de herramientas de sitios que de verdad puedas volver a encontrar.</strong></p>

<!-- BESTHISTORY_SEO_STEP27_SUMMARY_START -->
<p align="center">BestHistory es un gestor de historial del navegador para Chrome y Chromium centrado en la privacidad: permite buscar historial antiguo, encontrar sitios web que visitaste y olvidaste, y organizar el historial por sitio, etiquetas, notas y títulos de página.</p>
<!-- BESTHISTORY_SEO_STEP27_SUMMARY_END -->

<p align="center">
[简体中文](../../README.md) · [繁體中文](../zh-TW/README.md) · [English](../en/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · Español · [Português](../pt/README.md) · [Français](../fr/README.md) · [Deutsch](../de/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Русский](../ru/README.md) · [العربية](../ar/README.md) · [हिन्दी](../hi/README.md) · [Bahasa Indonesia](../id/README.md) · [Türkçe](../tr/README.md) · [বাংলা](../bn/README.md) · [Tiếng Việt](../vi/README.md)
</p>

<p align="center">
<a href="https://github.com/renboxue/BestHistory/releases/tag/v0.1.0-beta"><strong>⬇️ Descargar Chrome Beta v0.1.0</strong></a>
&nbsp;·&nbsp; <a href="INSTALL.md">Instalación</a>
&nbsp;·&nbsp; <a href="../LANGUAGES.md">Documentación en 18 idiomas</a>
</p>

## Antes de empezar: por qué existe BestHistory

BestHistory es una pequeña herramienta que construí como desarrollador independiente para resolver un problema muy mío.

A menudo encontraba un sitio realmente útil y, unos días después, cuando volvía a necesitarlo, ya no recordaba cómo se llamaba. O solo recordaba “lo vi en algún sitio”, pero no la página exacta. Como me daba miedo no volver a encontrarlo, mantenía demasiadas pestañas y ventanas abiertas, fijaba sitios, guardaba otros en marcadores y, con el tiempo, terminaba con historial, pestañas fijadas, marcadores y páginas que no me atrevía a cerrar. Y aun así, recuperar un sitio antiguo seguía siendo difícil.

Me di cuenta de que no quería otra lista de historial más bonita.

Quería algo más parecido a cómo funciona mi memoria:

**puedo olvidar el título de una página y la fecha, pero normalmente recuerdo qué tipo de sitio era y para qué lo usé.**

Así nació BestHistory.

> **Quiero que puedas cerrar esas pestañas que mantienes abiertas solo por miedo a no encontrarlas nunca más.**  
> Cuando vuelvas a necesitarlas, BestHistory debería ayudarte a regresar.

BestHistory sigue siendo un proyecto personal muy temprano. Si resuelve un problema que tú también tienes, me hará mucha ilusión. Y me interesa de verdad saber qué funciona, qué molesta y qué te gustaría que resolviera después.

<p align="center"><img src="../../assets/screenshots/home.webp" alt="BestHistory sitios" width="100%" /></p>
<p align="center"><sub>De miles de páginas visitadas a una pregunta mucho más humana: “¿qué sitios he usado?”</sub></p>

---

## ¿Qué cambia respecto al historial normal?

### 1. Primero sitios, no decenas de miles de páginas

El historial tradicional pone cada visita en una lista. Si abres treinta páginas dentro del mismo sitio, esas treinta entradas pueden llenar la pantalla.

BestHistory agrupa primero el historial por **sitio web**. Puedes ver qué sitios visitaste recientemente, cuáles usas más, cuándo fue la última visita y qué páginas concretas abriste dentro de cada uno.

### 2. Distintas formas de ordenar para ver lo que de verdad usas

- **Recientes**
- **Más visitados**
- **Por nombre**
- **Fijados**
- vistas separadas como **Sin organizar / Papelera / Sitios privados**

### 3. Tus propias etiquetas

Un sitio que para otra persona es una “herramienta”, para ti puede ser “trabajo”. También puede ser “diseño”, “IA” y “volver a usar” al mismo tiempo.

BestHistory admite **etiquetas personalizadas** y varias etiquetas por sitio. No se trata de construir una clasificación perfecta, sino de dejar más caminos para volver a encontrar algo cuando, meses después, solo recuerdas para qué servía.

### 4. Una línea de tiempo que agrupa páginas del mismo sitio

A veces seguimos queriendo responder: “¿qué estuve viendo ayer por la tarde?”

BestHistory conserva una línea de tiempo, pero agrupa las páginas consecutivas del mismo sitio y solo las despliega cuando necesitas el detalle.

<p align="center"><img src="../../assets/screenshots/timeline.webp" alt="BestHistory línea de tiempo plegable" width="100%" /></p>
<p align="center"><sub>Las páginas del mismo sitio permanecen juntas, para que la línea de tiempo se parezca a tu recorrido y no a un muro de títulos.</sub></p>

### 5. Una descripción que solo necesitas entender tú

El nombre oficial de un sitio no siempre me recuerda para qué lo usé. Por eso puedes añadir un nombre, nota o descripción propia:

> “El sitio con el que convertí el PDF en imágenes”
>
> “La referencia que encontré para ilustraciones infantiles”
>
> “La pequeña herramienta para consultar precios históricos”

También puedes buscar esas palabras más adelante. A veces tu propia descripción se parece mucho más a tu memoria real que el título oficial.

<p align="center"><img src="../../assets/screenshots/site-detail.webp" alt="BestHistory detalles, etiquetas y notas" width="100%" /></p>

---

## Modo privado: historial que quiero recordar, pero no dejar a la vista

Hay sitios que no queremos “olvidar”; simplemente no queremos que aparezcan mezclados con el historial normal y que cualquier persona pueda verlos fácilmente.

El **Modo privado (Pro)** cifra localmente URLs privadas, títulos y visitas. Solo puedes verlos después de introducir la contraseña privada que configuraste.

Si autorizas explícitamente a BestHistory a ejecutarse en incógnito, también puede guardar de forma cifrada esas visitas. No se mezclan con la lista normal y no se muestran directamente mientras el Modo privado está bloqueado.

> **Los sitios que no quieres dejar en el historial normal también pueden quedar recordados, discretamente, por BestHistory.**

Los datos privados siguen en tu dispositivo. El servidor de BestHistory no almacena URLs privadas, títulos, historial privado ni tu contraseña.

---

## Búsqueda, fijados y Papelera

La búsqueda puede usar sitios, dominios, etiquetas, notas y títulos de páginas. Aunque olvides por completo el nombre del sitio, recordar algo que viste allí puede ayudarte a recuperarlo.

Puedes fijar los sitios habituales. Los que no quieras ver ahora pueden ir a la **Papelera** sin borrarlos de inmediato; después puedes restaurarlos o eliminarlos de forma permanente.

Organizar el historial no debería obligarte a tomar una decisión irreversible cada vez. “Lo aparto por ahora” también es una opción válida.

---

## Copia de seguridad, restauración y migración entre navegadores

Los datos de organización de BestHistory se guardan principalmente en local.

Un único archivo `.bhbackup` permite mover y combinar tus datos entre ordenadores, instalaciones, dispositivos y navegadores. La restauración usa una combinación segura, no una sustitución ciega de todo lo actual.

Los datos del Modo privado siguen cifrados dentro de la copia y requieren la contraseña original.

> Por ahora, “sincronización entre navegadores” significa transferencia y combinación mediante una copia local. BestHistory **no** sube todo tu historial a la nube para sincronizarlo en tiempo real.

Es una decisión deliberada: quiero que BestHistory sea primero una herramienta **local-first**.

---

## Privacidad, Free y Pro

El servidor de BestHistory no almacena tu historial, URLs, títulos, etiquetas, notas, búsquedas, registros privados, claves de cifrado ni el contenido de `.bhbackup`.

Si inicias sesión, el servidor gestiona principalmente cuenta, autenticación y derechos Free / Trial / Pro. Más detalles en [PRIVACY.md](PRIVACY.md).

Las funciones locales principales pueden usarse **sin iniciar sesión**. Durante la Beta, las cuentas nuevas reciben actualmente **30 días de prueba Pro**. El Modo privado es hoy la principal función Pro.

---

## 18 idiomas en la interfaz y también en la documentación

<p align="center"><img src="../../assets/screenshots/languages.webp" alt="BestHistory 18 idiomas" width="100%" /></p>

README, instalación, privacidad, FAQ, seguridad, changelog y Release Note están disponibles en 18 idiomas. Consulta el [índice de idiomas](../LANGUAGES.md).

---

## Esto no ha hecho más que empezar

BestHistory nació porque yo mismo tenía miedo de cerrar pestañas y no volver a encontrar esos sitios.

Ahora ya puede ayudarme a recuperar sitios después de cerrarlos. Quiero seguir alrededor de ese mismo problema: poder cerrar pestañas con más tranquilidad y organizar mejor los sitios que realmente usamos, no añadir funciones solo por añadirlas.

Si BestHistory te resulta útil, agradeceré una ⭐ Star, un Issue cuando algo falle o simplemente que me cuentes cómo gestionas historial, marcadores y demasiadas pestañas. Para comentarios privados: **besthistory@126.com**.

No incluyas URLs privadas, contraseñas, historial privado ni copias completas en Issues públicos.

---

## Instalación Beta

**[⬇️ BestHistory v0.1.0 Beta para Chrome](https://github.com/renboxue/BestHistory/releases/tag/v0.1.0-beta)**

Por ahora se instala manualmente con **Modo desarrollador → Cargar descomprimida**. Consulta [INSTALL.md](INSTALL.md).

---

**El código fuente de la aplicación BestHistory es propietario y no se publica en este repositorio.**

Versión actual: **v0.1.0 Beta** · [CHANGELOG.md](CHANGELOG.md)
