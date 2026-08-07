# InvestIQ — Intelligent Multi-Asset Portfolio Management Platform

**InvestIQ** is a modern, lightweight web application designed to simplify personal portfolio tracking for retail investors. Developed by **FinTech CREW**, the platform unifies traditional **Equities (Stocks)** alongside physical market **Commodities (Gold, Silver, Crude Oil)** into a single, intuitive visual dashboard—replacing complex, spreadsheet-heavy interfaces with clean, interactive data analytics.

---

## 🌟 Key Features

* **Centralized Portfolio Visibility:** View overall net worth, current holdings, and real-time Profit & Loss ($\text{P\&L}$) for both Stocks and Commodities on a single dashboard.
* **Visual Analytics Suite:**
  * **Single-Line Trend Graphs:** Interactive historical price movement lines with custom accent gradient fills.
  * **Hover Data Markers:** Circular graph data markers that reveal exact price values and timestamps when hovered over.
  * **Allocation Pie Charts:** Real-time visual percentage breakdown of portfolio distribution across asset classes.
* **Interactive Modal Drawers:** Click on any asset row to open a detailed drawer displaying performance trends and quick "Buy More" / "Sell Asset" trade actions.
* **Responsive & Fast UI:** Built with lightweight web technologies to ensure zero page lag and immediate data rendering.

---

## 🛠️ Technical Architecture & Tech Stack

| Layer | Technologies Used | Key Responsibilities |
| :--- | :--- | :--- |
| **Frontend UI** | HTML5, CSS3, Vanilla JavaScript (ES6+), Chart.js | Responsive layouts, stock overview modals, DOM manipulation, and dynamic line/pie chart visualizations. |
| **API Layer** | RESTful APIs, Fetch API / Asynchronous JS | Asynchronous HTTP/JSON communication routing data between backend services and the frontend client. |
| **Database** | Relational Database (MySQL / PostgreSQL) | Structured schema management for user profiles, portfolio holdings, commodities, and transaction logs. |
| **Operations** | Git, GitHub | Version control, collaborative code management, and cloud repository hosting. |

---

## 👥 Team Roles & Project Contributions

Built by **FinTech CREW**:

* **Siddharth Kumari** — *Frontend Engineering & Quality Assurance*
  * Initialized repository structure and set up project files.
  * Developed core client-side layout components and UI styling.
  * Conducted end-to-end testing to ensure system stability and bug fixes.

* **Nikit** — *API Integration & Data Pipeline*
  * Developed REST API endpoints connecting backend database services directly to the frontend.
  * Handled asynchronous network requests for seamless asset data rendering and trade routing.

* **Harshini** — *Database Architecture & Visual Frontend*
  * Designed relational database schemas for user accounts, transaction histories, and holdings.
  * Modeled database queries and engineered frontend **Chart.js** analytics components (single-line price graphs and allocation pie charts).

---

## 📁 Repository Structure

```text
InvestIQ/
├── assets/             # Project logos, graphics, and static media
├── css/                # Custom CSS stylesheets (Flexbox/Grid, modal drawers)
├── js/                 # Client-side JavaScript (DOM handling, Chart.js logic)
├── api/                # REST API endpoints and data routing logic
├── database/           # Database schema files, SQL scripts, and seeds
├── index.html          # Main application dashboard page
└── README.md           # Project documentation
