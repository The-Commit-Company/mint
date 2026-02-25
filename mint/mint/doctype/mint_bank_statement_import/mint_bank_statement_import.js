// Copyright (c) 2025, The Commit Company (Algocode Technologies Pvt. Ltd.) and contributors
// For license information, please see license.txt

frappe.ui.form.on("Mint Bank Statement Import", {
    refresh(frm) {

        frm.add_custom_button("Process via Google AI", () => {
            frm.call("process_file")
        })

    },
    bank_account(frm) {
        // Fetch currency from account
        if (frm.doc.bank_account) {
            frappe.db.get_value("Bank Account", frm.doc.bank_account, "account", (d) => {
                if (d) {
                    frappe.db.get_value("Account", d.account, "account_currency", (d) => {
                        if (d) {
                            frm.set_value("currency", d.account_currency)
                        }
                    })
                }
            })
        }
    }
});
