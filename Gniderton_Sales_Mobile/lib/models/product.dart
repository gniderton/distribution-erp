class Product {
  final int id;
  final int? brandId;
  final int? categoryId;
  final String code;
  final String name;
  final double mrp;
  final double purchaseRate;
  final double distributorRate;
  final double wholesaleRate;
  final double dealerRate;
  final double retailRate;
  final int caseQuantity;
  final String uom;
  final bool isActive;

  Product({
    required this.id,
    this.brandId,
    this.categoryId,
    required this.code,
    required this.name,
    required this.mrp,
    required this.purchaseRate,
    required this.distributorRate,
    required this.wholesaleRate,
    required this.dealerRate,
    required this.retailRate,
    required this.caseQuantity,
    required this.uom,
    required this.isActive,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'],
      brandId: json['brand_id'],
      categoryId: json['category_id'],
      code: json['product_code'] ?? '',
      name: json['product_name'] ?? '',
      mrp: double.parse((json['mrp'] ?? 0).toString()),
      purchaseRate: double.parse((json['purchase_rate'] ?? 0).toString()),
      distributorRate: double.parse((json['distributor_rate'] ?? 0).toString()),
      wholesaleRate: double.parse((json['wholesale_rate'] ?? 0).toString()),
      dealerRate: double.parse((json['dealer_rate'] ?? 0).toString()),
      retailRate: double.parse((json['retail_rate'] ?? 0).toString()),
      caseQuantity: json['case_quantity'] ?? 1,
      uom: json['uom'] ?? 'Pcs',
      isActive: json['is_active'] ?? true,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'brand_id': brandId,
      'category_id': categoryId,
      'product_code': code,
      'product_name': name,
      'mrp': mrp,
      'purchase_rate': purchaseRate,
      'distributor_rate': distributorRate,
      'wholesale_rate': wholesaleRate,
      'dealer_rate': dealerRate,
      'retail_rate': retailRate,
      'case_quantity': caseQuantity,
      'uom': uom,
      'is_active': isActive ? 1 : 0,
    };
  }
}
