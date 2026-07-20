class Payment {
  final String localId; // UUID
  final int customerId;
  final int employeeId;
  final String mode; // 'Cash', 'Cheque', 'UPI', 'NEFT', 'Bank Transfer'
  final double amount;
  final String? transactionRef;
  final double? aiConfidence; // Gemini matching confidence
  final DateTime createdAt;
  final bool isSynced;

  Payment({
    required this.localId,
    required this.customerId,
    required this.employeeId,
    required this.mode,
    required this.amount,
    this.transactionRef,
    this.aiConfidence,
    required this.createdAt,
    this.isSynced = false,
  });

  Map<String, dynamic> toJson() {
    return {
      'customer_id': customerId,
      'employee_id': employeeId,
      'mode': mode,
      'amount': amount,
      'transaction_ref': transactionRef,
      'ai_confidence': aiConfidence,
      'created_at': createdAt.toIso8601String(),
    };
  }

  Map<String, dynamic> toMap() {
    return {
      'local_id': localId,
      'customer_id': customerId,
      'employee_id': employeeId,
      'mode': mode,
      'amount': amount,
      'transaction_ref': transactionRef,
      'ai_confidence': aiConfidence,
      'created_at': createdAt.toIso8601String(),
      'is_synced': isSynced ? 1 : 0,
    };
  }

  factory Payment.fromMap(Map<String, dynamic> map) {
    return Payment(
      localId: map['local_id'],
      customerId: map['customer_id'],
      employeeId: map['employee_id'],
      mode: map['mode'],
      amount: map['amount'],
      transactionRef: map['transaction_ref'],
      aiConfidence: map['ai_confidence'],
      createdAt: DateTime.parse(map['created_at']),
      isSynced: map['is_synced'] == 1,
    );
  }
}
