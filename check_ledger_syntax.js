try {
    require('./routes/loans.js');
    require('./routes/loan_entities.js');
    console.log("✅ Syntax OK");
} catch (e) {
    console.error("❌ Syntax Error:", e.message);
    process.exit(1);
}
