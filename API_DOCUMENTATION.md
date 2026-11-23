# Farma Francis Pro - API Documentation

## 📡 Base URL

```
Production: https://farmafrancis.up.railway.app
Development: http://localhost:3000
```

---

## 🔐 Authentication

All API requests require authentication via session cookie.

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Response
```json
{
  "user": {
    "id": 1,
    "name": "User Name",
    "email": "user@example.com"
  },
  "session": "session-token"
}
```

---

## 📱 WhatsApp Integration

### Send Message
```http
POST /api/whatsapp/send
Content-Type: application/json

{
  "to": "5531999999999",
  "message": "Hello World",
  "type": "text"
}
```

### Send Media
```http
POST /api/whatsapp/send-media
Content-Type: application/json

{
  "to": "5531999999999",
  "media": "base64-encoded-media",
  "type": "image",
  "caption": "Image caption"
}
```

---

## 🤖 Automation

### List Flows
```http
GET /api/trpc/visualFlows.list
```

### Create Flow
```http
POST /api/trpc/visualFlows.create
Content-Type: application/json

{
  "name": "Flow Name",
  "description": "Flow Description",
  "flowData": "{\"nodes\":[],\"edges\":[]}"
}
```

### Execute Flow
```http
POST /api/trpc/automationSSE.execute
Content-Type: application/json

{
  "flowId": 1,
  "input": {
    "message": "Hello",
    "phone": "5531999999999"
  }
}
```

### Get Statistics
```http
GET /api/trpc/automationSSE.stats?input={"json":{"period":"today"}}
```

### Response
```json
{
  "totalExecutions": 100,
  "successfulExecutions": 85,
  "failedExecutions": 15,
  "avgResponseTime": 2,
  "totalConversations": 50,
  "whatsappExecutions": 70,
  "instagramExecutions": 30,
  "conversions": 12,
  "conversionRate": 12
}
```

---

## 📊 Dashboard

### Get Metrics
```http
GET /api/trpc/dashboard.metrics
```

### Get Recent Conversations
```http
GET /api/trpc/conversations.recent?input={"json":{"limit":20}}
```

---

## 🔔 Notifications

### Enable Sound
```javascript
// Frontend hook
const { playSound } = useMessageSound({ enabled: true });
```

### Error Notifications
```javascript
// Subscribe to errors
useErrorNotificationSubscriber((notification) => {
  console.log(notification.title, notification.message);
});
```

---

## 🧪 Test Mode

### Enable Test Mode for Flow
```http
POST /api/trpc/automationSSE.testFlow
Content-Type: application/json

{
  "flowId": 1,
  "testMessage": "Test message"
}
```

---

## 📤 Export

### Export Flows to Excel
```javascript
import { exportFlowsToExcel } from '@/lib/exportExcel';

exportFlowsToExcel(flows);
// Downloads: fluxos-automacao-2026-03-02.xlsx
```

### Export Executions
```javascript
import { exportExecutionsToExcel } from '@/lib/exportExcel';

exportExecutionsToExcel(executions);
// Downloads: execucoes-2026-03-02.xlsx
```

---

## 📝 Logs

### Get Execution Logs
```http
GET /api/trpc/logs.getByExecution?input={"json":{"executionId":1}}
```

### Create Log Entry
```http
POST /api/trpc/logs.create
Content-Type: application/json

{
  "executionId": 1,
  "nodeId": "node-1",
  "nodeName": "Send Message",
  "nodeType": "message",
  "status": "completed",
  "duration": 150
}
```

---

## 🔒 Rate Limiting

| User Type | Rate Limit |
|-----------|------------|
| Authenticated | 60 req/min |
| Webhooks | 300 req/min |
| Admin | 30 req/min |

---

## 🚨 Error Codes

| Code | Description |
|------|-------------|
| 10001 | Unauthorized - Please login |
| 10002 | Invalid input data |
| 10003 | Resource not found |
| 10004 | Rate limit exceeded |
| 10005 | Flow validation failed |
| 10006 | Webhook signature invalid |

---

## 📞 Support

- **GitHub Issues:** https://github.com/Dedefg87/farma-francis-platform/issues
- **Telegram Group:** @OsFrancis

---

**Last Updated:** 02/03/2026 09:30 (GMT-3)
