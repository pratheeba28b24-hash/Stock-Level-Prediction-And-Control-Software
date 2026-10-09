import os
import csv
from app import create_app
from models import db, Product, SalesOrder, SalesItem

def main():
    print("Exporting datasets from database...")
    app = create_app()
    with app.app_context():
        os.makedirs('datasets', exist_ok=True)
        
        # 1. Export Products
        products = Product.query.all()
        prod_path = 'datasets/products.csv'
        with open(prod_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['product_id', 'name', 'brand', 'purchase_price', 'selling_price', 'tax_rate'])
            for p in products:
                writer.writerow([p.id, p.name, p.brand, p.purchase_price, p.selling_price, p.tax_rate])
        print(f"Exported {len(products)} products to {prod_path}")
                
        # 2. Export Sales History
        sales_items = db.session.query(
            SalesOrder.order_date,
            SalesItem.product_id,
            Product.name,
            SalesItem.quantity,
            SalesItem.unit_price,
            SalesOrder.invoice_number
        ).join(SalesItem, SalesItem.sales_order_id == SalesOrder.id).join(Product, Product.id == SalesItem.product_id).all()
        
        sales_path = 'datasets/sales_history.csv'
        with open(sales_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['sales_date', 'product_id', 'product_name', 'quantity_sold', 'unit_price', 'invoice_number'])
            for item in sales_items:
                # format datetime
                d_str = item[0].strftime('%Y-%m-%d %H:%M:%S') if hasattr(item[0], 'strftime') else str(item[0])
                writer.writerow([d_str, item[1], item[2], item[3], item[4], item[5]])
        print(f"Exported {len(sales_items)} sales records to {sales_path}")

if __name__ == "__main__":
    main()
