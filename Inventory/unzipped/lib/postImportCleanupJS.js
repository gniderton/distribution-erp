utils.showNotification({ title: "Success", description: `Imported ${varImportData.value.length} items`, notificationType: "success" });
varImportData.setValue([]); // Clear valid list
// Now the Modal will automatically reveal the Error Table (if any errors exist)
if (varImportErrors.value.length === 0) {
   modalFrameImport. hide(); // Close if no errors left
}