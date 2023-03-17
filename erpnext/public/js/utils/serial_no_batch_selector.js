erpnext.SerialNoBatchBundleUpdate = class SerialNoBatchBundleUpdate {
	constructor(frm, item, callback) {
		this.frm = frm;
		this.item = item;
		this.qty = item.qty;
		this.callback = callback;
		this.bundle = this.item?.is_rejected ?
			this.item.rejected_serial_and_batch_bundle : this.item.serial_and_batch_bundle;

		this.make();
		this.render_data();
	}

	make() {
		let label = this.item?.has_serial_no ? __('Serial No') : __('Batch No');
		let primary_label = this.bundle
			? __('Update') : __('Add');

		if (this.item?.has_serial_no && this.item?.batch_no) {
			label = __('Serial No / Batch No');
		}

		primary_label += ' ' + label;

		this.dialog = new frappe.ui.Dialog({
			title: this.item?.title || primary_label,
			fields: this.get_dialog_fields(),
			primary_action_label: primary_label,
			primary_action: () => this.update_ledgers()
		});

		if (this.item?.outward) {
			this.prepare_for_auto_fetch();
		}

		this.dialog.show();
	}

	get_serial_no_filters() {
		let warehouse = this.item?.outward ?
			(this.item.warehouse || this.item.s_warehouse) : "";

		return {
			'item_code': this.item.item_code,
			'warehouse': ["=", warehouse]
		};
	}

	get_dialog_fields() {
		let fields = [];

		if (this.item.has_serial_no) {
			fields.push({
				fieldtype: 'Link',
				fieldname: 'scan_serial_no',
				label: __('Scan Serial No'),
				options: 'Serial No',
				get_query: () => {
					return {
						filters: this.get_serial_no_filters()
					};
				},
				onchange: () => this.update_serial_batch_no()
			});
		}

		if (this.item.has_batch_no && this.item.has_serial_no) {
			fields.push({
				fieldtype: 'Column Break',
			});
		}

		if (this.item.has_batch_no) {
			fields.push({
				fieldtype: 'Link',
				fieldname: 'scan_batch_no',
				label: __('Scan Batch No'),
				options: 'Batch',
				onchange: () => this.update_serial_batch_no()
			});
		}

		if (this.frm.doc.doctype === 'Stock Entry'
			&& this.frm.doc.purpose === 'Manufacture') {
			fields.push({
				fieldtype: 'Column Break',
			});

			fields.push({
				fieldtype: 'Link',
				fieldname: 'work_order',
				label: __('For Work Order'),
				options: 'Work Order',
				read_only: 1,
				default: this.frm.doc.work_order,
			});
		}

		if (this.item?.outward) {
			fields = [...fields, ...this.get_filter_fields()];
		}

		fields.push({
			fieldtype: 'Section Break',
		});

		fields.push({
			fieldname: 'ledgers',
			fieldtype: 'Table',
			allow_bulk_edit: true,
			data: [],
			fields: this.get_dialog_table_fields(),
		});

		return fields;
	}

	get_filter_fields() {
		return [
			{
				fieldtype: 'Section Break',
				label: __('Auto Fetch')
			},
			{
				fieldtype: 'Float',
				fieldname: 'qty',
				default: this.item.qty || 0,
				label: __('Qty to Fetch'),
			},
			{
				fieldtype: 'Column Break',
			},
			{
				fieldtype: 'Select',
				options: ['FIFO', 'LIFO', 'Expiry'],
				default: 'FIFO',
				fieldname: 'based_on',
				label: __('Fetch Based On')
			},
			{
				fieldtype: 'Column Break',
			},
			{
				fieldtype: 'Button',
				fieldname: 'get_auto_data',
				label: __('Fetch {0}',
					[this.item?.has_serial_no ? 'Serial Nos' : 'Batch Nos']),
			},
		]

	}

	get_dialog_table_fields() {
		let fields = []

		if (this.item.has_serial_no) {
			fields.push({
				fieldtype: 'Link',
				options: 'Serial No',
				fieldname: 'serial_no',
				label: __('Serial No'),
				in_list_view: 1,
				get_query: () => {
					return {
						filters: this.get_serial_no_filters()
					}
				}
			})
		}

		let batch_fields = []
		if (this.item.has_batch_no) {
			batch_fields = [
				{
					fieldtype: 'Link',
					options: 'Batch',
					fieldname: 'batch_no',
					label: __('Batch No'),
					in_list_view: 1,
				}
			]

			if (!this.item.has_serial_no) {
				batch_fields.push({
					fieldtype: 'Float',
					fieldname: 'qty',
					label: __('Quantity'),
					in_list_view: 1,
				})
			}
		}

		fields = [...fields, ...batch_fields];

		fields.push({
			fieldtype: 'Data',
			fieldname: 'name',
			label: __('Name'),
			hidden: 1,
		});

		return fields;
	}

	prepare_for_auto_fetch() {
		this.dialog.fields_dict.get_auto_data.$input.on('click', () => {
			this.get_auto_data();
		});
	}

	get_auto_data() {
		const { qty, based_on } = this.dialog.get_values();

		if (!qty) {
			frappe.throw(__('Please enter Qty to Fetch'));
		}

		frappe.call({
			method: 'erpnext.stock.doctype.serial_and_batch_bundle.serial_and_batch_bundle.get_auto_data',
			args: {
				item_code: this.item.item_code,
				warehouse: this.item.warehouse || this.item.s_warehouse,
				has_serial_no: this.item.has_serial_no,
				has_batch_no: this.item.has_batch_no,
				qty: qty,
				based_on: based_on
			},
			callback: (r) => {
				debugger
				if (r.message) {
					this.dialog.fields_dict.ledgers.df.data = r.message;
					this.dialog.fields_dict.ledgers.grid.refresh();
				}
			}
		});
	}

	update_serial_batch_no() {
		const { scan_serial_no, scan_batch_no } = this.dialog.get_values();

		if (scan_serial_no) {
			this.dialog.fields_dict.ledgers.df.data.push({
				serial_no: scan_serial_no
			});

			this.dialog.fields_dict.scan_serial_no.set_value('');
		} else if (scan_batch_no) {
			this.dialog.fields_dict.ledgers.df.data.push({
				batch_no: scan_batch_no
			});

			this.dialog.fields_dict.scan_batch_no.set_value('');
		}

		this.dialog.fields_dict.ledgers.grid.refresh();
	}

	update_ledgers() {
		if (!this.frm.is_new()) {
			let ledgers = this.dialog.get_values().ledgers;

			if (ledgers && !ledgers.length || !ledgers) {
				frappe.throw(__('Please add atleast one Serial No / Batch No'));
			}

			frappe.call({
				method: 'erpnext.stock.doctype.serial_and_batch_bundle.serial_and_batch_bundle.add_serial_batch_ledgers',
				args: {
					ledgers: ledgers,
					child_row: this.item,
					doc: this.frm.doc,
				}
			}).then(r => {
				this.callback && this.callback(r.message);
				this.dialog.hide();
			})
		} else {
			frappe.msgprint(__('Please save the document first'));
		}
	}

	render_data() {
		if (!this.frm.is_new() && this.bundle) {
			frappe.call({
				method: 'erpnext.stock.doctype.serial_and_batch_bundle.serial_and_batch_bundle.get_serial_batch_ledgers',
				args: {
					item_code: this.item.item_code,
					name: this.bundle,
					voucher_no: this.item.parent,
				}
			}).then(r => {
				if (r.message) {
					this.set_data(r.message);
				}
			})
		}
	}

	set_data(data) {
		data.forEach(d => {
			this.dialog.fields_dict.ledgers.df.data.push(d);
		});

		this.dialog.fields_dict.ledgers.grid.refresh();
	}
}