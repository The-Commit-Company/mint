# Copyright (c) 2025, The Commit Company (Algocode Technologies Pvt. Ltd.) and contributors
# For license information, please see license.txt

import frappe
import re
from frappe import _
from frappe.model.document import Document


class MintBankTransactionRule(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF
		from mint.mint.doctype.mint_bank_transaction_description_rules.mint_bank_transaction_description_rules import MintBankTransactionDescriptionRules

		account: DF.Link
		classify_as: DF.Literal["Bank Entry", "Payment Entry", "Transfer"]
		description_rules: DF.Table[MintBankTransactionDescriptionRules]
		max_amount: DF.Currency
		min_amount: DF.Currency
		party: DF.DynamicLink | None
		party_type: DF.Link | None
		rule_description: DF.SmallText | None
		rule_name: DF.Data
		transaction_type: DF.Literal["Any", "Withdrawal", "Deposit"]
	# end: auto-generated types
	
	def validate(self):

		if self.min_amount and self.max_amount:
			if self.min_amount > self.max_amount:
				frappe.throw(_("Min amount cannot be greater than max amount."))
		
		if self.classify_as == "Payment Entry":
			if not self.party_type:
				frappe.throw(_("Party type is required to create a payment entry."))

			if not self.party:
				frappe.throw(_("Party is required create a payment entry."))
		
		# Validate regex
		for rule in self.description_rules:
			if rule.check == "Regex":
				try:
					re.compile(rule.value)
				except re.error:
					frappe.throw(_("Invalid regex pattern."))
