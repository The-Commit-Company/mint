import frappe
import datetime

@frappe.whitelist(methods=["GET"])
@frappe.read_only()
def get_list(company: str, show_disabled: bool = False):

    filters = {
        "is_company_account": 1,
        "company": company
    }

    if not show_disabled:
        filters["disabled"] = 0

    bank_accounts = frappe.get_list("Bank Account", 
                                    filters=filters, 
                                    order_by="is_default desc",
                                    fields=["name", "account", "company", "account_name", "is_default", "bank", "account_type", "account_subtype", "bank_account_no", "last_integration_date", "is_credit_card"])

    for bank_account in bank_accounts:
        bank_account.account_currency = frappe.get_cached_value("Account", bank_account.account, "account_currency")

    
    return bank_accounts

@frappe.whitelist(methods=["GET"])
def get_closing_balance_as_per_statement(bank_account: str, date: str):
    """
        Get the closing balance as per statement for a bank account and date
    """
    latest_balance = frappe.get_list("Mint Bank Statement Balance", filters={
        "bank_account": bank_account,
        "date": ["<=", date]
    }, fields=["balance", "date"], order_by="date desc", limit=1)

    if latest_balance:
        return {
            "balance": latest_balance[0].balance,
            "date": latest_balance[0].date
        }
    return {
        "balance": 0,
        "date": None
    }

@frappe.whitelist()
def set_closing_balance_as_per_statement(bank_account: str, date: str | datetime.date, balance: float):
    """
    Set the closing balance as per statement for a bank account and date
    """

    existing = frappe.db.exists("Mint Bank Statement Balance", {
        "bank_account": bank_account,
        "date": date
    })

    if existing:
        doc = frappe.get_doc("Mint Bank Statement Balance", existing)
        doc.balance = balance
        doc.save()
    else:
        doc = frappe.new_doc("Mint Bank Statement Balance")
        doc.bank_account = bank_account
        doc.date = date
        doc.balance = balance
        doc.save()