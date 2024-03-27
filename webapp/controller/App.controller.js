sap.ui.define([
	"sap/ui/core/Messaging",
	"sap/ui/core/mvc/Controller",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/ui/model/Sorter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/FilterType",
	"sap/ui/model/json/JSONModel"
], function (Messaging, Controller, MessageToast, MessageBox, Sorter, Filter, FilterOperator,
	FilterType, JSONModel) {
	"use strict";

	return Controller.extend("sap.ui.core.tutorial.odatav4.controller.App", {

		/**
		 *  Hook for initializing the controller
		 */
		onInit : function () {
			var oMessageManager = sap.ui.getCore().getMessageManager(),
				oMessageModel = oMessageManager.getMessageModel(),
				oMessageModelBinding = oMessageModel.bindList("/", undefined, [],
					new Filter("technical", FilterOperator.EQ, true)),
				oViewModel = new JSONModel({
					busy : false,
					hasUIChanges : false,
					usernameEmpty : false,
					order : 0
				});
			this.getView().setModel(oViewModel, "appView");
			this.getView().setModel(oMessageModel, "message");

			oMessageModelBinding.attachChange(this.onMessageBindingChange, this);
			this._bTechnicalErrors = false;
},
onCreate : function () {
	var oList = this.byId("productList"),
		oBinding = oList.getBinding("items"),
		oContext = oBinding.create({
			"product_id" : "",
			"product_name" : "",
			"product_img" : "",
			"product_cost" : 200,
			"product_sell" : 100
		});

	this._setUIChanges();
	this.getView().getModel("appView").setProperty("/usernameEmpty", true);

	oList.getItems().some(function (oItem) {
		if (oItem.getBindingContext() === oContext) {
			oItem.focus();
			oItem.setSelected(true);
			return true;
		}
	});
},
onDelete : function () {
	var oContext,
		oSelected = this.byId("productList").getSelectedItem(),
		productName;

	if (oSelected) {
		oContext = oSelected.getBindingContext();
		productName = oContext.getProperty("product_id");
		oContext.delete().then(function () {
			MessageToast.show(this._getText("deletionSuccessMessage", productName));
		}.bind(this), function (oError) {
			this._setUIChanges();
			if (oError.canceled) {
				MessageToast.show(this._getText("deletionRestoredMessage", productName));
				return;
			}
			MessageBox.error(oError.message + ": " + productName);
		}.bind(this));
		this._setUIChanges(true);
	}
},

onInputChange : function (oEvt) {
	if (oEvt.getParameter("escPressed")) {
		this._setUIChanges();
	} else {
		this._setUIChanges(true);
		if (oEvt.getSource().getParent().getBindingContext().getProperty("product_id")) {
			this.getView().getModel("appView").setProperty("/usernameEmpty", false);
		}
	}
},

		/* =========================================================== */
		/*           begin: event handlers                             */
		/* =========================================================== */

		/**
		 * Refresh the data.
		 */
		onRefresh : function () {
			var oBinding = this.byId("productList").getBinding("items");

			if (oBinding.hasPendingChanges()) {
				MessageBox.error(this._getText("refreshNotPossibleMessage"));
				return;
			}
			oBinding.refresh();
			MessageToast.show(this._getText("refreshSuccessMessage"));
		},
		onResetChanges : function () {
			this.byId("peopleList").getBinding("items").resetChanges();
			this._bTechnicalErrors = false; 
			this._setUIChanges();
		},
		onSave : function () {
			var fnSuccess = function () {
				this._setBusy(false);
				MessageToast.show(this._getText("changesSentMessage"));
				this._setUIChanges(false);
			}.bind(this);

			var fnError = function (oError) {
				this._setBusy(false);
				this._setUIChanges(false);
				MessageBox.error(oError.message);
			}.bind(this);

			this._setBusy(true); // Lock UI until submitBatch is resolved.
			this.getView().getModel().submitBatch("productGroup").then(fnSuccess, fnError);
			this._bTechnicalErrors = false; // If there were technical errors, a new save resets them.
		},
		onMessageBindingChange : function (oEvent) {
			var aContexts = oEvent.getSource().getContexts(),
				aMessages,
				bMessageOpen = false;

			if (bMessageOpen || !aContexts.length) {
				return;
			}

			// Extract and remove the technical messages
			aMessages = aContexts.map(function (oContext) {
				return oContext.getObject();
			});
			sap.ui.getCore().getMessageManager().removeMessages(aMessages);

			this._setUIChanges(true);
			this._bTechnicalErrors = true;
			MessageBox.error(aMessages[0].message, {
				id : "serviceErrorMessageBox",
				onClose : function () {
					bMessageOpen = false;
				}
			});

			bMessageOpen = true;
		},
		/* =========================================================== */
		/*           end: event handlers                               */
		/* =========================================================== */

		/**
		 * Convenience method for retrieving a translatable text.
		 * @param {string} sTextId - the ID of the text to be retrieved.
		 * @param {Array} [aArgs] - optional array of texts for placeholders.
		 * @returns {string} the text belonging to the given ID.
		 */
		_getText : function (sTextId, aArgs) {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle()
				.getText(sTextId, aArgs);
		},
		_setUIChanges : function (bHasUIChanges) {
			if (this._bTechnicalErrors) {
				// If there is currently a technical error, then force 'true'.
				bHasUIChanges = true;
			} else if (bHasUIChanges === undefined) {
				bHasUIChanges = this.getView().getModel().hasPendingChanges();
			}
			var oModel = this.getView().getModel("appView");
			oModel.setProperty("/hasUIChanges", bHasUIChanges);
		},
		_setBusy : function (bIsBusy) {
			var oModel = this.getView().getModel("appView");
			oModel.setProperty("/busy", bIsBusy);
		}
	});
});