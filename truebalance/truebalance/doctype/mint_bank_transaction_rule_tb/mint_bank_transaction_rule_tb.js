// Copyright (c) 2025, The Commit Company (Algocode Technologies Pvt. Ltd.) and contributors
// For license information, please see license.txt

frappe.ui.form.on("Mint Bank Transaction Rule TB", {
	company: function(frm) {
		frm.set_query("account", function() {
			return {
				filters: {
					company: frm.doc.company
				}
			};
		});
	},
});
