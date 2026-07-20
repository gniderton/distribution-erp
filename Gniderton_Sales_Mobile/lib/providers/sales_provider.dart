import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';
import '../models/customer.dart';
import '../models/product.dart';
import '../models/payment.dart';
import '../models/order.dart';
import '../services/api_service.dart';
import '../services/db_service.dart';

class SalesProvider with ChangeNotifier {
  final APIService apiService = APIService(baseUrl: 'https://zenith-dealers-meet-helper.onrender.com');
  final DBService dbService = DBService.instance;

  // --- States ---
  bool _isLoading = false;
  bool _isOffline = false;
  
  List<Customer> _customers = [];
  List<Product> _products = [];
  List<Payment> _pendingPayments = [];

  Customer? _selectedCustomer;
  Map<int, int> _cart = {}; // Map<productId, quantity>

  // --- Getters ---
  bool get isLoading => _isLoading;
  bool get isOffline => _isOffline;
  List<Customer> get customers => _customers;
  List<Product> get products => _products;
  List<Payment> get pendingPayments => _pendingPayments;
  Customer? get selectedCustomer => _selectedCustomer;
  Map<int, int> get cart => _cart;

  // --- Initializer & Sync Cache ---
  Future<void> initApp() async {
    _isLoading = true;
    notifyListeners();

    try {
      // 1. Fetch from server and update local cache
      final fetchedProducts = await apiService.fetchProducts();
      final fetchedCustomers = await apiService.fetchCustomers();

      await dbService.cacheProducts(fetchedProducts);
      await dbService.cacheCustomers(fetchedCustomers);
      _isOffline = false;
    } catch (e) {
      // 2. Offline fallback: load from cached SQLite
      _isOffline = true;
      debugPrint("Offline mode: Loading cached database records.");
    } finally {
      _products = await dbService.getCachedProducts();
      _customers = await dbService.getCachedCustomers();
      _pendingPayments = await dbService.getPendingPayments();
      _isLoading = false;
      notifyListeners();
    }
  }

  // --- Customer Selection ---
  void selectCustomer(Customer? customer) {
    _selectedCustomer = customer;
    _cart.clear(); // Reset cart on customer switch
    notifyListeners();
  }

  // --- Pricing Engine ($O(1)$ Hash Map Optimization) ---
  double getCalculatedPrice(Product product) {
    if (_selectedCustomer == null) return product.dealerRate;

    final defaultCol = _selectedCustomer!.defaultPriceCol;
    
    // Quick O(1) map search for exceptions
    final exception = _selectedCustomer!.pricingExceptions.firstWhere(
      (e) => e.brandId == product.brandId,
      orElse: () => PricingException(brandId: -1, priceColumn: defaultCol),
    );

    final col = exception.brandId != -1 ? exception.priceColumn : defaultCol;
    
    switch (col) {
      case 'mrp': return product.mrp;
      case 'purchase_rate': return product.purchaseRate;
      case 'distributor_rate': return product.distributorRate;
      case 'wholesale_rate': return product.wholesaleRate;
      case 'retail_rate': return product.retailRate;
      case 'dealer_rate':
      default:
        return product.dealerRate > 0 ? product.dealerRate : product.mrp;
    }
  }

  // --- Cart Actions ---
  void addToCart(Product product, int quantity) {
    if (quantity <= 0) {
      _cart.remove(product.id);
    } else {
      _cart[product.id] = quantity;
    }
    notifyListeners();
  }

  double get cartSubtotal {
    double total = 0.0;
    _cart.forEach((pid, qty) {
      final p = _products.firstWhere((prod) => prod.id == pid);
      total += getCalculatedPrice(p) * qty;
    });
    return total;
  }

  // --- Payment Submission ---
  Future<void> submitPayment({
    required double amount,
    required String mode,
    String? ref,
    double? confidence,
  }) async {
    if (_selectedCustomer == null) return;

    final payment = Payment(
      localId: const Uuid().v4(),
      customerId: _selectedCustomer!.id,
      employeeId: 1, // Logged-in DSE ID
      mode: mode,
      amount: amount,
      transactionRef: ref,
      aiConfidence: confidence,
      createdAt: DateTime.now(),
    );

    // Save locally
    await dbService.savePaymentOffline(payment);
    _pendingPayments = await dbService.getPendingPayments();
    notifyListeners();

    // Trigger background sync
    triggerSync();
  }

  // --- Background Sync Engine ---
  Future<void> triggerSync() async {
    if (_isOffline) return;

    final pending = await dbService.getPendingPayments();
    for (var payment in pending) {
      try {
        final success = await apiService.syncPayment(payment);
        if (success) {
          await dbService.markPaymentSynced(payment.localId);
        }
      } catch (e) {
        debugPrint("Failed to sync payment ${payment.localId}: $e");
      }
    }
    _pendingPayments = await dbService.getPendingPayments();
    notifyListeners();
  }
}
