const validateInt = (val, fieldName, recordName) => {
    if (val === null || val === undefined || val === '') return null;
    const num = parseInt(val);
    if (isNaN(num)) {
        throw new Error(`Data Error at '${recordName}': Invalid ${fieldName} value ('${val}'). Please check your source data.`);
    }
    return num;
};

// Test cases
console.log('Test 1: Valid ID (4) ->', validateInt(4, 'route_id', 'Test Cust'));
console.log('Test 2: Blank String ->', validateInt('', 'route_id', 'Test Cust'));

try {
    console.log('Test 3: Excel Error ("#N/A")');
    validateInt("#N/A", 'route_id', 'Mint Super Market');
} catch (e) {
    console.log('Test 3 Result: Caught expected error ->', e.message);
}

try {
    console.log('Test 4: Text Error ("Broken")');
    validateInt("Broken", 'pincode', 'Mint Super Market');
} catch (e) {
    console.log('Test 4 Result: Caught expected error ->', e.message);
}
