# Render Deployment Configuration for Savings Dashboard

This configuration file enables one-click deployment to Render.

## What This Does

- Sets up an Express.js server
- Serves your static dashboard files
- Provides Macrodroid webhook endpoint
- Connects to Firebase Realtime Database
- Auto-deploys on every GitHub push

## Environment Variables Required

Set these in Render dashboard:

```
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

## Deployment Steps

1. Connect your GitHub repo to Render
2. Render detects `render.yaml`
3. Automatically configures the deployment
4. Sets environment variables in Render dashboard
5. Click "Deploy"

## Macrodroid Webhook

Send POST requests to:
```
https://your-app.onrender.com/api/macrodroid-proof
```

Body:
```json
{
  "tid": "AB123.456.XYZ",
  "successMessage": "Transfer successful. Confirmation: TXN#123456789"
}
```

## Health Check

Test if server is running:
```
GET https://your-app.onrender.com/api/health
```
