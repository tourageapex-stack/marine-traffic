# Marine Traffic Dashboard

A premium, enterprise-grade dashboard for monitoring real-time vessel traffic at the **Vancouver**, **Portland**, and **Longview** ports.

## ⚓ Features

- **Enterprise Light Theme**: Clean, professional light-slate design optimized for corporate and operational use.
- **Real-Time Stats Grid**: Summary cards providing instant vessel counts for all monitored ports.
- **Global Search Filtering**: Real-time vessel search by name, port, or status across any viewport.
- **Pill-Style Navigation**: Modern, intuitive port selection with dynamic vessel counter updates.
- **Advanced Mobile View**: Intelligent **User-Agent detection** with a high-fidelity, card-based layout for field operations.
- **Vercel Serverless Proxy**: Production-ready CORS handling via `api/proxy.js` to ensure reliable live data fetching.

## 🚀 Getting Started

1.  **Clone the repository**: `git clone https://github.com/tourageapex-stack/marine-traffic.git`
2.  **Install dependencies**: `npm install`
3.  **Run locally**: `npm run dev`
4.  **Production Build**: `npm run build`

## 🛠 Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Vanilla CSS with a custom design system
- **Deployment**: Optimized for **Vercel** with Serverless Function support
- **Data Source**: ColRip Portal Live API

## 📱 Mobile Optimized

The dashboard features a **Dual-View Architecture**:
- **Desktop**: High-density sorted table with all operational columns.
- **Mobile**: Touch-optimized cards with high-contrast status pills and route flows.

## 🌐 Deployment (Vercel)

This project is ready for one-click deployment to Vercel:
1. Connect your GitHub repository.
2. Ensure the `vercel.json` is at the root.
3. Deploy! The API proxy will handle all cross-origin requests automatically.

---
**Maintained by Marine Traffic Systems | 2026**
