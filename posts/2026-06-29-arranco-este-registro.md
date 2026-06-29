---
title: Arranco este registro
date: 2026-06-29
tag: learning
summary: Por qué empiezo a apuntar lo que construyo y aprendo, y qué toqué hoy.
---

Empiezo este registro para tener un sitio visible de lo que voy haciendo —
proyectos personales y cosas del trabajo — y de lo que aprendo por el camino.
Mitad portfolio, mitad memoria externa.

## Cómo funciona

Cada entrada es un `.md` en `posts/` con un poco de frontmatter:

```
---
title: ...
date: 2026-06-29
tag: learning   # o work
summary: ...
---
```

Un script de Bun (`build.ts`) los convierte a HTML estático. El sitio sigue
sin dependencias en runtime — `marked` solo corre en el build.

## Lo de hoy

Estuve metiendo validación de esquemas en **Eva**, mi framework HTTP, sin
dependencias externas. Dos partes:

- **Runtime**: una función que recorre el body una sola vez, compara tipos con
  `typeof`, y cuenta los campos requeridos vistos para detectar los que faltan
  (sin volver a recorrer el esquema, y respetando los opcionales).
- **Tipos**: empezar a entender el "segundo lenguaje" de TypeScript —
  phantom types, `Static<T>` con `infer`, y los mapped types (`keyof`, `P[K]`,
  `[K in keyof P]`). Aquí me explotó la cabeza; sigo mañana.

La idea: que del esquema salga solo el tipo del body, para que el handler venga
tipado sin escribir el tipo a mano.
