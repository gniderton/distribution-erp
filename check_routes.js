try {
    console.log("Loading customers route...");
    require('./routes/customers');
    console.log("✅ Customers route loaded.");

    console.log("Loading employees route...");
    require('./routes/employees');
    console.log("✅ Employees route loaded.");

} catch (e) {
    console.error("❌ Failed to load routes:", e);
}
