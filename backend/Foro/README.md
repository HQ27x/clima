Foro (backend)
================

Pequeño backend Express para el foro de ClimaApp. Usa almacenamiento en JSON en `data/` para mantener hilos, comentarios y usuarios.

Instalación
-----------

Desde la carpeta `backend/Foro`:

```bash
npm install
npm run dev   # requiere nodemon (dev) o npm start
```

Endpoints principales
--------------------

- GET /threads — lista de hilos
- POST /threads — crear hilo { title, body, authorId }
- GET /threads/:id — obtener hilo
- POST /threads/:id/comments — agregar comentario { authorId, body }
- POST /threads/:id/star — sumar una estrella al hilo (y opcionalmente al autor)

- GET /users — lista de usuarios con campo `credibility` calculado
- POST /users — crear usuario { username, displayName }
- POST /users/:id/star — dar una estrella al usuario

Notas de diseño
---------------

Este backend es intencionalmente simple y pensado para desarrollo/local. Para producción se recomienda:
- usar una base de datos real (Postgres, MongoDB, ...)
- proteger endpoints (autenticación/autorization)
- validar entradas y manejar concurrencia/locking al escribir archivos
