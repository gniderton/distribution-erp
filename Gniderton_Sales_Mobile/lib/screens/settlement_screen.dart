import 'package:flutter/material.dart';

class SettlementScreen extends StatefulWidget {
  const SettlementScreen({super.key});

  @override
  State<SettlementScreen> createState() => _SettlementScreenState();
}

class _SettlementScreenState extends State<SettlementScreen> {
  final Map<int, int> _denominations = {
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
  };
  double _coins = 0.0;
  final double _expectedCash = 1500.0; // Mock expected cash collected for the day

  double get _actualCash {
    double total = 0.0;
    _denominations.forEach((denom, count) {
      total += denom * count;
    });
    total += _coins;
    return total;
  }

  double get _variance => _actualCash - _expectedCash;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text("EOD Settlement", style: TextStyle(color: Colors.white)),
        backgroundColor: const Color(0xFF1E293B),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            // Settlement Summary Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  _buildSummaryRow("Expected Cash Collections:", "₹${_expectedCash.toStringAsFixed(2)}"),
                  const Divider(color: Colors.grey),
                  _buildSummaryRow("Actual Counted Cash:", "₹${_actualCash.toStringAsFixed(2)}", isBold: true),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text("Variance:", style: TextStyle(color: Colors.grey)),
                      Text(
                        "₹${_variance.toStringAsFixed(2)}",
                        style: TextStyle(
                          color: _variance == 0.0 ? Colors.greenAccent : (_variance > 0 ? Colors.blueAccent : Colors.redAccent),
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            const Align(
              alignment: Alignment.centerLeft,
              child: Text(
                "Enter Physical Currency Count",
                style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(height: 12),

            // Denominations entry grid/list
            Expanded(
              child: ListView(
                children: [
                  ..._denominations.keys.map((denom) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8.0),
                      child: Row(
                        children: [
                          SizedBox(
                            width: 80,
                            child: Text(
                              "₹ $denom  x",
                              style: const TextStyle(color: Colors.white, fontSize: 16),
                            ),
                          ),
                          Expanded(
                            child: TextField(
                              keyboardType: TextInputType.number,
                              style: const TextStyle(color: Colors.white),
                              decoration: const InputDecoration(
                                filled: true,
                                fillColor: Color(0xFF1E293B),
                                border: OutlineInputBorder(borderSide: BorderSide.none),
                                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              ),
                              onChanged: (val) {
                                setState(() {
                                  _denominations[denom] = int.tryParse(val) ?? 0;
                                });
                              },
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8.0),
                    child: Row(
                      children: [
                        const SizedBox(
                          width: 80,
                          child: Text(
                            "Coins (Total)",
                            style: TextStyle(color: Colors.white, fontSize: 14),
                          ),
                        ),
                        Expanded(
                          child: TextField(
                            keyboardType: TextInputType.number,
                            style: const TextStyle(color: Colors.white),
                            decoration: const InputDecoration(
                              filled: true,
                              fillColor: Color(0xFF1E293B),
                              border: OutlineInputBorder(borderSide: BorderSide.none),
                              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            ),
                            onChanged: (val) {
                              setState(() {
                                _coins = double.tryParse(val) ?? 0.0;
                              });
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value, {bool isBold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: TextStyle(color: Colors.white, fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
        Text(value, style: TextStyle(color: Colors.white, fontWeight: isBold ? FontWeight.bold : FontWeight.normal)),
      ],
    );
  }
}
