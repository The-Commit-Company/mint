
export interface MintSettings{
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
	/**	Google Project ID : Data	*/
	google_project_id?: string
	/**	Google Processor Location : Select	*/
	google_processor_location?: "us" | "eu"
	/**	Google Service Account JSON Key : Password	*/
	google_service_account_json_key?: string
	/**	Google Document Processor - Bank Statement : Data	*/
	bank_statement_gdoc_processor?: string
}