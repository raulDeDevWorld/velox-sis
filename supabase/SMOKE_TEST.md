# Smoke test previo a producción

Ejecutar sobre un proyecto limpio de prueba.

1. Ejecutar `reset.sql`.
2. Ejecutar `migrations/001_initial.sql`.
3. Ejecutar `verify_install.sql`; debe mostrar el aviso de verificación correcta.
4. Crear una cuenta, completar el registro y ejecutar el bootstrap descrito en `BOOTSTRAP_ADMIN.md`.
5. Cerrar sesión y verificar acceso Admin.
6. Crear una sucursal, una categoría, un método de recepción y un servicio con precio.
7. Registrar un cliente sin CI y crear una orden normal.
8. Crear otra orden con entrega en el día y comprobar:
   - `orders.is_velox = true`;
   - `orders.total` incluye el adicional por cada unidad;
   - `order_items.surcharge` coincide con el adicional unitario.
9. Editar un cliente seleccionado al registrar una orden y verificar `/Clientes`.
10. Registrar una cuenta Cliente y comprobar que solo accede a sus rutas y órdenes.
11. Convertir Cliente → Personal con sucursal y verificar que:
    - `customers.active = false`;
    - `profiles.active = true`;
    - no aparece duplicado en `/Clientes`.
12. Convertir Personal → Cliente y verificar la operación inversa.
13. Desactivar y reactivar un cliente y un colaborador desde la UI.
14. Intentar desactivar o degradar al último Admin; Supabase debe rechazarlo.
15. Probar dos registros de orden simultáneos y confirmar números distintos.
16. Ejecutar nuevamente `verify_install.sql`.
