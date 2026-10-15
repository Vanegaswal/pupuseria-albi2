# Guía de publicación: Supabase, Render y Vercel

Esta aplicación se despliega en tres servicios:

- **Supabase:** base de datos PostgreSQL.
- **Render:** API Express y Socket.IO.
- **Vercel:** aplicación React y páginas públicas del menú QR.

Para consultar el diagrama ER, las claves y cómo inspeccionarlas desde pgAdmin, revisa [el esquema de la base de datos](ESQUEMA_BD.md).

El QR debe contener la URL pública de Vercel. El menú consulta a la API de Render y la API lee y guarda los datos en Supabase. No se debe conectar el navegador directamente a PostgreSQL ni publicar credenciales de base de datos.

## 1. Crear la base de datos en Supabase

1. Crea un proyecto en [Supabase](https://supabase.com/dashboard).
2. Guarda la contraseña de la base de datos en un lugar seguro.
3. En el proyecto abre **Connect** y selecciona **Session pooler**.
4. Copia la cadena de conexión completa. Debe tener esta forma aproximada; usa los valores que te entrega Supabase, no escribas estos marcadores literalmente:

   ```text
   postgresql://postgres.PROJECT_REF:PASSWORD@POOLER_HOST:5432/postgres
   ```

   El pooler de sesión es adecuado para conectar desde Render y evita depender de que Render tenga conectividad IPv6 directa. Si la contraseña incluye caracteres especiales, utiliza la cadena que Supabase genera y codifícala correctamente.

## 2. Inicializar tablas y datos

Haz este paso **una sola vez y contra el proyecto Supabase de producción**. Los scripts crean roles, administrador, mesas y productos de muestra. Ejecutar `seed-mockup.ts` repetidamente puede duplicar productos.

Desde una terminal, en la carpeta `backend`, crea un archivo local `.env` con estos valores:

```dotenv
DATABASE_URL=PEGA_AQUI_LA_CADENA_SESSION_POOLER_DE_SUPABASE
INITIAL_ADMIN_PASSWORD=ELIGE_UNA_CLAVE_LARGA_DE_AL_MENOS_12_CARACTERES
JWT_SECRET=ELIGE_UN_VALOR_ALEATORIO_LARGO_Y_PRIVADO
```

No compartas este archivo ni lo subas a GitHub. `.env` está excluido del repositorio.

Ejecuta los scripts desde `backend`, en este orden:

```bash
npm install
npx ts-node-dev --transpile-only scripts/init-db.ts
npx ts-node-dev --transpile-only scripts/update-db.ts
npx ts-node-dev --transpile-only scripts/update-sesiones.ts
npx ts-node-dev --transpile-only scripts/seed-admin.ts
npx ts-node-dev --transpile-only scripts/seed-mockup.ts
```

El usuario inicial es `admin`; la contraseña es el valor que configuraste en `INITIAL_ADMIN_PASSWORD`. Si ya existe un administrador en esa base, el script no reemplaza su contraseña.

## 3. Publicar la API y Socket.IO en Render

1. Sube el repositorio a GitHub.
2. En [Render](https://dashboard.render.com), crea un **Web Service** conectado al repositorio.
3. Configura:

   | Campo | Valor |
   | --- | --- |
   | Root Directory | `backend` |
   | Build Command | `npm install && npm run build` |
   | Start Command | `npm start` |

4. Agrega estas variables de entorno en Render:

   | Variable | Valor |
   | --- | --- |
   | `DATABASE_URL` | Cadena Session pooler de Supabase |
   | `JWT_SECRET` | El mismo secreto privado configurado para el entorno |

   Render define `PORT` automáticamente. No uses `localhost` ni una dirección de tu computadora en las variables de producción.

5. Espera a que el servicio termine el despliegue. Copia su URL pública, por ejemplo `https://pupuseria-api.onrender.com`.

## 4. Publicar el frontend en Vercel

1. En [Vercel](https://vercel.com/dashboard), importa el mismo repositorio.
2. Configura el proyecto:

   | Campo | Valor |
   | --- | --- |
   | Root Directory | `frontend` |
   | Framework | Vite |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |

3. Agrega las variables de entorno del proyecto Vercel:

   | Variable | Valor |
   | --- | --- |
   | `VITE_API_URL` | `https://pupuseria-api.onrender.com/api` usando tu URL real de Render |
   | `VITE_PUBLIC_APP_URL` | Dominio público de Vercel, por ejemplo `https://pupuseria-albi.vercel.app` |

   No agregues una barra `/` al final de `VITE_PUBLIC_APP_URL`. Estas variables se incluyen durante la compilación del frontend, así que debes desplegarlo de nuevo después de cambiarlas.

4. La configuración `frontend/vercel.json` ya envía rutas como `/menu/3` a la aplicación React. Esto permite que el teléfono abra directamente el menú escaneado, incluso al cargar la URL por primera vez.

## 5. Probar el flujo del QR

1. Abre el dominio de Vercel e inicia sesión con `admin` y la clave inicial.
2. Entra a **Gestión de Mesas y QR**. Revisa que aparezca cada mesa.
3. Usa **Imprimir QR** en una mesa. La hoja está preparada en tamaño A5; en el diálogo de impresión selecciona tamaño real o escala 100 % y evita recortar el código.
4. Escanea el código con el teléfono. Debe abrir una dirección como `https://pupuseria-albi.vercel.app/menu/3`.
5. Agrega un producto, envía el pedido y confirma que aparezca en el monitor de Cocina. Prueba también solicitar la cuenta.

Puedes comprobar la API pública abriendo esta dirección en el navegador, sustituyendo el dominio por el tuyo:

```text
https://pupuseria-api.onrender.com/api/mesas/publicas
```

Debe devolver una lista JSON con identificador y número de mesa. También puedes probar una ruta de menú sin escanear:

```text
https://pupuseria-albi.vercel.app/menu/3
```

## 6. Problemas comunes

- **El QR abre `localhost`:** abre Gestión de Mesas desde el dominio de Vercel y vuelve a imprimir el QR. No uses códigos impresos desde la dirección local de desarrollo.
- **La página abre pero no carga productos:** verifica `VITE_API_URL`, el despliegue de Render y que `/api/productos` responda.
- **Error de conexión a Supabase:** confirma que `DATABASE_URL` sea la cadena Session pooler completa, que la contraseña esté correcta y que no hayas copiado la URL de Transaction pooler. Revisa los logs de Render.
- **Vercel muestra 404 al abrir `/menu/3`:** confirma que `frontend/vercel.json` se haya incluido y que Vercel tenga `frontend` como directorio raíz.
- **Cocina no recibe pedidos en tiempo real:** confirma que `VITE_API_URL` apunte al mismo backend público de Render y vuelve a desplegar Vercel.
- **Render tarda en responder después de estar inactivo:** algunos planes pueden suspender servicios cuando no reciben tráfico; espera a que despierte o considera un plan siempre activo.

## Referencias

- [Conectar a PostgreSQL en Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Desplegar Vite en Vercel](https://vercel.com/docs/frameworks/frontend/vite)
- [Web Services de Render](https://render.com/docs/web-services)
