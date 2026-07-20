import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/customer.dart';
import '../models/product.dart';
import '../models/payment.dart';
import '../models/order.dart';

class DBService {
  static final DBService instance = DBService._init();
  static Database? _database;

  DBService._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('gniderton_sales.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDB,
    );
  }

  Future _createDB(Database db, int version) async {
    // 1. Customers Table
    await db.execute('''
      CREATE TABLE customers (
        id INTEGER PRIMARY KEY,
        customer_name TEXT,
        customer_code TEXT,
        customer_phone TEXT,
        gstin TEXT,
        route_name TEXT,
        employee_name TEXT,
        channel_name TEXT,
        default_price_col TEXT
      )
    ''');

    // 2. Pricing Exceptions Table
    await db.execute('''
      CREATE TABLE pricing_exceptions (
        customer_id INTEGER,
        brand_id INTEGER,
        price_column TEXT,
        PRIMARY KEY (customer_id, brand_id)
      )
    ''');

    // 3. Products Table
    await db.execute('''
      CREATE TABLE products (
        id INTEGER PRIMARY KEY,
        brand_id INTEGER,
        category_id INTEGER,
        product_code TEXT,
        product_name TEXT,
        mrp REAL,
        purchase_rate REAL,
        distributor_rate REAL,
        wholesale_rate REAL,
        dealer_rate REAL,
        retail_rate REAL,
        case_quantity INTEGER,
        uom TEXT,
        is_active INTEGER
      )
    ''');

    // 4. Pending Offline Payments Table
    await db.execute('''
      CREATE TABLE payments (
        local_id TEXT PRIMARY KEY,
        customer_id INTEGER,
        employee_id INTEGER,
        mode TEXT,
        amount REAL,
        transaction_ref TEXT,
        ai_confidence REAL,
        created_at TEXT,
        is_synced INTEGER
      )
    ''');

    // 5. Pending Offline Orders Table
    await db.execute('''
      CREATE TABLE orders (
        local_id TEXT PRIMARY KEY,
        id INTEGER,
        customer_id INTEGER,
        employee_id INTEGER,
        total_amount REAL,
        synced_at TEXT
      )
    ''');

    // 6. Pending Offline Order Items Table
    await db.execute('''
      CREATE TABLE order_items (
        order_local_id TEXT,
        product_id INTEGER,
        quantity INTEGER,
        rate REAL,
        amount REAL,
        free_reason TEXT,
        PRIMARY KEY (order_local_id, product_id)
      )
    ''');
  }

  // --- Products cache methods ---
  Future<void> cacheProducts(List<Product> products) async {
    final db = await database;
    final batch = db.batch();
    batch.delete('products');
    for (var p in products) {
      batch.insert('products', p.toMap());
    }
    await batch.commit();
  }

  Future<List<Product>> getCachedProducts() async {
    final db = await database;
    final maps = await db.query('products', where: 'is_active = ?', whereArgs: [1]);
    return maps.map((e) => Product.fromJson(e)).toList();
  }

  // --- Customers cache methods ---
  Future<void> cacheCustomers(List<Customer> customers) async {
    final db = await database;
    final batch = db.batch();
    batch.delete('customers');
    batch.delete('pricing_exceptions');
    
    for (var c in customers) {
      batch.insert('customers', c.toMap());
      for (var ex in c.pricingExceptions) {
        batch.insert('pricing_exceptions', ex.toMap(c.id));
      }
    }
    await batch.commit();
  }

  Future<List<Customer>> getCachedCustomers() async {
    final db = await database;
    final custMaps = await db.query('customers');
    List<Customer> list = [];
    
    for (var map in custMaps) {
      final id = map['id'] as int;
      final exMaps = await db.query('pricing_exceptions', where: 'customer_id = ?', whereArgs: [id]);
      final exceptions = exMaps.map((e) => PricingException.fromJson(e)).toList();
      
      var fullJson = Map<String, dynamic>.from(map);
      fullJson['pricing_ex'] = exceptions.map((e) => {
        'brand_id': e.brandId,
        'price_column': e.priceColumn,
      }).toList();
      
      list.add(Customer.fromJson(fullJson));
    }
    return list;
  }

  // --- Offline Payments methods ---
  Future<void> savePaymentOffline(Payment payment) async {
    final db = await database;
    await db.insert('payments', payment.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<List<Payment>> getPendingPayments() async {
    final db = await database;
    final maps = await db.query('payments', where: 'is_synced = ?', whereArgs: [0]);
    return maps.map((e) => Payment.fromMap(e)).toList();
  }

  Future<void> markPaymentSynced(String localId) async {
    final db = await database;
    await db.update('payments', {'is_synced': 1}, where: 'local_id = ?', whereArgs: [localId]);
  }
}
