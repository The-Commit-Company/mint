import frappe

def on_trash(doc, method):
    """
    When a bank account is deleted, delete the closing balances as per statement
    """
    frappe.db.delete("Mint Bank Statement Balance", filters={"bank_account": doc.name})