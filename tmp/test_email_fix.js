const validateEmail = (val, recordName) => {
    if (val === null || val === undefined || val === '' || val === '#N/A') return null;
    const emailRegex = /^.+@.+\..+$/;
    if (!emailRegex.test(val)) {
        throw new Error(`Data Error at '${recordName}': Invalid email format ('${val}'). Please fix or leave blank.`);
    }
    return val;
};

// Test cases
console.log('Test 1: Valid Email ->', validateEmail('test@gmail.com', 'Test Vendor'));
console.log('Test 2: Blank Email ->', validateEmail('', 'Test Vendor'));
console.log('Test 3: Excel Error (#N/A) ->', validateEmail('#N/A', 'Test Vendor'));

try {
    console.log('Test 4: Invalid Format ("Broken")');
    validateEmail("Broken", 'Bad Vendor Inc');
} catch (e) {
    console.log('Test 4 Result: Caught expected error ->', e.message);
}
