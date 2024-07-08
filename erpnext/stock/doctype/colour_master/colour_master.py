# Copyright (c) 2024, Frappe Technologies Pvt. Ltd. and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class ColourMaster(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from erpnext.stock.doctype.color_chart.color_chart import ColorChart
		from frappe.types import DF

		colour_chart: DF.Table[ColorChart]
		colour_code: DF.Data
		description: DF.Data
	# end: auto-generated types
	pass