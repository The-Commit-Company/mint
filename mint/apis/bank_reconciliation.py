import frappe
from frappe import _
import json
import datetime
from erpnext.accounts.doctype.bank_reconciliation_tool.bank_reconciliation_tool import create_payment_entry_bts, create_journal_entry_bts
from erpnext.accounts.party import get_party_account
from erpnext import get_default_cost_center

@frappe.whitelist()
def clear_clearing_date(voucher_type: str, voucher_name: str):
    """
        Clear the clearing date of a voucher
    """
    # using db_set to trigger notification
    payment_entry = frappe.get_doc(voucher_type, voucher_name)

    if payment_entry.has_permission("write"):
        payment_entry.db_set("clearance_date", None)


@frappe.whitelist()
def reconcile_vouchers(bank_transaction_name, vouchers, is_new_voucher: bool = False):
	 
    # updated clear date of all the vouchers based on the bank transaction
    vouchers = json.loads(vouchers)
    transaction = frappe.get_doc("Bank Transaction", bank_transaction_name)
    
    # Add the vouchers with zero allocation. Save() will perform the allocations and clearance
    # We are overriding the default behavior of the method to set the reconciliation type
    if 0.0 >= transaction.unallocated_amount:
        frappe.throw(_("Bank Transaction {0} is already fully reconciled").format(transaction.name))
    
    for voucher in vouchers:
        transaction.append(
            "payment_entries",
            {
                "payment_document": voucher["payment_doctype"],
                "payment_entry": voucher["payment_name"],
                "allocated_amount": 0.0,  # Temporary
                "reconciliation_type": "Voucher Created" if is_new_voucher else "Matched",
            },
        )
    transaction.validate_duplicate_references()
    transaction.allocate_payment_entries()
    transaction.update_allocated_amount()
    transaction.set_status()
    transaction.save()
    
    return transaction

@frappe.whitelist()
def unreconcile_transaction(transaction_name: str):
    """
        Unreconcile a transaction

        If the individual entries in the bank transaction are matched, just remove the payment entries
        Else, cancel the individual entries
    """
    transaction = frappe.get_doc("Bank Transaction", transaction_name)

    vouchers_to_cancel = []

    for entry in transaction.payment_entries:
        if entry.reconciliation_type == "Voucher Created":
            vouchers_to_cancel.append({
                "doctype": entry.payment_document,
                "name": entry.payment_entry,
            })
            
    transaction.remove_payment_entries()

    for voucher in vouchers_to_cancel:
        frappe.get_doc(voucher["doctype"], voucher["name"]).cancel()


@frappe.whitelist()
def create_internal_transfer(bank_transaction_name: str, 
                             posting_date: str, 
                             reference_date: str, 
                             reference_no: str, 
                             paid_from: str, 
                             paid_to: str,
                             custom_remarks: bool = False,
                             remarks: str = None,
                             dimensions: dict = None):
    """
    Create an internal transfer payment entry
    """

    bank_transaction = frappe.get_doc("Bank Transaction", bank_transaction_name)

    bank_account = frappe.get_cached_value("Bank Account", bank_transaction.bank_account, "account")
    company = frappe.get_cached_value("Account", bank_account, "company")

    is_withdrawal = bank_transaction.withdrawal > 0.0

    pe = frappe.new_doc("Payment Entry")

    pe.company = company
    pe.payment_type = "Internal Transfer"
    pe.posting_date = posting_date
    pe.reference_date = reference_date
    pe.reference_no = reference_no
    pe.custom_remarks = custom_remarks
    pe.paid_amount = bank_transaction.unallocated_amount
    pe.received_amount = bank_transaction.unallocated_amount

    # TODO: Support multi-currency transactions
    pe.target_exchange_rate = 1.0

    if custom_remarks:
        pe.remarks = remarks
    
    if dimensions:
        pe.update(dimensions)

    if is_withdrawal:
         pe.paid_to = paid_to
         pe.paid_from = bank_account
    else:
         pe.paid_from = paid_from
         pe.paid_to = bank_account
    
    pe.insert()
    pe.submit()

    vouchers = json.dumps(
		[
			{
				"payment_doctype": "Payment Entry",
				"payment_name": pe.name,
				"amount": bank_transaction.unallocated_amount,
			}
		]
	)

    return reconcile_vouchers(bank_transaction_name, vouchers, is_new_voucher=True)

@frappe.whitelist(methods=['POST'])
def create_bulk_bank_entry_and_reconcile(bank_transactions: list, 
                                         account: str):
    """
     Create bank entries for all transactions and reconcile them
    """
    for bank_transaction in bank_transactions:
        transactions_details = frappe.db.get_value("Bank Transaction", bank_transaction, ["name", "deposit", "withdrawal", "bank_account", "currency", "unallocated_amount", "date", "reference_number", "description"], as_dict=True)

        is_credit_card = frappe.get_cached_value("Bank Account", transactions_details.bank_account, "is_credit_card")

        # Check Number will be limited to 140 characters
        cheque_no = (transactions_details.reference_number or transactions_details.description or '')[:140]

        create_bank_entry_and_reconcile(bank_transaction_name=bank_transaction,
                                        cheque_date=transactions_details.date,
                                        posting_date=transactions_details.date,
                                        cheque_no=cheque_no,
                                        user_remark=transactions_details.description,
                                        entries=[{
                                            "account": account,
                                            "amount": transactions_details.unallocated_amount,
                                        }],
                                        voucher_type=("Credit Card Entry" if is_credit_card else "Bank Entry"))

@frappe.whitelist(methods=['POST'])
def create_bank_entry_and_reconcile(bank_transaction_name: str, 
                                    cheque_date: str | datetime.date,
                                    posting_date: str | datetime.date,
                                    cheque_no: str,
                                    user_remark: str,
                                    entries: list,
                                    voucher_type: str = "Bank Entry",
                                    dimensions: dict = None):
    """
        Create a bank entry and reconcile it with the bank transaction
    """
    # Create a new journal entry based on the bank transaction
    bank_transaction = frappe.db.get_values(
        "Bank Transaction",
        bank_transaction_name,
        fieldname=["name", "deposit", "withdrawal", "bank_account", "currency", "unallocated_amount"],
        as_dict=True,
    )[0]

    bank_account = frappe.get_cached_value("Bank Account", bank_transaction.bank_account, "account")
    company = frappe.get_cached_value("Account", bank_account, "company")

    default_cost_center = get_default_cost_center(company)

    bank_entry = frappe.get_doc({
        "doctype": "Journal Entry",
        "voucher_type": voucher_type,
        "company": company,
        "cheque_date": cheque_date,
        "posting_date": posting_date,
        "cheque_no": cheque_no,
        "user_remark": user_remark,
    })

    # Compute accounts for JE 
    is_withdrawal = bank_transaction.withdrawal > 0.0

    if is_withdrawal:
        bank_entry.append("accounts", {
            "account": bank_account,
            "bank_account": bank_transaction.bank_account,
            "credit_in_account_currency": bank_transaction.unallocated_amount,
            "credit": bank_transaction.unallocated_amount,
            "debit_in_account_currency": 0,
            "debit": 0,
        })
    else:
        bank_entry.append("accounts", {
            "account": bank_account,
            "bank_account": bank_transaction.bank_account,
            "debit_in_account_currency": bank_transaction.unallocated_amount,
            "debit": bank_transaction.unallocated_amount,
            "credit_in_account_currency": 0,
            "debit": 0,
        })
    
    if not dimensions:
        dimensions = {}
    
    for entry in entries:
        # Check if this account is a Income or Expense Account
        # If it is, and no cost center is added, select the company default cost center
        cost_center = dimensions.get("cost_center")

        if not cost_center:
            report_type = frappe.get_cached_value("Account", entry["account"], "report_type")
            if report_type == "Profit and Loss":
                # Cost center is required
                cost_center = default_cost_center
        
        credit = entry["amount"] if not is_withdrawal else 0
        debit = entry["amount"] if is_withdrawal else 0
        bank_entry.append("accounts", {
            "account": entry["account"],
            # TODO: Multi currency support
            "debit_in_account_currency": debit,
            "credit_in_account_currency": credit,
            "debit": debit,
            "credit": credit,
            "cost_center": cost_center,
            "party_type": entry.get("party_type") if entry.get("party") else None,
            "party": entry.get("party"),
            "user_remark": entry.get("user_remark"),
            **dimensions,
        })

    bank_entry.insert()
    bank_entry.submit()

    if bank_transaction.deposit > 0.0:
        paid_amount = bank_transaction.deposit
    else:
        paid_amount = bank_transaction.withdrawal

    return reconcile_vouchers(bank_transaction_name, json.dumps([{
        "payment_doctype": "Journal Entry",
        "payment_name": bank_entry.name,
        "amount": paid_amount,
    }]), is_new_voucher=True)

    
@frappe.whitelist(methods=['POST'])
def create_payment_entry_and_reconcile(bank_transaction_name: str, 
                                       payment_entry_doc: dict):
    """
        Create a payment entry and reconcile it with the bank transaction
    """
    payment_entry = frappe.get_doc({
        **payment_entry_doc,
        "doctype": "Payment Entry",
    })
    payment_entry.insert()
    payment_entry.submit()
    return reconcile_vouchers(bank_transaction_name, json.dumps([{
        "payment_doctype": "Payment Entry",
        "payment_name": payment_entry.name,
        "amount": payment_entry.paid_amount,
    }]), is_new_voucher=True)


@frappe.whitelist(methods=['GET'])
def get_account_defaults(account: str):
    """
        Get the default cost center and write off account for an account
    """
    company, report_type = frappe.db.get_value("Account", account, ["company", "report_type"])

    return get_default_cost_center(company) if report_type == "Profit and Loss" else  ""


@frappe.whitelist(methods=["GET"])
def get_party_details(company: str, party_type: str, party: str):

    if not frappe.db.exists(party_type, party):
        frappe.throw(_("{0} {1} does not exist").format(party_type, party))

    party_account = get_party_account(party_type, party, company)
    _party_name = "title" if party_type == "Shareholder" else party_type.lower() + "_name"
    party_name = frappe.db.get_value(party_type, party, _party_name)

    return {
        "party_account": party_account,
        "party_name": party_name,
    }
    