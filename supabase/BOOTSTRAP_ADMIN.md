# Crear el primer administrador

Este procedimiento se usa una sola vez después de instalar `001_initial.sql`.

1. Crea la cuenta desde la aplicación y completa su registro como cliente.
2. Abre Supabase SQL Editor con acceso de propietario.
3. Ejecuta:

```sql
select public.bootstrap_first_admin('administrador@ejemplo.com');
```

4. Cierra la sesión de esa cuenta y vuelve a ingresar.

La función:

- exige que el correo exista en Supabase Auth;
- exige que la cuenta haya completado su ficha de cliente;
- crea el perfil Admin y desactiva temporalmente su ficha de cliente;
- rechaza la operación si ya existe un administrador activo;
- no está disponible para usuarios `authenticated`.

No incluyas correos reales dentro de `001_initial.sql`.
