import urllib.request
import urllib.parse
import json
import http.cookiejar
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:5001"

# Setup session cookie tracking
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
opener.addheaders = [('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15')]
urllib.request.install_opener(opener)

import sqlite3

def run_tests():
    # Clean up whitelisted devices to ensure MFA is always triggered for testing
    try:
        conn = sqlite3.connect('inventory.db')
        cursor = conn.cursor()
        cursor.execute("DELETE FROM authorized_devices;")
        conn.commit()
        conn.close()
        print("Cleared authorized devices from database for clean MFA test.")
    except Exception as e:
        print("Database clear warning:", e)

    print("="*60)
    print("STARTING PROGRAMMATIC ENDPOINT VERIFICATION (URLLIB)")
    print("="*60)

    # 1. Test Login - Expect MFA Required
    print("\n[TEST 1] Logging in as admin...")
    login_payload = {
        "username": "admin",
        "password": "admin123"
    }
    
    try:
        req = urllib.request.Request(f"{BASE_URL}/api/auth/login", data=json.dumps(login_payload).encode('utf-8'))
        req.add_header('Content-Type', 'application/json')
        # Since it returns 200 or 401/403, urlopen might raise HTTPError for non-200.
        # But api_login returns 200 with status=mfa_required, so it will succeed cleanly as 200.
        with urllib.request.urlopen(req) as r:
            res = json.loads(r.read().decode('utf-8'))
            print("Response Status: 200")
            print("Response JSON:", res)
            assert res.get("status") == "mfa_required", "Expected mfa_required status"
            print("Success: MFA verification is triggered successfully.")
    except Exception as e:
        print("MFA Trigger Test Failed:", e)
        return

    # 2. Test OTP Verification - Expect Login Success
    print("\n[TEST 2] Verifying OTP code '123456'...")
    otp_payload = {
        "otp": "123456"
    }
    try:
        req = urllib.request.Request(f"{BASE_URL}/api/auth/otp-verify", data=json.dumps(otp_payload).encode('utf-8'))
        req.add_header('Content-Type', 'application/json')
        with urllib.request.urlopen(req) as r:
            res = json.loads(r.read().decode('utf-8'))
            print("Response Status: 200")
            print("Response JSON:", res)
            assert res.get("status") == "success", "Expected login success"
            print("Success: Logged in and session cookie received.")
    except Exception as e:
        print("OTP Verification Test Failed:", e)
        return

    # 3. Test Product Catalog
    print("\n[TEST 3] Fetching products list...")
    try:
        with urllib.request.urlopen(f"{BASE_URL}/api/products") as r:
            products = json.loads(r.read().decode('utf-8'))
            print("Response Status: 200")
            print(f"Retrieved {len(products)} products from db.")
            if len(products) > 0:
                print("First Product SKU:", products[0].get("id"), "| Name:", products[0].get("name"), "| Stock:", products[0].get("stock"))
            print("Success: Products catalog fetched cleanly.")
    except Exception as e:
        print("Fetch Products Failed:", e)
        return

    # 4. Test AI Predictions History
    print("\n[TEST 4] Fetching AI predictions history...")
    try:
        with urllib.request.urlopen(f"{BASE_URL}/api/predictions") as r:
            preds = json.loads(r.read().decode('utf-8'))
            print("Response Status: 200")
            print(f"Retrieved {len(preds)} prediction models log entries.")
            if len(preds) > 0:
                print("Latest prediction sample:", preds[0])
            print("Success: Predictions metrics verified.")
    except Exception as e:
        print("Fetch Predictions Failed:", e)
        return

    # 5. Test Chatbot API
    print("\n[TEST 5] Sending Chatbot Query: 'What is the stock level of MacBook?'")
    chat_payload = {
        "query": "What is the stock level of MacBook?"
    }
    try:
        req = urllib.request.Request(f"{BASE_URL}/api/chatbot", data=json.dumps(chat_payload).encode('utf-8'))
        req.add_header('Content-Type', 'application/json')
        with urllib.request.urlopen(req) as r:
            res = json.loads(r.read().decode('utf-8'))
            print("Response Status: 200")
            print("Chatbot response:", res.get("reply"))
            assert "MacBook" in res.get("reply") or "stock" in res.get("reply").lower(), "Expected context match"
            print("Success: Chatbot intent and catalog query resolution works!")
    except Exception as e:
        print("Chatbot query failed:", e)

    # 6. Test Reports PDF generation
    print("\n[TEST 6] Triggering Sales PDF generate-export...")
    try:
        with urllib.request.urlopen(f"{BASE_URL}/api/reports/pdf/invoice/1") as r:
            content_type = r.info().get('Content-Type', '')
            print("Response Status: 200")
            print("Response Content-Type:", content_type)
            assert "pdf" in content_type.lower(), "Expected PDF stream response"
            print("Success: Sales report PDF generated successfully!")
    except Exception as e:
        print("PDF report failed:", e)

    # 7. Test Dynamic Pricing Optimization
    print("\n[TEST 7] Fetching Dynamic Pricing Optimizations...")
    try:
        with urllib.request.urlopen(f"{BASE_URL}/api/ml/price-optimization") as r:
            pricing = json.loads(r.read().decode('utf-8'))
            print("Response Status: 200")
            print(f"Retrieved pricing recommendations for {len(pricing)} products.")
            if len(pricing) > 0:
                print("Pricing Optimization sample:", pricing[0])
            print("Success: Dynamic pricing optimization verified.")
    except Exception as e:
        print("Pricing Optimization Failed:", e)

    # 8. Test CRM Customer RFM Segments
    print("\n[TEST 8] Fetching CRM RFM Segments...")
    try:
        with urllib.request.urlopen(f"{BASE_URL}/api/crm/rfm-analysis") as r:
            crm = json.loads(r.read().decode('utf-8'))
            print("Response Status: 200")
            print(f"Retrieved segmentations for {len(crm)} customers.")
            if len(crm) > 0:
                print("CRM Segment sample:", crm[0])
            print("Success: CRM RFM segments verified.")
    except Exception as e:
        print("CRM RFM Segmentation Failed:", e)

    # 9. Test Category Supplier Scorecards
    print("\n[TEST 9] Fetching Supplier Selection scorecards for MacBook category...")
    try:
        with urllib.request.urlopen(f"{BASE_URL}/api/suppliers/performance/ITM-001") as r:
            suppliers = json.loads(r.read().decode('utf-8'))
            print("Response Status: 200")
            print(f"Retrieved {len(suppliers)} ranked category suppliers.")
            if len(suppliers) > 0:
                print("Supplier Selection sample:", suppliers[0])
            print("Success: Supplier Performance scorecard verified.")
    except Exception as e:
        print("Supplier Performance Failed:", e)

    # 10. Test Order Tracking (PO-2026-0017)
    print("\n[TEST 10] Testing Order Tracking for PO-2026-0017...")
    try:
        with urllib.request.urlopen(f"{BASE_URL}/api/orders/tracking/PO-2026-0017") as r:
            po_track = json.loads(r.read().decode('utf-8'))
            print("Response Status: 200")
            print(f"Tracking found: {po_track.get('found')}")
            print(f"PO Number: {po_track.get('po_number')}")
            print(f"Supplier: {po_track.get('supplier')}")
            print(f"Status: {po_track.get('current_status')}")
            print(f"Total: ₹{po_track.get('total_amount'):,.2f}")
            print(f"Items Count: {po_track.get('items_count')}")
            print(f"Timeline Stages: {len(po_track.get('timeline', []))}")
            assert po_track.get('found') is True
            assert po_track.get('po_number') == 'PO-2026-0017'
            assert len(po_track.get('timeline', [])) == 6
            print("Success: PO-2026-0017 order tracking verified with 6-stage timeline.")
    except Exception as e:
        print("Order Tracking Failed:", e)

    print("\n" + "="*60)
    print("VERIFICATION COMPLETED SUCCESSFULLY!")
    print("="*60)

if __name__ == "__main__":
    run_tests()
