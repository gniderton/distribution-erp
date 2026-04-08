const sanitizeInt = (val) => {
    if (val === null || val === undefined || val === '') return null;
    const num = parseInt(val);
    return isNaN(num) ? null : num;
};

// Test cases
console.log('Test 1: Standard ID (4) ->', sanitizeInt(4));
console.log('Test 2: String ID ("5") ->', sanitizeInt("5"));
console.log('Test 3: Excel Error ("#N/A") ->', sanitizeInt("#N/A"));
console.log('Test 4: Blank string ("") ->', sanitizeInt(""));
console.log('Test 5: Undefined ->', sanitizeInt(undefined));
console.log('Test 6: Pincode ("673633") ->', sanitizeInt("673633"));
