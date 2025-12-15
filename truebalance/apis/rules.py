import frappe
import re

def scheduler_run_rule_evaluation():

    automatically_run_rules_on_unreconciled_transactions = frappe.db.get_single_value("Mint Settings TB", "automatically_run_rules_on_unreconciled_transactions")

    if automatically_run_rules_on_unreconciled_transactions:
        _run_rule_evaluation(force_evaluate=False)

@frappe.whitelist(methods=["POST"])
def run_rule_evaluation(force_evaluate=False):
    frappe.enqueue(method=_run_rule_evaluation, force_evaluate=force_evaluate)

def _run_rule_evaluation(force_evaluate=False):
    """
    Run the rule evaluation for all bank transactions

    If force evaluate is set to True, then transactions that were previously evaluated will be evaluated again.
    """
    rules = frappe.get_all("Mint Bank Transaction Rule TB", fields=["name"], order_by="priority asc")

    if not rules:
        return

    filters = {
        "status": "Unreconciled",
        "docstatus": 1
    }

    if not force_evaluate:
        filters["is_rule_evaluated"] = 0

    unreconciled_transactions = frappe.get_all("Bank Transaction", 
                                               filters=filters, 
                                               fields=["name", "bank_account","company", "date", "withdrawal", "deposit", "description", "reference_number"])
    
    if not unreconciled_transactions:
        return
    
    rule_docs = []

    for rule in rules:
        rule_doc = frappe.get_doc("Mint Bank Transaction Rule TB", rule.name)
        rule_docs.append(rule_doc)
    
    # Run evaluation for each transaction
    for transaction in unreconciled_transactions:
        evaluate_transaction(transaction, rule_docs)

def evaluate_transaction(transaction, rule_docs):

    matched_rule = None

    for rule in rule_docs:

        if rule.company != transaction.company:
            continue

        # Run the rules

        # Type rule - we continue searching for a rule if the transaction type does not match
        if rule.transaction_type == "Withdrawal":
            if transaction.withdrawal == 0.0:
                continue
        
        if rule.transaction_type == "Deposit":
            if transaction.deposit == 0.0:
                continue
        
        amount = transaction.withdrawal or transaction.deposit
        if rule.min_amount and amount < rule.min_amount:
            continue
        
        if rule.max_amount and amount > rule.max_amount:
            continue
        
        # Description rule
        for rule_desc_rule in rule.description_rules:
            desc = (transaction.description or "").lower()
            value = (rule_desc_rule.value or "").lower()
            # If we find a match - we can assign the rule to the transaction because type and amount matches
            if rule_desc_rule.check == "Contains":
                if value in desc:
                    matched_rule = rule
                    break
            
            if rule_desc_rule.check == "Starts With":
                if desc.startswith(value):
                    matched_rule = rule
                    break
            
            if rule_desc_rule.check == "Ends With":
                if desc.endswith(value):
                    matched_rule = rule
                    break
            
            if rule_desc_rule.check == "Regex":
                if re.search(value, desc):
                    matched_rule = rule
                    break
        
        if matched_rule:
            break
        
    frappe.db.set_value("Bank Transaction", transaction.name, {
        "is_rule_evaluated": 1,
        "matched_rule": matched_rule.name if matched_rule else None
    })
        
