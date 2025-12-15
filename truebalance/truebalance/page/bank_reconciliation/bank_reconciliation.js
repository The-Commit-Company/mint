frappe.pages['bank-reconciliation'].on_page_load = function (wrapper) {
	// Redirect to the mint web app
	window.location.href = '/mint';

	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Bank Reconciliation - Mint"),
		single_column: true,
	});

	page.set_primary_action("Open Bank Reconciliation", function () {
		window.location.href = '/mint';
	});
}
