from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def after_install():

    create_custom_fields({
        "Bank Transaction Payments": [
			{
				"fieldname": "reconciliation_type",
				"fieldtype": "Select",
				"label": "Reconciliation Type",
				"options": "Matched\nVoucher Created",
				"insert_after": "clearance_date",
				"read_only": 1,
				"default": "Matched",
			}
		],
        "Bank Account": [
            {
                "fieldname": "is_credit_card",
                "fieldtype": "Check",
                "label": "Is Credit Card",
                "insert_after": "bank_account_no",
                "default": 0,
			}
		],
        "Bank Transaction": [
            {
                "fieldname": "is_rule_evaluated",
                "fieldtype": "Check",
                "label": "Is Rule Evaluated",
                "default": 0,
                "allow_on_submit": 1,
                "insert_after": "party",
			},
            {
                "fieldname": "matched_rule",
                "insert_after": "is_rule_evaluated",
                "fieldtype": "Link",
                "label": "Matched Rule",
                "options": "Mint Bank Transaction Rule TB",
                "read_only": 1,
                "allow_on_submit": 1,
			}
		]
        })
