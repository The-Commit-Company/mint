import frappe

@frappe.whitelist()
def update_clearance_date(payment_document: str, payment_entry: str, account: str, clearance_date: str | None):
    """
    Update the clearance date of a voucher
    """

    if not clearance_date:
        clearance_date = None

    # Check for permissions
    frappe.has_permission("Bank Clearance", ptype="write", throw=True)

    if payment_document == "Sales Invoice":
                frappe.db.set_value(
                    "Sales Invoice Payment",
                    {"parent": payment_entry, "account": account, "amount": [">", 0]},
                    "clearance_date",
                    clearance_date,
                )

    else:
        frappe.db.set_value(
            payment_document, payment_entry, "clearance_date", clearance_date
        )
