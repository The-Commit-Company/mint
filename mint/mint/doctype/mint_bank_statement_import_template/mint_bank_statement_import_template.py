# Copyright (c) 2026, The Commit Company (Algocode Technologies Pvt. Ltd.) and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class MintBankStatementImportTemplate(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF
		from mint.mint.doctype.mint_bank_statement_import_template_columns.mint_bank_statement_import_template_columns import MintBankStatementImportTemplateColumns

		bank_account: DF.Link
		column_mapping: DF.Table[MintBankStatementImportTemplateColumns]
		statement_type: DF.Literal["Excel/CSV"]
	# end: auto-generated types

	pass
