import frappe
import json
from frappe import _
from google.api_core.client_options import ClientOptions
from google.cloud import documentai, documentai_v1
from google.oauth2 import service_account

@frappe.whitelist(methods=["GET"])
def get_list_of_processors(processor_type: str = "BANK_STATEMENT"):
	"""
	Get the list of document processors available for the Google Cloud project.
	"""
	frappe.has_permission("Mint Settings", ptype="read", throw=True)

	settings = frappe.get_single("Mint Settings")
	if not settings.google_project_id:
		frappe.throw(_("Google Project ID is not set. Please set it in the Mint Settings."))

	location = settings.google_processor_location

	key = json.loads(settings.get_password("google_service_account_json_key"))

	credentials = service_account.Credentials.from_service_account_info(key)

	client_options = ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")
	client = documentai.DocumentProcessorServiceClient(
		credentials=credentials, client_options=client_options
	)

	parent = client.common_location_path(settings.google_project_id, location)

	processor_list = client.list_processors(parent=parent)

	existing_processors = []
	type_filter = PROCESSOR_TYPES_CONFIG[processor_type]["type"] if processor_type in PROCESSOR_TYPES_CONFIG else None

	for processor in processor_list:
		if type_filter and processor.type_ != type_filter:
			continue
		existing_processors.append(
			{
				"id": processor.name.split("/")[-1],
				"name": processor.name,
				"display_name": processor.display_name,
				"type": processor.type_,
				"processor_type_key": processor.type_,
				"state": processor.state,
			}
		)

	return existing_processors


PROCESSOR_TYPES_CONFIG = {
	"BANK_STATEMENT": {
		"type": "BANK_STATEMENT_PROCESSOR",
		"display_name": "Bank Statement Parser",
		"description": "Extract account info, transactions, and balances from bank statements",
		"best_for": ["Financial analysis", "Loan processing", "Bank statement digitization"],
		"pricing": "$0.10 per classified document",
		"category": "specialized",
	},
}

@frappe.whitelist(methods=["POST"])
def create_document_processor(processor_type_key: str = "BANK_STATEMENT"):
	"""
	Create a processor of the specified type.
	processor_type_key: The key of the processor type to create.
	Returns:
	        dict: A dictionary containing the processor details.
	"""
	if processor_type_key not in PROCESSOR_TYPES_CONFIG:
		frappe.throw(f"Invalid processor type: {processor_type_key}")

	settings = frappe.get_single("Mint Settings")
	if not settings.google_project_id:
		frappe.throw(_("Google APIs are not enabled. Please enable them in Mint Settings."))

	# Get the processor type configuration
	config = PROCESSOR_TYPES_CONFIG[processor_type_key]
	processor_type = config["type"]

	# manually set the display name
	display_name = f"Mint-{config['display_name']}"

	location = settings.google_processor_location
	key = json.loads(settings.get_password("google_service_account_json_key"))
	credentials = service_account.Credentials.from_service_account_info(key)

	client_options = ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")
	client = documentai.DocumentProcessorServiceClient(
		credentials=credentials, client_options=client_options
	)

	parent = client.common_location_path(settings.google_project_id, location)

	try:
		processor = client.create_processor(
			parent=parent,
			processor=documentai.Processor(display_name=display_name, type_=processor_type),
		)
		if not processor:
			frappe.throw(_("Failed to create processor"))

		return {
			"id": processor.name.split("/")[-1],
			"full_name": processor.name,
			"display_name": processor.display_name,
			"type": processor.type_,
			"processor_type_key": processor_type_key,
			"state": processor.state,
		}
	except Exception as e:
		frappe.log_error(f"Error creating document processor {str(e)}")
		frappe.throw(_("Failed to create document processor"))