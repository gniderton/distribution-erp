class Order {
  final String? localId; // Client UUID for offline syncing
  final int? id; // Server database ID (assigned post-sync)
  final int customerId;
  final int employeeId;
  final double totalAmount;
  final List<OrderItem> items;
  final DateTime syncedAt;

  Order({
    this.localId,
    this.id,
    required this.customerId,
    required this.employeeId,
    required this.totalAmount,
    required this.items,
    required this.syncedAt,
  });

  Map<String, dynamic> toJson() {
    return {
      'customer_id': customerId,
      'employee_id': employeeId,
      'total_amount': totalAmount,
      'items': items.map((e) => e.toJson()).toList(),
    };
  }

  Map<String, dynamic> toLocalMap() {
    return {
      'local_id': localId,
      'id': id,
      'customer_id': customerId,
      'employee_id': employeeId,
      'total_amount': totalAmount,
      'synced_at': syncedAt.toIso8601String(),
    };
  }
}

class OrderItem {
  final int productId;
  final int quantity;
  final double rate;
  final double amount;
  final String? freeReason; // If product was awarded as a free scheme reward

  OrderItem({
    required this.productId,
    required this.quantity,
    required this.rate,
    required this.amount,
    this.freeReason,
  });

  Map<String, dynamic> toJson() {
    return {
      'product_id': productId,
      'quantity': quantity,
      'rate': rate,
      'amount': amount,
      if (freeReason != null) 'free_reason': freeReason,
    };
  }

  Map<String, dynamic> toLocalMap(String orderLocalId) {
    return {
      'order_local_id': orderLocalId,
      'product_id': productId,
      'quantity': quantity,
      'rate': rate,
      'amount': amount,
      'free_reason': freeReason,
    };
  }
}
