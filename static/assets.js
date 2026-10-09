/* ============================================================
   StockSense Real Image Assets (Replaced SVGs)
   Injects downloaded Unsplash images into the DOM containers
   ============================================================ */

document.addEventListener("DOMContentLoaded", function() {
    setTimeout(function() {
        const injectMap = {
            "hero-illustration-container": "<img src=\"/static/assets/images/hero_banner.jpg\" class=\"img-fluid rounded shadow-sm w-100\" style=\"max-height: 250px; object-fit: cover;\" alt=\"Warehouse Hero\">",
            "warehouse-illustration-container": "<img src=\"/static/assets/images/stock_management.jpg\" class=\"img-fluid rounded shadow-sm w-100\" style=\"max-height: 250px; object-fit: cover;\" alt=\"Warehouse\">",
            "truck-illustration-container": "<img src=\"/static/assets/images/delivery_truck.jpg\" class=\"img-fluid rounded shadow-sm w-100\" style=\"max-height: 250px; object-fit: cover;\" alt=\"Delivery Truck\">",
            "supplier-illustration-container": "<img src=\"/static/assets/images/supplier_handshake.jpg\" class=\"img-fluid rounded shadow-sm w-100\" style=\"max-height: 250px; object-fit: cover;\" alt=\"Supplier Handshake\">",
            "ai-illustration-container": "<img src=\"/static/assets/images/ai_prediction.jpg\" class=\"img-fluid rounded shadow-sm w-100\" style=\"max-height: 250px; object-fit: cover;\" alt=\"AI Prediction\">",
            "reports-illustration-container": "<img src=\"/static/assets/images/business_reports.jpg\" class=\"img-fluid rounded shadow-sm w-100\" style=\"max-height: 250px; object-fit: cover;\" alt=\"Business Reports\">",
            "shelves-illustration-container": "<img src=\"/static/assets/images/stock_management.jpg\" class=\"img-fluid rounded shadow-sm w-100\" style=\"max-height: 250px; object-fit: cover;\" alt=\"Shelves\">"
        };

        for (const [id, htmlContent] of Object.entries(injectMap)) {
            const el = document.getElementById(id);
            if (el) el.innerHTML = htmlContent;
        }
        
    }, 100);
});

