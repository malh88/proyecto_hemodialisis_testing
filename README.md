# Prototipo · Módulo de Hemodiálisis (Nefrología) · SIGESAPOL

Maquetado navegable en HTML, CSS y JavaScript puro (sin frameworks ni dependencias).
Abrir `index.html` en el navegador.

## Estructura

```
index.html            0 · Flujo propuesto (existente + nuevo)
bandeja.html          1 · Bandeja de Procedimientos Programados (columna "Etapa HD")
ficha-inicial.html    2 · Ficha HC Inicial del Programa de HD (solo 1ra vez)
programacion.html     3 · Programación de sesiones (genera citas)
sesion.html           4 · Registro de sesión de HD (cada cita)
seguimiento.html      5 · Seguimiento y reevaluación mensual
css/hd.css            Estilos compartidos (línea visual SIGESAPOL)
js/hd.js              Lógica del prototipo
```

## Lógica incluida en js/hd.js

- **Bandeja:** filtro por etapa HD, documento y nombre.
- **Ficha inicial:** cálculo de IMC; "Establecimiento de referencia" solo si es referido; agregar medicamento manual; validación de obligatorios (etiología, acceso, serologías, peso seco) antes de pasar a programación.
- **Programación:** genera las fechas según esquema (L-M-V / M-J-S), fecha de inicio y Nº de sesiones; salta feriados; pinta calendario y lista de citas.
- **Sesión:** ganancia interdialítica, UF programada (peso pre − peso seco) y UF lograda (pre − post); agregar controles intradiálisis; alerta de hipotensión (PAS < 90) que marca la incidencia; asistencia "No asistió/Suspendida" bloquea el registro clínico.
- **Seguimiento:** línea de sesiones con estados y bloqueo de la reevaluación hasta la penúltima sesión.

## Pendiente para integrar con SIGESAPOL

- Los valores entre corchetes `[ ]` son marcadores: se reemplazan por datos del backend.
- Datos de ejemplo en JS (feriados, peso seco, sesiones del seguimiento) deben venir de servicios.
- La barra oscura superior (`.proto-nav`) es solo para navegar el prototipo; se retira al integrar.
