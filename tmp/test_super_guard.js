const validateEmail = (val, recordName) => {
    if (val === null || val === undefined) return null;
    const cleanVal = String(val).trim();
    // Broad-spectrum Excel error catch
    if (cleanVal === '' || cleanVal === '#N/A' || cleanVal.startsWith('#VALUE') || cleanVal.startsWith('#REF') || cleanVal.startsWith('#DIV')) return null;
    
    const emailRegex = /^.+@.+\..+$/;
    if (!emailRegex.test(cleanVal)) {
        throw new Error(`Data Error at '${recordName}': Invalid email format ('${cleanVal}'). Please fix or leave blank.`);
    }
    return cleanVal;
};

// Test cases
console.log('Test 1: Padded Email (" test@gmail.com ") ->', validateEmail(' test@gmail.com ', 'Test Vendor'));
console.log('Test 2: Padded Error (" #N/A ") ->', validateEmail(' #N/A ', 'Test Vendor'));
console.log('Test 3: Excel VALUE! error ->', validateEmail('#VALUE!', 'Test Vendor'));
console.log('Test 4: Excel REF! error ->', validateEmail(' #REF! ', 'Test Vendor'));

try {
    console.log('Test 5: Actual Broken Email ("Broken-Email")');
    validateEmail("Broken-Email", 'Bad Vendor Inc');
} catch (e) {
    console.log('Test 5 Result: Caught expected error ->', e.message);
}
