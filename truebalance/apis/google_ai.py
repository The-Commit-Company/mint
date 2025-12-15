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
	frappe.has_permission("Mint Settings TB", ptype="read", throw=True)

	settings = frappe.get_single("Mint Settings TB")
	if not settings.google_project_id:
		frappe.throw(_("Google Project ID is not set. Please set it in the Mint Settings TB."))

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

	settings = frappe.get_single("Mint Settings TB")
	if not settings.google_project_id:
		frappe.throw(_("Google APIs are not enabled. Please enable them in Mint Settings TB."))

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


def run_bank_statement_processor(file_path: str):
	"""
	Run the document AI processor on the given file.
	"""
	settings = frappe.get_doc("Mint Settings TB")

	if not settings.google_project_id:
		frappe.throw(_("Google Project ID is not set in Mint Settings TB"))
	
	if not settings.google_service_account_json_key:
		frappe.throw(_("Google Service Account JSON Key is not set in Mint Settings TB"))
	
	if not settings.bank_statement_gdoc_processor:
		frappe.throw(_("Bank Statement Processor is not set in Mint Settings TB"))

	file_doc = frappe.get_doc("File", {"file_url": file_path})

	content = file_doc.get_content()

	settings = frappe.get_single("Mint Settings TB")

	location = settings.google_processor_location

	key = json.loads(settings.get_password("google_service_account_json_key"))

	credentials = service_account.Credentials.from_service_account_info(key)

	client_options = ClientOptions(api_endpoint=f"{location}-documentai.googleapis.com")
	client = documentai.DocumentProcessorServiceClient(
		credentials=credentials, client_options=client_options
	)
		
	processor_id = settings.bank_statement_gdoc_processor
	
	full_processor_name = client.processor_path(
		settings.google_project_id, location, processor_id
	)

	request = documentai_v1.GetProcessorRequest(name=full_processor_name)
	processor = client.get_processor(request=request)

	raw_document = documentai_v1.RawDocument(content=content, mime_type="application/pdf")
	version_id = "pretrained-bankstatement-v5.0-2023-12-06"
	full_version_name = client.processor_version_path(
		settings.google_project_id, location, processor_id, version_id
	)

	# Use the default processor without schema override
	process_request = documentai_v1.ProcessRequest(
		name=full_version_name, 
		raw_document=raw_document
	)

	result = client.process_document(request=process_request)

	document = result.document
	# ------------------------------------------------------------------
	# Extract & return polished transaction list
	# ------------------------------------------------------------------
	transactions = extract_transactions_from_document(document)
	print(transactions)   # ← keep for debugging or remove in production
	return transactions


def extract_transactions_from_document(document):
	"""
	Return a polished list of transactions with keys:
	    date, amount, type ("deposit" | "withdrawal"), description
	"""
	transactions: list[dict] = []

	# ---------------- helpers -----------------
	def _norm_amount(val: str) -> str:
		return val.replace(",", "").strip()

	def _norm_date(val: str) -> str:
		"""
		Convert many common date strings to YYYY-MM-DD.
		Accepts:
		    DD/MM/YYYY,  D/M/YY,  MM/DD/YYYY,  YYYY-MM-DD, etc.
		If parsing fails we return the original string unchanged.
		"""
		import re, datetime as _dt

		val = val.strip()
		# Already ISO
		try:
			return _dt.datetime.strptime(val, "%Y-%m-%d").date().isoformat()
		except ValueError:
			pass

		# Slash-separated
		m = re.match(r"(\d{1,2})/(\d{1,2})/(\d{2,4})$", val)
		if m:
			a, b, c = map(int, m.groups())
			# Decide day/month order: if first > 12 assume DD/MM
			day, month = (a, b) if a > 12 else (b, a)
			year = c + 2000 if c < 100 else c
			try:
				return _dt.date(year, month, day).isoformat()
			except ValueError:
				pass
		# Fallback
		return val

	def _set_amount(tx: dict, val: str, is_deposit: bool | None):
		"""
		Store the amount **without any sign**.
		`is_deposit` decides the type; when it is None we keep whatever type
		may have been set earlier or default to “deposit”.
		"""
		raw   = val.strip()
		clean = _norm_amount(raw.lstrip("+-"))      # remove any explicit sign

		tx["amount"] = clean                        # <- ABSOLUTE value

		if is_deposit is True:
			tx["type"] = "Deposit"
		elif is_deposit is False:
			tx["type"] = "Withdrawal"
		else:
			# Fallback: decide from the original sign if present, else keep previous
			if "type" not in tx:
				tx["type"] = "withdrawal" if raw.startswith("-") else "deposit"

	def _add_tx(tx: dict):
		"""
		Add the transaction if it has an amount.  If some optional fields
		are missing, insert empty strings so the caller always receives the
		same four keys.
		"""
		if not tx.get("amount"):
			return

		# Provide default placeholders
		tx.setdefault("description", "")
		tx.setdefault("date",     last_date or "")
		# If type still missing default to deposit
		tx.setdefault("type", "Deposit")

		transactions.append(tx)

	last_date: str | None = None

	# -------- 1. semantic `table_item` entities --------
	for entity in document.entities:
		if entity.type_ != "table_item":
			continue

		tx: dict[str, str] = {}
		for prop in entity.properties:
			p_type = prop.type_
			text   = (prop.mention_text or "").strip()
			if not text:
				continue

			if p_type in {"transaction_deposit", "credit", "transaction_credit"}:
				_set_amount(tx, text, True)
			elif p_type in {"transaction_withdrawal", "debit", "transaction_debit"}:
				_set_amount(tx, text, False)
			elif p_type in {
				"transaction_deposit_date",
				"transaction_withdrawal_date",
				"transaction_date",
				"date",
			}:
				tx["date"] = _norm_date(text)
			elif p_type in {
				"transaction_deposit_description",
				"transaction_withdrawal_description",
				"transaction_description",
				"description",
				"text",
				"particulars",
			}:
				tx["description"] = f'{tx.get("description", "")} {text}'.strip()
			else:
				if "amount" in p_type and "amount" not in tx:
					_set_amount(tx, text, None)
				if "date" in p_type and "date" not in tx:
					tx["date"] = text
				if "description" in p_type and "description" not in tx:
					tx["description"] = text

		if "date" not in tx and last_date:
			tx["date"] = last_date
		if "date" in tx:
			last_date = tx["date"]

		_add_tx(tx)

	# ------------------------------------------------------------
	# helper: look up a row we already collected (date + amount key)
	# ------------------------------------------------------------
	def _find_existing(date: str | None, amount: str | None) -> dict | None:
		if not (date and amount):
			return None
		for t in transactions:
			if t.get("date") == date and t.get("amount") == amount:
				return t
		return None

	# -------- 2. fallback – raw page tables (merge into existing) --------
	def _txt(layout):
		if not (layout and layout.text_anchor):
			return ""
		return "".join(
			document.text[s.start_index : s.end_index] for s in layout.text_anchor.text_segments
		).strip()

	for page in document.pages:
		for table in page.tables:
			if not table.body_rows:
				continue

			header_cells = table.header_rows[0].cells if table.header_rows else []
			headers = [_txt(c.layout).lower() for c in header_cells]

			for row in table.body_rows:
				cells = [_txt(c.layout) for c in row.cells]
				if len(cells) != len(headers):
					continue
				r = dict(zip(headers, cells))

				raw_date = r.get("date") or r.get("transaction date") or last_date
				tx = {
					"date": _norm_date(raw_date) if raw_date else "",
					"description": r.get("description") or r.get("particulars"),
				}
				credit = r.get("credit") or r.get("deposit")
				debit  = r.get("debit") or r.get("withdrawal")
				amount = r.get("amount")

				if credit:
					_set_amount(tx, credit, True)
				elif debit:
					_set_amount(tx, debit, False)
				elif amount:
					_set_amount(tx, amount, None)

				# ------------------------------------------------
				# merge with semantic row if it exists
				# ------------------------------------------------
				existing = _find_existing(tx.get("date"), tx.get("amount"))
				if existing:
					# copy description if missing
					if not existing.get("description") and tx.get("description"):
						existing["description"] = tx["description"]
				else:
					_add_tx(tx)

	return transactions