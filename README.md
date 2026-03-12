# Bot WhatsApp COD — WooCommerce

Bot de confirmación de pedidos contraentrega (COD) sin IA, optimizado para dropshipping.

## Arquitectura de costo

| Componente          | Costo            |
|---------------------|------------------|
| IA (Gemini/GPT)     | **$0** — no se usa |
| Procesamiento       | **$0** — keywords simples |
| Meta API            | ~$0.05 por conversación de 24h |
| MySQL               | $0 — tabla en tu BD de WooCommerce |

---

## Flujo de conversación

```
WooCommerce orden nueva
        ↓
[GUARDIA 1] ¿Teléfono en blacklist? → SÍ → Notifica y bloquea
        ↓ NO
[GUARDIA 2] ¿Tiene 2+ pedidos pendientes? → SÍ → Notifica y para
        ↓ NO
Crea sesión en bot_order_sessions
        ↓
Envía template de WhatsApp con botones:
[✅ Confirmar] [✏️ Modificar] [❌ Cancelar]
        ↓
Cliente responde...

─── CONFIRMAR ──────────────────────────────
→ WooCommerce: status = processing
→ Bot: mensaje de confirmación
→ Sesión: confirmed

─── MODIFICAR ──────────────────────────────
→ Bot: "¿Qué deseas modificar? 1) Dirección 2) Ciudad"
→ Cliente elige
→ Bot: "Escríbeme el nuevo valor"
→ Cliente escribe
→ Bot: muestra resumen con los cambios
→ Cliente responde SÍ/NO
  SÍ → actualiza WooCommerce + confirmed
  NO → vuelve a preguntar qué modificar

─── CANCELAR ───────────────────────────────
→ WooCommerce: status = cancelled
→ Bot: mensaje de cancelación
→ Sesión: cancelled
→ Historial: +1 cancelación (si llega al umbral → blacklist)

─── SIN RESPUESTA ──────────────────────────
→ Scheduler (cada hora) revisa next_retry_at
→ Si llegó el momento: reenvía recordatorio de texto
→ Tras max_attempts sin respuesta: cancela pedido en WC → expired
```

---

## Protección anti-abuso

- **Blacklist**: cliente que cancela 3+ veces en 30 días → bloqueado automáticamente
- **Límite de pendientes**: máx 2 pedidos sin confirmar al mismo tiempo por cliente
- Ambos valores son configurables en `.env`

---

## Instalación en Hostinger

### 1. Subir archivos

```bash
# Por SSH o panel de Hostinger
cd /home/tu_usuario/public_html/bot  # o el subdomain que tengas
git clone <tu-repo> .
pnpm install  # o npm install
pnpm build
```

### 2. Crear las tablas en MySQL

En phpMyAdmin de Hostinger, ejecuta el archivo:
```
migrations/001_bot_tables.sql
```

### 3. Configurar variables de entorno

```bash
cp src/.env.example .env
nano .env
# Rellena todos los valores
```

### 4. Configurar WooCommerce Webhook

En tu WP admin:
- WooCommerce → Ajustes → Avanzado → Webhooks → Añadir webhook
- Nombre: `Bot Confirmación Pedidos`
- Estado: Activo
- Tema: **Pedido creado**
- URL de entrega: `https://bot.tudominio.com/webhook-woocommerce`
- Versión API: WP REST API Integration v3
- Copia el "Secreto" al `.env` como `WC_WEBHOOK_SECRET`

### 5. Configurar Meta Webhook

En Meta for Developers → Tu app → WhatsApp → Configuration:
- Callback URL: `https://bot.tudominio.com/webhook-meta`
- Verify token: el mismo que pusiste en `META_WEBHOOK_VERIFY_TOKEN`
- Suscribir a: `messages`

### 6. Crear el template en Meta Business Manager

Ve a WhatsApp Manager → Plantillas de mensajes → Crear plantilla

**Categoría:** Utility (transaccional, no marketing — más barato)

**Nombre:** `confirmar_pedido`

**Cuerpo del mensaje:**
```
CONFIRMA TU PEDIDO

¡Hola, {{1}}! 😊 Soy {{2}}, de la tienda {{3}}.

Aquí los detalles de tu compra:

📦 Pedido #{{4}}
🌟 Producto(s): {{5}}
💵 Total a pagar: {{6}}
📍 Dirección de envío: {{7}}

❗ No enviamos sin confirmación previa. Por favor verifica que todo está correcto.

🚚 Envío gratuito. Pago contraentrega.
```

**Botones (Quick Reply):**
- Botón 1: `✅ Confirmar` → payload: `CONFIRM`
- Botón 2: `✏️ Modificar datos` → payload: `MODIFY`
- Botón 3: `❌ Cancelar pedido` → payload: `CANCEL`

### 7. Crear claves API de WooCommerce

WooCommerce → Ajustes → Avanzado → REST API → Añadir clave
- Descripción: `Bot WhatsApp`
- Usuario: admin
- Permisos: **Lectura/Escritura**
- Copia Consumer key y secret al `.env`

---

## Variables de entorno clave

| Variable | Descripción | Default |
|---|---|---|
| `BOT_MAX_ATTEMPTS` | Reintentos máximos | 2 |
| `BOT_RETRY_DELAY_HOURS` | Horas entre intentos | 24 |
| `BOT_SESSION_EXPIRE_HOURS` | Horas para expirar | 48 |
| `BOT_MAX_PENDING_PER_CUSTOMER` | Pedidos pendientes máx | 2 |
| `BOT_BLACKLIST_THRESHOLD` | Cancelaciones para blacklist | 3 |
| `BOT_BLACKLIST_WINDOW_DAYS` | Ventana de días para blacklist | 30 |
| `BOT_AGENT_NAME` | Nombre del bot | Camila |
| `STORE_NAME` | Nombre de la tienda | Equilibrium |

---

## Estructura del proyecto

```
src/
├── index.ts                          ← Servidor Express + rutas
├── controllers/
│   ├── WooWebhookController.ts       ← Recibe pedidos de WooCommerce
│   └── MetaWebhookController.ts      ← Recibe mensajes de clientes
├── services/
│   ├── BotEngine.ts                  ← Lógica del flujo (sin IA)
│   ├── WhatsAppService.ts            ← Meta API + plantillas de texto
│   ├── WooCommerceService.ts         ← WooCommerce REST API
│   └── RetryScheduler.ts            ← Scheduler de reintentos
├── repositories/
│   ├── BotSessionRepository.ts       ← CRUD bot_order_sessions
│   └── CustomerHistoryRepository.ts  ← CRUD bot_customer_history
└── shared/
    ├── dtos/index.ts                 ← Tipos TypeScript
    └── database/db.ts                ← Pool MySQL
migrations/
└── 001_bot_tables.sql                ← Ejecutar en phpMyAdmin
```