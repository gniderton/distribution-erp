import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/customer.dart';
import '../models/product.dart';
import '../models/payment.dart';
import '../models/order.dart';

class APIService {
  final String baseUrl; // Render Backend URL

  APIService({required this.baseUrl});

  // Fetch all active products
  Future<List<Product>> fetchProducts() async {
    final response = await http.get(Uri.parse('$baseUrl/api/products'));
    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => Product.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load products: ${response.body}');
    }
  }

  // Fetch all customers (with nested exceptions/details)
  Future<List<Customer>> fetchCustomers() async {
    final response = await http.get(Uri.parse('$baseUrl/api/customers'));
    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(response.body);
      return data.map((json) => Customer.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load customers: ${response.body}');
    }
  }

  // Sync a single payment transaction
  Future<bool> syncPayment(Payment payment) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/meet/payments'), // Re-mapped endpoint
      headers: {'Content-Type': 'application/json'},
      body: json.encode(payment.toJson()),
    );
    return response.statusCode == 200 || response.statusCode == 201;
  }

  // Sync a full order transaction
  Future<bool> syncOrder(Order order) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/meet/orders'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode(order.toJson()),
    );
    return response.statusCode == 200 || response.statusCode == 201;
  }
}
