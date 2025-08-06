# Copyright (c) 2025, The Commit Company (Algocode Technologies Pvt. Ltd.) and contributors
# For license information, please see license.txt

import frappe
from frappe import _
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
	
	@frappe.whitelist()
	def process_file(self):

		if self.file_type == "PDF":
			self.process_pdf()
		else:
			frappe.throw(_("Invalid file type"))
	
	def process_pdf(self):
		"""
		Process the PDF using Google Document AI and extract the transactions.
		"""
		from mint.apis.google_ai import run_bank_statement_processor
		
		transactions = run_bank_statement_processor(self.file)
		# Order the transactions by date
		transactions.sort(key=lambda x: frappe.utils.getdate(x.get("date")))
		self.transactions = []
		for transaction in transactions:
			self.append("transactions", {
				"date": transaction.get("date"),
				"amount": transaction.get("amount"),
				"type": transaction.get("type"),
				"description": transaction.get("description")
			})
		
	def on_submit(self):
		if not self.transactions:
			frappe.throw(_("No transactions found"))
		
		for transaction in self.transactions:
			bank_tx = frappe.get_doc({
				"doctype": "Bank Transaction",
				"date": transaction.get("date"),
				"status": "Unreconciled",
				"bank_account": self.bank_account,
				"withdrawal": transaction.get("amount") if transaction.get("type") == "Withdrawal" else 0,
				"deposit": transaction.get("amount") if transaction.get("type") == "Deposit" else 0,
				"description": transaction.get("description"),
				"reference_number": transaction.get("reference"),
			})
			bank_tx.insert()
			bank_tx.submit()
			transaction.imported = 1


		
