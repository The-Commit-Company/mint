import { MintBankTransactionDescriptionRules } from './MintBankTransactionDescriptionRules'

export interface MintBankTransactionRule {
	name: string
	creation: string
	modified: string
	owner: string
	modified_by: string
	docstatus: 0 | 1 | 2
	parent?: string
	parentfield?: string
	parenttype?: string
	idx?: number
	/**	Rule Name : Data	*/
	rule_name: string
	/**	Transaction Type : Select	*/
	transaction_type: "Any" | "Withdrawal" | "Deposit"
	/**	Priority : Int	*/
	priority: number
	/**	Min Amount : Currency	*/
	min_amount?: number
	/**	Max Amount : Currency	*/
	max_amount?: number
	/**	Rule Description : Small Text	*/
	rule_description?: string
	/**	Company : Link - Company	*/
	company: string
	/**	Description Rules : Table - Mint Bank Transaction Description Rules TB	*/
	description_rules: MintBankTransactionDescriptionRules[]
	/**	Classify As : Select	*/
	classify_as: "Bank Entry" | "Payment Entry" | "Transfer"
	/**	Account : Link - Account	*/
	account: string
	/**	Party Type : Link - DocType	*/
	party_type?: string
	/**	Party : Dynamic Link	*/
	party?: string
}