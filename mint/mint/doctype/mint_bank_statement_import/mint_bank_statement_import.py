# Copyright (c) 2025, The Commit Company (Algocode Technologies Pvt. Ltd.) and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class MintBankStatementImport(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF
		from mint.mint.doctype.mint_bank_statement_import_transactions.mint_bank_statement_import_transactions import MintBankStatementImportTransactions

		amended_from: DF.Link | None
		bank_account: DF.Link
		error: DF.Code | None
		file: DF.Attach
		file_type: DF.Literal["PDF"]
		status: DF.Literal["Not Started", "Completed", "Error"]
		transactions: DF.Table[MintBankStatementImportTransactions]
	# end: auto-generated types
	pass
