# Smoke test previo a producción

Ejecutar sobre un proyecto limpio de prueba.

1. Ejecutar `reset.sql`.
2. Ejecutar `migrations/001_initial.sql`.
3. Ejecutar `migrations/002_split_velox_surcharges.sql`.
4. Ejecutar `verify_install.sql`; debe mostrar el aviso de verificación correcta.
5. Crear una cuenta, completar el registro y ejecutar el bootstrap descrito en `BOOTSTRAP_ADMIN.md`.
6. Cerrar sesión y verificar acceso Admin.
7. Crear una sucursal, una categoría, un método de recepción y un servicio con precio.
8. Registrar un cliente sin CI y crear una orden normal.
9. Crear otra orden con entrega en el día y comprobar:
   - `orders.velox_type = 'same_day'` para entrega del día o `'later'` para Velox manual posterior;
   - `orders.velox_unit_surcharge_snapshot` conserva la tarifa unitaria aplicada;
   - `orders.total` incluye el adicional por cada unidad;
   - `order_items.surcharge` coincide con el adicional unitario.
   - una entrega para mañana a las `12:00` aplica automáticamente `later`;
   - una entrega para mañana a las `12:01` no aplica Velox salvo activación manual.
10. Editar un cliente seleccionado al registrar una orden y verificar `/Clientes`.
11. Registrar una cuenta Cliente y comprobar que solo accede a sus rutas y órdenes.
12. Convertir Cliente → Personal con sucursal y verificar que:
    - `customers.active = false`;
    - `profiles.active = true`;
    - no aparece duplicado en `/Clientes`.
13. Convertir Personal → Cliente y verificar la operación inversa.
14. Desactivar y reactivar un cliente y un colaborador desde la UI.
15. Intentar desactivar o degradar al último Admin; Supabase debe rechazarlo.
16. Probar dos registros de orden simultáneos y confirmar números distintos.
17. Ejecutar nuevamente `verify_install.sql`.
