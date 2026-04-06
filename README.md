<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AI Studio App - Local Run & Deployment

這個專案包含了能讓您在本地執行以及部署到線上的完整設定，基於 Vite, React, TailwindCSS 與 Express 構建。

## 🚀 啟動方式 (Run Locally)

**環境需求 (Prerequisites):** Node.js (v18+)

1. **安裝依賴套件:**
   確保您在專案根目錄下，執行：
   ```bash
   npm install
   ```
2. **環境變數設定:**
   使用 `.env.example` 作為範本，將其複製並命名為 `.env` 或 `.env.local`。並設定專屬的 API 金鑰：
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```
3. **啟動開發伺服器:**
   ```bash
   npm run dev
   ```
   伺服器與前端 Vite 將會啟動在 `http://localhost:3000`。

## 📦 部署指南 (Deployment)

已設計標準的 GitHub Actions CI/CD 工作流程，位於 `.github/workflows/deploy.yml`。

如何自動化部署：
1. **選擇平台**：本專案為包含 API 的全端專案，建議您可以部署到 Render, Heroku 等平台。
2. **設定 Secrets**：在上述 PaaS 平台中設定好部署 Webhook，並將相關 URL 加入 GitHub 專案的 Secrets 中。
3. **編輯 Action**：於 `deploy.yml` 的 `Deploy to Production` 步驟中，解除預設的 Webhook curl 註解，或是填入對應的部署指令。
往後只需推上 `main` 分支，GitHub Action 即會自動完成構建 (build) 並部署。

## 📄 專案架構與忽略設定 (Gitignore)

專案已配有嚴格的 `.gitignore` 檔案：
- **相依性**：忽略 `node_modules/` 等。
- **建置產物**：避免提交 `dist/`, `build/` 等資料夾。
- **機密設定**：確保隱私的 `.env*` 檔不會外洩（僅保留 `.env.example` 供參考）。
- **暫存檔**：排除各種編輯器（如 VSCode）、系統（如 macOS的 `.DS_Store`）之暫存檔案。
