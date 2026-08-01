const { pool } = require('../config/db');

/**
 * Service to handle E-Way Bill generation via KDK Express GST API
 */
class KDKEwayBillService {
    constructor() {
        this.apiKey = process.env.KDK_API_KEY;
        this.apiSecret = process.env.KDK_API_SECRET;
        this.baseUrl = process.env.KDK_BASE_URL || 'https://api.expressgst.com/v1'; // Example URL
    }

    /**
     * Maps ERP Sales Invoice data to KDK E-Way Bill JSON Format
     */
    async mapInvoiceToKDK(invoiceId, tripVehicleNumber) {
        const res = await pool.query(`
            SELECT 
                si.*,
                c.customer_name, c.gstin as customer_gst, c.email as customer_email,
                ca.address_line1, ca.city, ca.pincode, ca.state,
                (SELECT json_agg(json_build_object(
                    'product_name', p.product_name,
                    'hsn_code', h.hsn_code,
                    'qty', sil.shipped_qty,
                    'rate', sil.rate,
                    'taxable_amount', sil.taxable_amount,
                    'cgst_rate', sil.tax_percent / 2,
                    'sgst_rate', sil.tax_percent / 2,
                    'igst_rate', 0,
                    'amount', sil.amount
                )) FROM sales_invoice_lines sil 
                   JOIN products p ON sil.product_id = p.id 
                   JOIN hsn_codes h ON p.hsn_id = h.id
                   WHERE sil.invoice_id = si.id) as items
            FROM sales_invoices si
            JOIN customers c ON si.customer_id = c.id
            LEFT JOIN customer_addresses ca ON c.id = ca.customer_id AND ca.is_default_billing = true
            WHERE si.id = $1
        `, [invoiceId]);

        if (res.rows.length === 0) throw new Error("Invoice not found");
        const inv = res.rows[0];

        // Ensure HSN and PIN are present
        if (!inv.pincode) throw new Error(`Missing PIN code for customer on invoice ${inv.invoice_number}`);
        
        // Format docDate as DD/MM/YYYY
        const d = new Date(inv.invoice_date);
        const docDateStr = ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear();

        const payload = {
            userGstin: process.env.COMPANY_GSTIN,
            supplyType: 'O',
            subSupplyType: 1,
            docType: 'INV',
            docNo: inv.invoice_number,
            docDate: docDateStr,
            fromGstin: process.env.COMPANY_GSTIN,
            fromTrdName: process.env.COMPANY_NAME,
            fromAddr1: process.env.COMPANY_ADDRESS,
            fromAddr2: "",
            fromPlace: process.env.COMPANY_CITY,
            fromPincode: parseInt(process.env.COMPANY_PIN),
            actFromStateCode: parseInt(process.env.COMPANY_STATE_CODE),
            fromStateCode: parseInt(process.env.COMPANY_STATE_CODE),
            toGstin: inv.customer_gst || 'URP',
            toTrdName: inv.customer_name,
            toAddr1: inv.address_line1 || "",
            toAddr2: "",
            toPlace: inv.city || "",
            toPincode: parseInt(inv.pincode),
            actToStateCode: parseInt(inv.state_code || 32), // Kerala = 32
            toStateCode: parseInt(inv.state_code || 32),
            transactionType: 1,
            otherValue: 0,
            totalValue: parseFloat(inv.total_taxable),
            cgstValue: parseFloat(inv.total_cgst),
            sgstValue: parseFloat(inv.total_sgst),
            igstValue: parseFloat(inv.total_igst),
            cessValue: 0,
            totInvValue: parseFloat(inv.grand_total),
            transId: "",
            transName: "",
            transDocNo: "",
            transMode: 1, // Road
            transDistance: "0",
            transDocDate: "",
            vehicleNo: tripVehicleNumber,
            vehicleType: 'R', // Regular
            itemList: inv.items.map(item => ({
                productName: item.product_name,
                productDesc: "",
                hsnCode: parseInt(item.hsn_code),
                quantity: parseFloat(item.qty),
                qtyUnit: 'NOS', // Often NIC prefers NOS or PCS
                taxableAmount: parseFloat(item.taxable_amount),
                cgstRate: parseFloat(item.cgst_rate),
                sgstRate: parseFloat(item.sgst_rate),
                igstRate: parseFloat(item.igst_rate),
                cessRate: 0
            }))
        };

        return payload;
    }

    /**
     * Calls KDK API to generate E-Way Bill
     */
    async generateEWB(payload) {
        // MOCKING THE API CALL FOR NOW
        console.log("SENDING TO KDK:", JSON.stringify(payload, null, 2));
        
        // This is where fetch() call would go
        // const response = await fetch(`${this.baseUrl}/ewaybill`, { method: 'POST', body: JSON.stringify(payload) ... });
        
        // Simulating a successful response
        return {
            success: true,
            ewayBillNo: "123456789012",
            ewayBillDate: new Date().toISOString(),
            validUpto: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days validity
        };
    }
}

module.exports = new KDKEwayBillService();
