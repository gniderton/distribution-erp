const fs = require('fs');

const emiFile = 'C:/Users/user/Downloads/Backened/gniderton-erp-web/src/modules/loan/components/EmiEntryModal.tsx';
let emiContent = fs.readFileSync(emiFile, 'utf8');

const calculateSplitLogic = `
  const calculateSplit = (total: string) => {
    const totalAmount = Number(total || 0);
    const principalBalance = Number(loan?.balance_principal || 0);
    const ratePa = Number(loan?.interest_rate_pa || 0);
    
    if (ratePa > 0 && principalBalance > 0) {
      const monthlyInterest = (principalBalance * ratePa) / (100 * 12);
      const interest = Math.min(totalAmount, monthlyInterest);
      const principal = totalAmount - interest;
      return {
        principal_portion: principal.toFixed(2),
        interest_portion: interest.toFixed(2)
      };
    }
    return {
      principal_portion: total,
      interest_portion: '0'
    };
  };
`;

// Insert calculateSplit after useBankAccounts
emiContent = emiContent.replace('const createMutation = useCreateInstallment(loan?.id || null)', 
  'const createMutation = useCreateInstallment(loan?.id || null)\n' + calculateSplitLogic);

// Replace useEffect
emiContent = emiContent.replace(/useEffect\(\(\) => \{[\s\S]*?\}, \[open, loan\]\)/, 
`useEffect(() => {
    if (open && loan) {
      const initialAmount = loan.emi_amount ? String(loan.emi_amount) : '';
      const split = calculateSplit(initialAmount);
      setFormData(prev => ({
        ...prev,
        transaction_date: format(new Date(), 'yyyy-MM-dd'),
        total_amount: initialAmount,
        principal_portion: split.principal_portion,
        interest_portion: split.interest_portion,
        reference_no: '',
        remarks: '',
        bank_statement_entry_id: ''
      }))
    }
  }, [open, loan])`);

// Replace total_amount onChange
emiContent = emiContent.replace(/onChange=\{e => \{[\s\S]*?\}\}/, 
`onChange={e => {
                  const newTotal = e.target.value;
                  const split = calculateSplit(newTotal);
                  setFormData({ 
                    ...formData, 
                    total_amount: newTotal,
                    principal_portion: split.principal_portion,
                    interest_portion: split.interest_portion 
                  })
                }}`);

// Replace bank_statement_entry_id onChange
emiContent = emiContent.replace(/onChange=\{e => setFormData\(\{ \.\.\.formData, bank_statement_entry_id: e\.target\.value, bank_account_id: '' \}\)\}/, 
`onChange={e => {
                      const stmtId = e.target.value;
                      const selectedStmt = bankStatements?.find((s: any) => String(s.id) === stmtId);
                      const newUpdates: any = { bank_statement_entry_id: stmtId, bank_account_id: '' };
                      if (selectedStmt) {
                        newUpdates.transaction_date = format(new Date(selectedStmt.transaction_date), 'yyyy-MM-dd');
                        const available = Number(selectedStmt.credit_amount || selectedStmt.debit_amount || 0) - Number(selectedStmt.consumed_amount || 0);
                        if (available > 0) {
                          newUpdates.total_amount = String(available);
                          const split = calculateSplit(String(available));
                          newUpdates.principal_portion = split.principal_portion;
                          newUpdates.interest_portion = split.interest_portion;
                        }
                      }
                      setFormData(prev => ({ ...prev, ...newUpdates }));
                    }}`);

fs.writeFileSync(emiFile, emiContent);


const loanFile = 'C:/Users/user/Downloads/Backened/gniderton-erp-web/src/modules/loan/components/CreateLoanModal.tsx';
let loanContent = fs.readFileSync(loanFile, 'utf8');

// Replace bank_statement_entry_id onChange
loanContent = loanContent.replace(/onChange=\{e => setFormData\(\{ \.\.\.formData, bank_statement_entry_id: e\.target\.value, bank_account_id: '' \}\)\}/, 
`onChange={e => {
                  const stmtId = e.target.value;
                  const selectedStmt = bankStatements?.find((s: any) => String(s.id) === stmtId);
                  const newUpdates: any = { bank_statement_entry_id: stmtId, bank_account_id: '' };
                  if (selectedStmt) {
                    const stmtDate = format(new Date(selectedStmt.transaction_date), 'yyyy-MM-dd');
                    newUpdates.disbursement_date = stmtDate;
                    newUpdates.start_date = stmtDate;
                    const available = Number(selectedStmt.credit_amount || selectedStmt.debit_amount || 0) - Number(selectedStmt.consumed_amount || 0);
                    if (available > 0) {
                      newUpdates.principal_amount = String(available);
                    }
                  }
                  setFormData(prev => ({ ...prev, ...newUpdates }));
                }}`);

fs.writeFileSync(loanFile, loanContent);
console.log("Updated both files");
