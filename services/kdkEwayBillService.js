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
            userGstin: process.env.COMPANY_GSTIN || '32AALCG2360H1ZT',
            supplyType: 'O',
            subSupplyType: 1,
            subSupplyDesc: "",
            docType: 'INV',
            docNo: inv.invoice_number,
            docDate: docDateStr,
            transType: 1,
            fromGstin: process.env.COMPANY_GSTIN || '32AALCG2360H1ZT',
            fromTrdName: process.env.COMPANY_NAME || 'GNIDERTON PRIVATE LIMITED',
            fromAddr1: process.env.COMPANY_ADDRESS || 'Kozhikode',
            fromAddr2: "",
            fromPlace: process.env.COMPANY_CITY || 'Kozhikode',
            fromPincode: parseInt(process.env.COMPANY_PIN) || 673001,
            fromStateCode: parseInt(process.env.COMPANY_STATE_CODE) || 32,
            actualFromStateCode: parseInt(process.env.COMPANY_STATE_CODE) || 32,
            toGstin: inv.customer_gst || 'URP',
            toTrdName: inv.customer_name,
            toAddr1: inv.address_line1 || "",
            toAddr2: "",
            toPlace: inv.city || "",
            toPincode: parseInt(inv.pincode),
            toStateCode: parseInt(inv.state_code || 32),
            actualToStateCode: parseInt(inv.state_code || 32),
            totalValue: parseFloat(inv.total_taxable) || 0,
            cgstValue: parseFloat(inv.total_cgst) || 0,
            sgstValue: parseFloat(inv.total_sgst) || 0,
            igstValue: parseFloat(inv.total_igst) || 0,
            cessValue: 0,
            TotNonAdvolVal: 0,
            OthValue: 0,
            totInvValue: parseFloat(inv.grand_total) || 0,
            transMode: 1,
            transDistance: 0,
            transporterName: "",
            transporterId: "",
            transDocNo: "",
            transDocDate: "",
            vehicleNo: tripVehicleNumber,
            vehicleType: 'R',
            mainHsnCode: inv.items[0]?.hsn_code || "",
            itemList: inv.items.map((item, idx) => ({
                itemNo: idx + 1,
                productName: item.product_name,
                productDesc: "",
                hsnCode: item.hsn_code || "",
                quantity: parseFloat(item.qty) || 0,
                qtyUnit: 'NOS',
                taxableAmount: parseFloat(item.taxable_amount) || 0,
                sgstRate: parseFloat(item.sgst_rate) || 0,
                cgstRate: parseFloat(item.cgst_rate) || 0,
                igstRate: parseFloat(item.igst_rate) || 0,
                cessRate: 0,
                cessNonAdvol: 0
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
