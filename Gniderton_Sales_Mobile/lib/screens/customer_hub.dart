import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/sales_provider.dart';
import 'cart_screen.dart';

class CustomerHubScreen extends StatefulWidget {
  const CustomerHubScreen({super.key});

  @override
  State<CustomerHubScreen> createState() => _CustomerHubScreenState();
}

class _CustomerHubScreenState extends State<CustomerHubScreen> {
  String _searchQuery = "";
  String _selectedRoute = "All Routes";

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text("Customer Hub", style: TextStyle(color: Colors.white)),
        backgroundColor: const Color(0xFF1E293B),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Consumer<SalesProvider>(
        builder: (context, provider, child) {
          // Get unique routes
          final routes = ["All Routes"] + 
              provider.customers.map((c) => c.routeName ?? 'No Route').toSet().toList();

          // Filter customers based on search query & selected route
          final filteredCustomers = provider.customers.where((c) {
            final matchesSearch = c.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
                c.code.toLowerCase().contains(_searchQuery.toLowerCase());
            final matchesRoute = _selectedRoute == "All Routes" || c.routeName == _selectedRoute;
            return matchesSearch && matchesRoute;
          }).toList();

          return Column(
            children: [
              // Search and Filter Header Section
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    TextField(
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        hintText: "Search customer name or code...",
                        hintStyle: const TextStyle(color: Colors.grey),
                        prefixIcon: const Icon(Icons.search, color: Colors.grey),
                        filled: true,
                        fillColor: const Color(0xFF1E293B),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                      ),
                      onChanged: (val) {
                        setState(() {
                          _searchQuery = val;
                        });
                      },
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      value: _selectedRoute,
                      dropdownColor: const Color(0xFF1E293B),
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: const Color(0xFF1E293B),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                      ),
                      style: const TextStyle(color: Colors.white),
                      items: routes.map((r) {
                        return DropdownMenuItem<String>(
                          value: r,
                          child: Text(r),
                        );
                      }).toList(),
                      onChanged: (val) {
                        setState(() {
                          _selectedRoute = val ?? "All Routes";
                        });
                      },
                    ),
                  ],
                ),
              ),

              // Customer List
              Expanded(
                child: ListView.builder(
                  itemCount: filteredCustomers.length,
                  itemBuilder: (context, index) {
                    final customer = filteredCustomers[index];
                    return Card(
                      color: const Color(0xFF1E293B),
                      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      child: ListTile(
                        title: Text(
                          customer.name,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                        ),
                        subtitle: Text(
                          "${customer.code} • Route: ${customer.routeName ?? 'N/A'}",
                          style: const TextStyle(color: Colors.grey),
                        ),
                        trailing: const Icon(Icons.arrow_forward_ios_rounded, color: Colors.blueAccent, size: 16),
                        onTap: () {
                          provider.selectCustomer(customer);
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (context) => const CartScreen()),
                          );
                        },
                      ),
                    );
                  },
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
