class Customer {
  final int id;
  final String name;
  final String code;
  final String? phone;
  final String? gstin;
  final String? routeName;
  final String? employeeName;
  final String? channelName;
  final String defaultPriceCol; // e.g., 'dealer_rate', 'retail_rate'
  final List<PricingException> pricingExceptions;

  Customer({
    required this.id,
    required this.name,
    required this.code,
    this.phone,
    this.gstin,
    this.routeName,
    this.employeeName,
    this.channelName,
    required this.defaultPriceCol,
    required this.pricingExceptions,
  });

  factory Customer.fromJson(Map<String, dynamic> json) {
    var exList = json['pricing_ex'] as List? ?? [];
    List<PricingException> exceptions = exList.map((e) => PricingException.fromJson(e)).toList();

    return Customer(
      id: json['id'],
      name: json['customer_name'] ?? '',
      code: json['customer_code'] ?? '',
      phone: json['customer_phone'],
      gstin: json['gstin'],
      routeName: json['route_name'],
      employeeName: json['employee_name'],
      channelName: json['channel_name'],
      defaultPriceCol: json['default_price_col'] ?? 'dealer_rate',
      pricingExceptions: exceptions,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'customer_name': name,
      'customer_code': code,
      'customer_phone': phone,
      'gstin': gstin,
      'route_name': routeName,
      'employee_name': employeeName,
      'channel_name': channelName,
      'default_price_col': defaultPriceCol,
    };
  }
}

class PricingException {
  final int brandId;
  final String priceColumn;

  PricingException({
    required this.brandId,
    required this.priceColumn,
  });

  factory PricingException.fromJson(Map<String, dynamic> json) {
    return PricingException(
      brandId: json['brand_id'],
      priceColumn: json['price_column'] ?? 'dealer_rate',
    );
  }

  Map<String, dynamic> toMap(int customerId) {
    return {
      'customer_id': customerId,
      'brand_id': brandId,
      'price_column': priceColumn,
    };
  }
}
