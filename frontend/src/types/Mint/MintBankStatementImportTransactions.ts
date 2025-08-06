
export interface MintBankStatementImportTransactions{
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
	/**	Date : Date	*/
	date: string
	/**	Amount : Currency	*/
	amount: number
	/**	Type : Select	*/
	type: "Withdrawal" | "Deposit"
	/**	Imported : Check	*/
	imported?: 0 | 1
	/**	Description : Small Text	*/
	description?: string
	/**	Reference : Data	*/
	reference?: string
}