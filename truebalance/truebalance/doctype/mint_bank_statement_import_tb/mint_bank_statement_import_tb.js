// Copyright (c) 2025, The Commit Company (Algocode Technologies Pvt. Ltd.) and contributors
// For license information, please see license.txt

frappe.ui.form.on("Mint Bank Statement Import TB", {
    refresh(frm) {

        frm.add_custom_button("Process via Google AI", () => {
            frm.call("process_file")
        })

    },
});
