# Copyright (c) 2025, The Commit Company (Algocode Technologies Pvt. Ltd.) and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class MintSettingsTB(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		automatically_run_rules_on_unreconciled_transactions: DF.Check
		bank_statement_gdoc_processor: DF.Data | None
		google_processor_location: DF.Literal["us", "eu"]
		google_project_id: DF.Data | None
		google_service_account_json_key: DF.Password | None
		transfer_match_days: DF.Int
	# end: auto-generated types
	pass
