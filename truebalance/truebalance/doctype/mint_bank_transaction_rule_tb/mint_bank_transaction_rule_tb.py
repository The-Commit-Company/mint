# Copyright (c) 2025, The Commit Company (Algocode Technologies Pvt. Ltd.) and contributors
# For license information, please see license.txt

import frappe
import re
from frappe import _
from frappe.model.document import Document


class MintBankTransactionRuleTB(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF
		from truebalance.mint.doctype.mint_bank_transaction_description_rules_tb.mint_bank_transaction_description_rules_tb import MintBankTransactionDescriptionRulesTB

		account: DF.Link
		classify_as: DF.Literal["Bank Entry", "Payment Entry", "Transfer"]
		company: DF.Link
		description_rules: DF.Table[MintBankTransactionDescriptionRules]
		max_amount: DF.Currency
		min_amount: DF.Currency
		party: DF.DynamicLink | None
		party_type: DF.Link | None
		priority: DF.Int
		rule_description: DF.SmallText | None
		rule_name: DF.Data
		transaction_type: DF.Literal["Any", "Withdrawal", "Deposit"]
	# end: auto-generated types
	
	def before_insert(self):
		"""Assign the next priority number for the new rule"""
		if not self.priority:
			# Get the highest priority for rules in the same company
			highest_priority = frappe.db.get_value(
				"Mint Bank Transaction Rule TB",
				filters={"company": self.company},
				fieldname="MAX(priority)",
				order_by="priority DESC"
			)
			
			# Set priority to 1 if no rules exist, otherwise increment by 1
			self.priority = (highest_priority or 0) + 1
	
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
		
		account_company = frappe.db.get_value("Account", self.account, "company")
		if account_company != self.company:
			frappe.throw(_("Account company does not match with the rule company."))
