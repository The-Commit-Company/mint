import frappe
from pypika import Order

@frappe.whitelist(methods=["GET"])
@frappe.read_only()
def get_list(company: str, show_disabled: bool = False):

    frappe.has_permission("Bank Account", ptype="read", throw=True)

    bank_account = frappe.qb.DocType("Bank Account")
    account = frappe.qb.DocType("Account")

    query = (frappe.qb.from_(bank_account)
             .join(account)
             .on(bank_account.account == account.name)
             .select(bank_account.name, account.account_currency,
                     bank_account.account, bank_account.company,
                     bank_account.account_name, bank_account.is_default,
                     bank_account.bank, bank_account.account_type,
                     bank_account.account_subtype, bank_account.bank_account_no,
                     bank_account.last_integration_date, bank_account.is_credit_card
                     )
            .where(bank_account.is_company_account == 1)
            .where(bank_account.company == company)
            .orderby(bank_account.is_default, order=Order.desc)
    )

    if not show_disabled:
        query = query.where(bank_account.disabled == 0)

    return query.run(as_dict=True)

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
def set_closing_balance_as_per_statement(bank_account: str, date: str, balance: float):
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