import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/sales_provider.dart';

class PaymentScreen extends StatefulWidget {
  const PaymentScreen({super.key});

  @override
  State<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  String _selectedMode = "Cash";
  final TextEditingController _refController = TextEditingController();
  final TextEditingController _confidenceController = TextEditingController();

  void _submit(SalesProvider provider) async {
    final subtotal = provider.cartSubtotal;
    final confidence = double.tryParse(_confidenceController.text);

    await provider.submitPayment(
      amount: subtotal,
      mode: _selectedMode,
      ref: _refController.text.isNotEmpty ? _refController.text : null,
      confidence: confidence,
    );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Collected Offline Payment of ₹${subtotal.toStringAsFixed(2)}!"),
          backgroundColor: Colors.greenAccent,
        ),
      );
      Navigator.popUntil(context, (route) => route.isFirst);
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<SalesProvider>(context, listen: false);
    final subtotal = provider.cartSubtotal;

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text("Collect Payment", style: TextStyle(color: Colors.white)),
        backgroundColor: const Color(0xFF1E293B),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Amount Summary Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  const Text("Payment Amount Due", style: TextStyle(color: Colors.grey, fontSize: 14)),
                  const SizedBox(height: 8),
                  Text(
                    "₹${subtotal.toStringAsFixed(2)}",
                    style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            const Text("Select Mode of Payment", style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            
            // Payment Mode selector dropdown
            DropdownButtonFormField<String>(
              value: _selectedMode,
              dropdownColor: const Color(0xFF1E293B),
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                filled: true,
                fillColor: const Color(0xFF1E293B),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
              items: ["Cash", "Cheque", "UPI", "NEFT", "Bank Transfer"].map((mode) {
                return DropdownMenuItem(value: mode, child: Text(mode));
              }).toList(),
              onChanged: (val) {
                setState(() {
                  _selectedMode = val ?? "Cash";
                });
              },
            ),

            if (_selectedMode != "Cash") ...[
              const SizedBox(height: 16),
              TextField(
                controller: _refController,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: _selectedMode == "Cheque" ? "Cheque / Instrument Number" : "Transaction Ref ID",
                  labelStyle: const TextStyle(color: Colors.grey),
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
              ),
            ],

            if (_selectedMode == "Cheque") ...[
              const SizedBox(height: 16),
              TextField(
                controller: _confidenceController,
                style: const TextStyle(color: Colors.white),
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: "OCR AI Confidence Score (Optional)",
                  labelStyle: const TextStyle(color: Colors.grey),
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                ),
              ),
            ],

            const Spacer(),
            ElevatedButton(
              onPressed: () => _submit(provider),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blueAccent,
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 50),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text("Save and Submit Transaction", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
