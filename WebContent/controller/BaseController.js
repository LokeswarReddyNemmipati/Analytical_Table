sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/Table",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox",
	"sap/ui/core/XMLTemplateProcessor",
	"sap/ui/core/util/XMLPreprocessor",
	'sap/ui/core/Element',
	"sap/m/MessageToast",
	"sap/ui/comp/smartfield/SmartField",
	'sap/ui/comp/odata/ODataType',
	'sap/ui/comp/odata/MetadataAnalyser',
	'sap/ui/comp/util/FormatUtil',
	"sap/ui/core/Component",
	"zvui/work/control/SmartDecimalField",
	"sap/ui/model/analytics/AnalyticalBinding"
], function (Controller, ResponsiveTable, JSONModel, MessageBox, XMLTemplateProcessor, XMLPreprocessor, Element, MessageToast, SmartField, ODataType, MetadataAnalyser, FormatUtil, Component, SmartDecimalField, AnalyticalBindingInfo) {
	"use strict";

	return Controller.extend("zvui.work.controller.BaseController", {

		removeMessages: function (oController) {
			var oMessageManager = sap.ui.getCore().getMessageManager();
			oMessageManager.removeAllMessages();
		},

		checkErrorMessageExist: function (oModel) {
			var errorMessage = false;
			_.each(oModel.mMessages, function (errors) {
				if (_.findWhere(errors, { type: "Error" })) {
					errorMessage = true;
				}
			});
			//			if(!errorMessage){
			//				if(sap.ui.getCore().getMessageManager().getMessageModel().oData.length > 0){
			//					if(_.findWhere(sap.ui.getCore().getMessageManager().getMessageModel().oData,{type: "Error"})){
			//						errorMessage = true;
			//					}
			//				}
			//			}
			return errorMessage;
		},

		fnPropertyChanged: function (oEvent) {
			var oController = this;
			var oContext = oEvent.getParameter("context");
			var oViewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var entityName = oEvent.getParameter("context").getPath().split("(")[0].slice(1);
			var changedPath = oEvent.getParameter("context").getPath();
			oController.removeMessages(oController);
			//			var route = oViewModel.getProperty("/currentRoute");
			//			var currentView = oContext.getPath().split("(")[0].replace(/x/g,"/");
			//			currentView = currentView.substr(1,currentView.length-1);
			//			var currentViewDetails = _.find(NavigationTreeData,{cdsvw : currentView});
			//			var viewPosition;
			//			if(currentViewDetails)
			//			viewPosition = parseInt(currentViewDetails.contr) - 1;
			// for parameters of function imports special paths are introduced
			// in the model, that are not known in the metamodel
			// as we don't need a merge call for changes to these properties, we
			// can just ignore them

			if (oEvent.getParameter("path") == "thldp")
				return;

			var onSkipFiledChange = oViewModel.getProperty("/skipFiledChange");
			if (!onSkipFiledChange) {
				if (!oMetaModel.getODataEntitySet(oContext.getPath().split("(")[0].substring(1))) {
					return;
				}

				oController.removeTransientMessages();
				sap.ui.core.BusyIndicator.show(0);

				oViewModel.setProperty("/modelChanged", true);
				// confirmation popup changes nav from launchpad
				if (parent && parent.commonUtils && parent.commonUtils.dataChanged) {
					parent.commonUtils.dataChanged = true;
				}
				// confirmation popup changes nav from launchpad

				if (oViewModel.getProperty("/currentRoute") == 'Detail') {
					oController.noBackPlease(); // for preventing the browser
					// back
				}

				if (oEvent.getParameter("path")) {
					var entityType, entitySet;
					var entityName = oEvent.getParameter("context").getPath().split("(")[0].split("/")[1];
					if (entityName) {
						entitySet = oMetaModel.getODataEntitySet(entityName);
						entityType = oMetaModel.getODataEntityType(entitySet.entityType);
						var property = oMetaModel.getODataProperty(entityType, oEvent.getParameter("path"));
						if (property && (property["com.sap.vocabularies.Common.v1.ValueList"]
							|| property["com.sap.vocabularies.Common.v1.ValueList"]
							//						&& property["sap:value-list"] !== "fixed-values"
							&& oEvent.getParameter("value")
						)) {
							oViewModel.setProperty("/modelChanged", true);
							// confirmation popup changes nav from launchpad
							if (parent && parent.commonUtils && parent.commonUtils.dataChanged) {
								parent.commonUtils.dataChanged = true;
							}
							// confirmation popup changes nav from launchpad
							sap.ui.core.BusyIndicator.hide();
							return;
						}
					}
				}
				if (oViewModel.getProperty("/currentRoute") == 'Detail' ||
					(oViewModel.getProperty("/currentRoute") == 'DetailDetail')) {
					oController.noBackPlease(); // for preventing the
					// browser back
				}
				oModel.submitChanges({
					batchGroupId: "changes",
					success: function (oData, response) {
						sap.ui.core.BusyIndicator.hide();
						oController.showMessagePopover(oController.messageButtonId);
						oController.optimizedUpdateCalls(entityName, changedPath);
						//						oModel.refresh();
					},
					error: function (data, response) {
						oController.showMessagePopover(oController.messageButtonId);
						sap.ui.core.BusyIndicator.hide();
					}
				});
			}
		},
		onBatchRequestFailed: function (oEvent) {
			var oController = this;
			var viewModel = this.getView().getModel("viewModel");
			var oModel = this.getView().getModel();
			var bundle = oController.getOwnerComponent().getModel("i18n").getResourceBundle();
			sap.ui.core.BusyIndicator.hide();
			MessageBox.error(bundle.getText('REQUESTFAILED'), {
				onClose: function (oAction) {
					history.go(-1);
				}
			});
		},
		submitChangesForSmartMultiInput: function (oEvent) {
			var oController = this;
			var oModel = this.getView().getModel();
			sap.ui.core.BusyIndicator.show(0);

			var oViewModel = oController.getView().getModel("viewModel");
			oViewModel.setProperty("/modelChanged", true);
			// confirmation popup changes nav from launchpad
			if (parent && parent.commonUtils && parent.commonUtils.dataChanged) {
				parent.commonUtils.dataChanged = true;
			}
			// confirmation popup changes nav from launchpad

			oModel.submitChanges({
				batchGroupId: "changes",
				success: function (data, resonse) {
					oController.showMessagePopover(oController.messageButtonId);
					sap.ui.core.BusyIndicator.hide();
					oModel.refresh();
				},
				error: function (data, response) {
					oController.showMessagePopover(oController.messageButtonId);
					sap.ui.core.BusyIndicator.hide();
				}
			});
		},

		showMessagePopover: function (buttonId) {
			var oController = this;
			var messageModel = oController.getOwnerComponent().getModel("message");
			var messageData = messageModel.getData();
			var messageCount = messageData.length;
			if (messageCount == 1 && messageData && messageData[0] && messageData[0].type &&
				(messageData[0].type == "Success" || messageData[0].type == "Information")) {
				var myMessage = messageData[0].message;
				MessageToast.show(myMessage, { duration: 5000, width: "30em" });
				oController.removeMessages(oController);
			} else {
				var button = oController.getView().byId(buttonId);
				if (button)
					oController._getMessagePopover().openBy(button);
			}
		},

		onMessagePopover: function (oEvent) {
			this._getMessagePopover().toggle(oEvent.getSource());
		},

		// ################ Private APIs ###################

		_getMessagePopover: function () {
			var oController = this;
			// create popover lazily
			if (!this._oMessagePopover) {
				this._oMessagePopover = new sap.m.MessagePopover({
					activeTitlePress: function (oEvent) {
						var oItem = oEvent.getParameter("item"),
							oPage = oController.getView().getParent(),
							oMessage = oItem.getBindingContext("message").getObject(),
							//						oControl = Element.registry.get(oMessage.getControlId());
							oControl = sap.ui.getCore().byId(oMessage.getControlId());
						if (oControl) {
							oPage.scrollToElement(oControl.getDomRef(), 200, [0, -100]);
							setTimeout(function () {
								oControl.focus();
							}, 300);
						} else {
							oController.navigateToRow(oMessage, oPage);
						}
					},
					items: {
						path: "message>/",
						template: new sap.m.MessagePopoverItem({
							description: "{message>description}",
							type: "{message>type}",
							title: "{message>message}",
							subtitle: "{message>additionalText}",
							activeTitle: { parts: [{ path: 'message>target' }], formatter: oController.isPositionable },
						})
					}
				});
				this.getView().addDependent(this._oMessagePopover);
			}
			return this._oMessagePopover;
		},

		isPositionable: function (sTarget) {
			// Such a hook can be used by the application to determine if a
			// control can be found/reached on the page and navigated to.
			return sTarget ? true : false
		},

		navigateToRow: function (oMessage, oPage) {
			var oController = this;

			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();

			var row_id, entitySet, sTarget = oMessage.getTarget();
			if (!sTarget)
				return;

			if (sTarget != "") {
				var entitySet = sTarget.substring(sTarget.indexOf('/') + 1, sTarget.indexOf('('));

				sTarget = sTarget.substring(sTarget.indexOf('(') + 1, sTarget.indexOf(')'));
				var aKeys = sTarget.split(',');

				for (var j = 0; j < aKeys.length; j++) {
					var aKeyValue = aKeys[j].split('=');
					if (aKeyValue[0] == 'row_id') {
						row_id = aKeyValue[1];
						row_id = row_id.substring(row_id.indexOf("'") + 1, row_id.lastIndexOf("'"));
						break;
					}
				}
			}

			var aSections;
			var oSmartTable, oSmartForm;
			var oObjectPageLayout = oPage.getContent()[0];
			while (true) {
				if (oObjectPageLayout.getSections) {
					aSections = oObjectPageLayout.getSections();
					break;
				} else {
					oObjectPageLayout = oObjectPageLayout.getContent()[0];
				}
			}

			for (var i = 0; i < aSections.length; i++) {
				var aSubSections = aSections[i].getSubSections();
				for (var j = 0; j < aSubSections.length; j++) {
					var oBlock = aSubSections[j].getBlocks()[0];
					var aContent = oBlock.getContent();

					for (var z = 0; z < aContent.length; z++) {
						var oControl = aContent[z];
						if (oController.isSmartTable(oControl)) {
							if (entitySet == oControl.getEntitySet()) {
								if (oObjectPageLayout.getSelectedSection != aSections[i].getId()) {
									oObjectPageLayout.setSelectedSection(aSections[i]);
								}
								if (aSections[i].getSelectedSubSection != aSubSections[j].getId()) {
									aSections[i].setSelectedSubSection(aSubSections[j]);
								}
								oSmartTable = oControl;
								break;
							}
						} else if (oController.isSmartForm(oControl)) {
							if (entitySet + "Type" == oControl.getEntityType()) {
								if (oObjectPageLayout.getSelectedSection != aSections[i].getId()) {
									oObjectPageLayout.setSelectedSection(aSections[i]);
								}
								if (aSections[i].getSelectedSubSection != aSubSections[j].getId()) {
									aSections[i].setSelectedSubSection(aSubSections[j]);
								}
								oSmartForm = oControl;
								break;
							}
						}
					}
					if (oSmartTable)
						break;
					if (oSmartForm)
						break;
				}
				if (oSmartTable)
					break;
				if (oSmartForm)
					break;
			}

			if (!oSmartTable)
				return;

			var functionImport = oMetaModel.getODataFunctionImport('GET_INDEX');
			if (!functionImport)
				return;

			var urlParameters = {};
			urlParameters["_row_id"] = row_id;
			urlParameters['entst'] = entitySet;

			sap.ui.core.BusyIndicator.show(0);

			oModel.callFunction("/" + functionImport.name, {
				method: "POST",
				batchGroupId: "changes",
				urlParameters: urlParameters
			});
			oModel.submitChanges({
				batchGroupId: "changes",
				success: function (oData, response) {
					oController.showMessagePopover(oController.messageButtonId);
					var index = 0;
					if (oData && oData.__batchResponses && oData.__batchResponses.length > 0) {
						for (var i = 0; i < oData.__batchResponses.length; i++) {
							if (oData.__batchResponses[i].__changeResponses && oData.__batchResponses[i].__changeResponses.length) {
								for (var j = 0; j < oData.__batchResponses[i].__changeResponses.length; j++) {
									if (oData.__batchResponses[i].__changeResponses[j].data) {
										index = oData.__batchResponses[i].__changeResponses[j].data.index;
										break;
									}
								}
							}
							if (index > 0)
								break;
						}
						if (index > 0) {
							if (oController.isUiTable(oSmartTable.getTable())) {
								oSmartTable.getTable().setFirstVisibleRow(index - 1);
							}
						}
					}
					sap.ui.core.BusyIndicator.hide();
				},
				error: function (oData, response) {
					oController.showMessagePopover(oController.messageButtonId);
					if (oData.responseText) {
						var messageDetails = JSON.parse(oData.responseText);
						if (messageDetails.error.innererror.errordetails.length > 0) {
							oController.prepareMessageDialog(messageDetails.error.innererror.errordetails, oController);
						}
					}
					sap.ui.core.BusyIndicator.hide();
				}
			});
		},

		fnGetTransientMessages: function (oResponse) {
			var aTransientMessages = [], oMessage;
			var oMessageManager = sap.ui.getCore().getMessageManager();
			var aMessages = oMessageManager.getMessageModel().getData();

			for (var i = 0; i < aMessages.length; i++) {
				oMessage = aMessages[i];
				if (oMessage.getPersistent()) {
					aTransientMessages.push(oMessage);
				}
			}
			// in future we want to return only the transient messages that are
			// returned by the given response
			// this does not work yet due to missing core functionality
			// TODO noop code (function() {})(oResponse);

			return aTransientMessages;
		},

		removeTransientMessages: function () {
			var oController = this;
			var oMessageManager = sap.ui.getCore().getMessageManager();
			var aTransientMessages = oController.fnGetTransientMessages();

			if (aTransientMessages.length > 0) {
				oMessageManager.removeMessages(aTransientMessages);
			}
		},

		prepareMessageDialog: function (errorMessages, oController) {
			var messagesData = oController.getView().getModel("message").getData();
			var messageView = new sap.m.MessageView();
			oController.errorDialog = new sap.m.Dialog({
				endButton: new sap.m.Button({
					text: "{i18n>CLOSE}",
					press: function (oEvent) {
						//						oController.errorDialog.close();
						oEvent.getSource().getParent().close();
					}
				}),
				content: messageView,
				contentHeight: "200px",
				contentWidth: "500px",
				customHeader: new sap.m.Bar({
					contentMiddle: [
						new sap.m.Text({ text: "Message" })
					]
				}),
				state: 'Error',
				resizable: true,
				verticalScrolling: false
			});
			if (errorMessages) {
				_.each(errorMessages, function (error) {
					if (error.severity == "error") {
						messageView.addItem(new sap.m.MessageItem({ type: "Error", title: error.message }));
					} else if (error.severity == "success") {
						messageView.addItem(new sap.m.MessageItem({ type: "Success", title: error.message }));
					} else if (error.severity == "info") {
						messageView.addItem(new sap.m.MessageItem({ type: "Information", title: error.message }));
					} else {
						messageView.addItem(new sap.m.MessageItem({ type: "Warning", title: error.message }));
					}
				});
			} else {
				_.each(messagesData, function (error) {
					messageView.addItem(new sap.m.MessageItem({ type: error.type, title: error.message }));
				});
			}
			oController.errorDialog.addContent(messageView);
			oController.getView().addDependent(oController.errorDialog);
			oController.errorDialog.open();
			oController.removeTransientMessages();
		},

		onSearchObjectPage: function (oEvent) {
			var oTable = oController.getOwnerControl(oEventSource);
			oTable = oController.isSmartTable(oTable) ? oTable : oTable.getParent();
			oTable.rebindTable();
		},

		onDataReceived: function (oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var viewModel = oController.getOwnerComponent().getModel("viewModel");
			var oMetaModel = oModel.getMetaModel();
			var oSmartTable = oEvent.getSource();
			//VHD#740535->Error as Workspace encountered internal server error on cal run post - Start
			var count;
			if (oSmartTable.getTable() instanceof sap.m.Table) {
				count = oSmartTable.getTable().getMaxItemsCount();
			} else if (oSmartTable.getTable() instanceof sap.ui.table.Table) {
				count = oSmartTable.getTable().getBinding("rows").getLength();
			}
			//VHD#740535->Error as Workspace encountered internal server error on cal run post - End

			// no data changes
			// if(count>0) {
			// 	oSmartTable.getTable().setShowNoData(false);
			// } else {
			// 	oSmartTable.getTable().setShowNoData(true);
			// }
			// no data changes
			var text = oSmartTable.getHeader();
			//			var oBindingInfo = oController.getTableBindingInfo(oSmartTable.getTable());
			//			if(oBindingInfo.binding && oBindingInfo.binding.getLength)
			//			count = oBindingInfo.binding.getLength();			

			if (oSmartTable._getTablePersonalisationData && oSmartTable._getTablePersonalisationData() && oSmartTable._getTablePersonalisationData().sorters) {
				var groupBy = oSmartTable._getTablePersonalisationData().sorters.find(function (obj) { return obj.vGroup });
				if (groupBy && oSmartTable.getTable().getColumns && oSmartTable.getTable().getColumns().length > 0) {
					for (var i = 0; i < oSmartTable.getTable().getColumns().length; i++) {
						if (oSmartTable.getTable().getColumns()[i].data().p13nData.sortProperty == groupBy.sPath) {
							oSmartTable.getTable().getColumns()[i].setVisible(false);
							break;
						}
					}
				}
			}

			var oSubSection = oSmartTable.getParent();
			while (true) {
				if (oSubSection instanceof sap.uxap.ObjectPageSubSection)
					break;
				else
					oSubSection = oSubSection.getParent();
			}
			if (oSubSection.data("Label")) {
				var title = oSubSection.data("Label");
			} else {
				var title = text.split("(")[0];
			}
			if (oSmartTable.getTable() instanceof sap.ui.table.TreeTable) {
				//Triggering metadata request
				if (viewModel.getProperty("/showDetailDetail")) {
					title = viewModel.getProperty("/breadCrumbCurrentText_" + oSmartTable.getEntitySet());
				}
				//Triggering metadata request
				if (count > 0 && oEvent.getParameter("mParameters") && oEvent.getParameter("mParameters").data) {
					if (oEvent.getParameter("mParameters").data.__count == count) {
						oSmartTable.setHeader(title + " (" + count + ")");
					}
				} else {
					oSmartTable.setHeader(title);
				}
			} else if (oSmartTable.getTable() instanceof sap.ui.table.Table) {
				//Triggering metadata request
				if (viewModel.getProperty("/showDetailDetail")) {
					title = viewModel.getProperty("/breadCrumbCurrentText_" + oSmartTable.getEntitySet());
				}
				//Triggering metadata request
				if (count > 0) {
					if (oEvent.getParameter("mParameters") && oEvent.getParameter("mParameters").data &&
						oEvent.getParameter("mParameters").data.__count) {
						count = oEvent.getParameter("mParameters").data.__count;
						oSmartTable.setHeader(title + " (" + count + ")");
					} else {
						oSmartTable.setHeader(title + " (" + count + ")");
					}
				} else {
					oSmartTable.setHeader(title);
				}
			} else {
				//Triggering metadata request
				if (viewModel.getProperty("/showDetailDetail")) {
					title = viewModel.getProperty("/breadCrumbCurrentText_" + oSmartTable.getEntitySet());
				}
				//Triggering metadata request
				if (count > 0) {
					//					oSubSection.setTitle(title + " (" + count + ")");
					oSmartTable.setHeader(title + " (" + count + ")");
				} else {
					//					oSubSection.setTitle(title);
					oSmartTable.setHeader(title);
				}
			}

			viewModel.setProperty("/skipHideBusyIndicatorOnBatchComplete", false);
			if (oController.isUiTable(oSmartTable.getTable()) && oSmartTable.getCurrentVariantId() == "") {
				var section = oSmartTable.getParent();
				while (true) {
					if (section instanceof sap.uxap.ObjectPageSection)
						break;
					else
						section = section.getParent();
				}

				var typeChanged = oSmartTable.data("TypeChanged");
				if (typeChanged)
					oSmartTable.data("TypeChanged", false);
				//				if ((section.getParent().getSections()[0] === section || typeChanged) && oSmartTable._getRowCount() > 0) {
				// VHD#740535->Error as Workspace encountered internal server error on cal run post
				if (count > 0 && oSubSection && oSubSection.getParent().getParent().getSelectedSection() == oSubSection.getParent().getId()) {
					var flag = oSmartTable.data("optimized");
					if (!flag) {
						//						sap.ui.core.BusyIndicator.show(0);
						setTimeout(function () {
							//							sap.ui.core.BusyIndicator.show(0);
							oController.optimizeSmartTable(oSmartTable);
							setTimeout(function () {
								oSmartTable.getTable()._getScrollExtension().getHorizontalScrollbar().scrollLeft = 0;
							});
							//							sap.ui.core.BusyIndicator.hide();
						}, 1000);
					} else {
						sap.ui.core.BusyIndicator.hide();
					}
				}
			}
			// changes for save not visible during reprocess even updkz flag is sent as 'U' or 'I'
			if (oSmartTable.getTable().getRows) {
				var tableRows = oSmartTable.getTable().getRows(), rowBindingPath;

				setTimeout(function () {
					for (var i = 0; i < tableRows["length"]; i++) {
						if (tableRows[i].getBindingContext()) {
							rowBindingPath = tableRows[i].getBindingContext().getPath();
							if (oModel.getProperty(rowBindingPath).updkz == "U" || oModel.getProperty(rowBindingPath).updkz == "I") {
								viewModel.setProperty("/modelChanged", true);
								// confirmation popup changes nav from launchpad
								if (parent && parent.commonUtils && parent.commonUtils.dataChanged) {
									parent.commonUtils.dataChanged = true;
								}
								// confirmation popup changes nav from launchpad
								if (viewModel.getProperty("/currentRoute") == 'Detail') {
									oController.noBackPlease(); //for preventing the browser back
								}
								break;
							}
						}
					}
				});
			}
			// end of changes for save not visible during reprocess even updkz flag is sent as 'U'



		},

		optimizeSmartTable: function (oSmartTable) {
			//VHD#740535->Error as Workspace encountered internal server error on cal run post - Start
			var count;
			if (oSmartTable.getTable() instanceof sap.m.Table) {
				count = oSmartTable.getTable().getMaxItemsCount();
			} else if (oSmartTable.getTable() instanceof sap.ui.table.Table) {
				count = oSmartTable.getTable().getBinding("rows").getLength();
			}
			//VHD#740535->Error as Workspace encountered internal server error on cal run post - End
			if (count <= 0)
				return;


			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var entitySet = oSmartTable.getEntitySet();
			var oEntitySet = oMetaModel.getODataEntitySet(entitySet);
			var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType)

			var sUpdatable = true;
			if (oEntitySet["Org.OData.Capabilities.V1.UpdateRestrictions"]
				&& oEntitySet["Org.OData.Capabilities.V1.UpdateRestrictions"].Updatable
				&& oEntitySet["Org.OData.Capabilities.V1.UpdateRestrictions"].Updatable.Bool == "false") {
				sUpdatable = false;
			}

			var oTable = oSmartTable.getTable();
			//			var oTpc = new sap.ui.table.TablePointerExtension(oTable);

			var aColumns = oTable.getColumns();
			var i = aColumns.length - 1;
			for (; i >= 0; i--) {
				if (aColumns[i].data("p13nData")) {
					var p13Data = aColumns[i].data("p13nData");
					var columnkey = p13Data.columnKey;

					if (columnkey && columnkey.indexOf("/") == -1) {

						//						if(!sUpdatable){
						//						oTpc.doAutoResizeColumn(i);

						if (oTable instanceof sap.ui.table.Table) {
							oTable.autoResizeColumn(i);
						}

						continue;
						//						}

						var object = _.findWhere(oEntityType.property, { name: columnkey });

						if (object && object['com.sap.vocabularies.UI.v1.ReadOnly']
							&& object['com.sap.vocabularies.UI.v1.ReadOnly'].Bool
							&& object['com.sap.vocabularies.UI.v1.ReadOnly'].Bool == "true") {
							//							oTpc.doAutoResizeColumn(i);
							oTable.autoResizeColumn(i);
							continue;
						}
						if (object && object['com.sap.vocabularies.Common.v1.FieldControl']
							&& object['com.sap.vocabularies.Common.v1.FieldControl'].EnumMember
							&& object['com.sap.vocabularies.Common.v1.FieldControl'].EnumMember == "com.sap.vocabularies.Common.v1.FieldControlType/ReadOnly") {
							//							oTpc.doAutoResizeColumn(i);
							oTable.autoResizeColumn(i);
							continue;
						}
						if (object.name == 'edtst') {
							//							oTpc.doAutoResizeColumn(i);
							oTable.autoResizeColumn(i);
						}
					}
				}
			}
			oSmartTable.data("optimized", true);
			setTimeout(function () {
				sap.ui.core.BusyIndicator.hide();
			}, 1000);
		},

		onTableRebind: function (oEvent) {
			var oController = this;
			var oSmartTable = oEvent.getSource();
			var viewModel = this.getOwnerComponent().getModel("viewModel");
			var oUIState = viewModel.getProperty("/UIState");
			var entitySet = oSmartTable.getEntitySet();
			//Triggering metadata request
			var oModel = this.getView().getModel();
			if (!oModel) {
				oModel = this.getOwnerComponent().getModel();
			}
			//Triggering metadata request
			var oMetaModel = oModel.getMetaModel();

			// no data changes
			// oSmartTable.getTable().setShowNoData(false);
			// no data changes

			this.changeSmartTableColumnVisibility(oSmartTable, oMetaModel, oUIState, oController.columnPosition);

			if (oSmartTable.getTable().expand) {
				oSmartTable.getTable().expand = function (oEvent) {
					sap.ui.table.AnalyticalTable.prototype.expand.apply(oSmartTable.getTable(), arguments);
				};
			}

			if (oSmartTable.getTable().attachGroup) {
				oSmartTable.getTable().attachGroup(function (oEvent) {
				});
			}
			if (oSmartTable._oTablePersonalisationButton) {
				oSmartTable._oTablePersonalisationButton.attachPress(function (oEvent) {
					var personalisationDialog = oSmartTable._oPersController._oDialog;

					personalisationDialog.data("oSmartTableId", oSmartTable.getId());

					personalisationDialog.attachOk(oController.perDialogOk, oController);
					//					personalisationDialog.attachBeforeOpen(oController.perDialogBeforeOpen,
					//					oController);
					//					personalisationDialog.attachAfterClose(oController.perDialogAfterClose,
					//					oController);

				});
			}
			oSmartTable.attachAfterVariantSave(oController.afterTableVariantSave, oController);
			var toolbarElements = oSmartTable.getToolbar().getContent();
			var searchString = null;
			for (var i = 0; i < toolbarElements.length; i++) {
				if (this.isControlOfType(toolbarElements[i], 'sap/m/SearchField')) {
					searchString = toolbarElements[i].getValue();
					break;
				}
			}
			if (searchString != null && searchString != "") {
				var bindingparams = oEvent.getParameter('bindingParams');
				bindingparams.parameters.custom = {
					search: searchString
				};
			}


			if (oController.isMTable(oSmartTable.getTable())) {
				var columns = oSmartTable.getTable().getColumns();
				for (var i = 0; i < columns.length; i++) {
					var p13nData = columns[i].data("p13nData");
					if (p13nData) {
						var columnKey = p13nData.columnKey;
						if (columnKey && columnKey.indexOf('/') != -1) {
							columns[i].setMinScreenWidth('2000px');
						}
					}
				}
			}
			//			Manual Correction Changes - started
			if (oController.isControlOfType(oSmartTable.getTable(), "sap/ui/table/TreeTable")) {
				var oBindingParams = oEvent.getParameter("bindingParams");

				//	           oBindingParams.parameters.threshold = 50000;
				oBindingParams.parameters.countMode = "Inline";
				oBindingParams.parameters.operationMode = "Server";
				//						         oBindingParams.parameters.numberOfExpandedLevels = 1;
				//		         oBindingParams.parameters.treeAnnotationProperties = {};
				//		         oBindingParams.parameters.treeAnnotationProperties.hierarchyLevelFor = "_level";
				//		         oBindingParams.parameters.treeAnnotationProperties.hierarchyParentNodeFor = "rowid_h";
				//		         oBindingParams.parameters.treeAnnotationProperties.hierarchyNodeFor = "row_id";
				//		         oBindingParams.parameters.treeAnnotationProperties.hierarchyDrillStateFor = "drilldown_state";
			}
			//			Manual Correction Changes - ended
			// for descriptions not fetching in some cases
			// if (!oEvent.getParameter("bindingParams").parameters.expand) {
			// 	var queryParams = oController.readQueryPrepare(oSmartTable.getEntitySet());
			// 	if (queryParams.$expand)
			// 		oEvent.getParameter("bindingParams").parameters.expand = queryParams.$expand;
			// 	if (queryParams.$select)
			// 		oEvent.getParameter("bindingParams").parameters.select = queryParams.$select;
			// }
			var oBindingParams = oEvent.getParameter("bindingParams");
			if(oBindingParams && oBindingParams.parameters && oBindingParams.parameters.select){
			var oEntitySet = oMetaModel.getODataEntitySet(entitySet);
			var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
			var fields = zvui.work.controller.AnnotationHelper.getRequestAtLeastFields(oEntityType);
			if (oEntityType["com.sap.vocabularies.UI.v1.Identification"]) {
				var lineItems = oEntityType["com.sap.vocabularies.UI.v1.Identification"];
				for (var i = 0; i < lineItems.length; i++) {
					if (lineItems[i].Fields) {
						for (var j = 0; j < lineItems[i].Fields.length; j++) {
							if (lineItems[i].Fields[j].Value && lineItems[i].Fields[j].Value.Path &&
								fields.indexOf(lineItems[i].Fields[j].Value.Path) == -1) {
								var fieldTemp = zvui.work.controller.AnnotationHelper.getRequestFields(oEntityType, lineItems[i].Fields[j]);
								if (fieldTemp != "") {
									if (fields != "") {
										fields = fields + ",";
									}
									fields = fields + fieldTemp;
								}
							}
						}
					} else {
						if (lineItems[i].Value && lineItems[i].Value.Path &&
							fields.indexOf(lineItems[i].Value.Path) == -1) {
							var fieldTemp = zvui.work.controller.AnnotationHelper.getRequestFields(oEntityType, lineItems[i]);
							if (fieldTemp != "") {
								if (fields != "") {
									fields = fields + ",";
								}
								fields = fields + fieldTemp;
							}
						}
					}
				}
			}
			oBindingParams.parameters.select = fields;
			}	
			AnalyticalBindingInfo.prototype.getGroupName = function (oContext, iLevel) {
				//debugger;
				if (oContext === undefined) {
					return ""; // API robustness
				}

				var sGroupProperty = this.aAggregationLevel[iLevel - 1],
					oDimension = this.oAnalyticalQueryResult.findDimensionByPropertyName(sGroupProperty),
					// it might happen that grouped property is not contained in the UI (e.g. if grouping is
					// done with a dimension's text property)
					fValueFormatter = this.mAnalyticalInfoByProperty[sGroupProperty]
						&& this.mAnalyticalInfoByProperty[sGroupProperty].formatter,
					sPropertyValue = oContext.getProperty(sGroupProperty),
					sFormattedPropertyValue, sFormattedTextPropertyValue, sGroupName, sLabelText,
					oTextProperty, sTextProperty, sTextPropertyValue, fTextValueFormatter;

				if (oDimension && this.oDimensionDetailsSet[sGroupProperty].textPropertyName) {
					oTextProperty = oDimension.getTextProperty();
				}

				if (oTextProperty) {
					sTextProperty = oTextProperty.name;
					// it might happen that text property is not contained in the UI
					fTextValueFormatter = this.mAnalyticalInfoByProperty[sTextProperty]
						&& this.mAnalyticalInfoByProperty[sTextProperty].formatter;
					sTextPropertyValue = oContext.getProperty(sTextProperty);
					sFormattedPropertyValue = fValueFormatter
						? fValueFormatter(sPropertyValue, sTextPropertyValue) : sPropertyValue;

					sFormattedTextPropertyValue = fTextValueFormatter
						? fTextValueFormatter(sTextPropertyValue, sPropertyValue) : sTextPropertyValue;
				} else {
					sFormattedPropertyValue = fValueFormatter
						? fValueFormatter(sPropertyValue) : sPropertyValue;
				}
				sLabelText = oDimension.getLabelText && oDimension.getLabelText();
				sGroupName = (sLabelText ? sLabelText + ': ' : '') + sFormattedPropertyValue;
				if (sFormattedTextPropertyValue) {
					sGroupName += ' - ' + sFormattedTextPropertyValue;
				}

				return sGroupName;
			};
		},
		onGrouping: function (oEvent) {
			var oController = this;
			var oController = this;
			var viewModel = this.getOwnerComponent().getModel("viewModel");
			viewModel.setProperty("/groupRequestCompleted",false);
			var oUIState = viewModel.getProperty("/UIState");
			var oModel = this.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var fields = [];
			fields.push(oEvent.getParameter('column').getProperty('sortProperty'), "zquant", "zprice")
			var urlParameters = {
				//					"$select" : select.toString()
				$select: fields,
			};
			urlParameters["$skip"] = 0;
			urlParameters["$top"] = 100;
			// var urlParameters={};
			// urlParameters["fields"]=oEvent.getParameter('column').getProperty('sortProperty');
			// urlParameters= _.extend(urlParameters,"zquant,zprice");
			// setTimeout(function () {
			
					// oModel.read("/X01", {
					// 	urlParameters: urlParameters,
					// 	success: function (oData, response) {
	
					// 	},
					// })

				
				
			// });

			// oEvent.getParameter('column').setGroupHeaderFormatter(oController.groupHeaderFormatter)
		},

		perDialogOk: function (oEvent) {

		},

		afterTableVariantSave: function (oEvent) {

		},

		onSectionChange: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var section = oEvent.getParameter("section");
			var subSections = section.getSubSections();
			var dynamicSideContent = oController.getResponsiveSplitter(subSections[0].getBlocks()[0].getContent()[0]);
			oController.onClosingDscSideContent(dynamicSideContent);

			for (var j = 0; j < subSections.length; j++) {
				var oBlock = subSections[j].getBlocks()[0];
				var aContent = oBlock.getContent();
				for (var z = 0; z < aContent.length; z++) {
					var oControl = aContent[z];
					if (oController.isControlOfType(oControl, "sap/ui/layout/DynamicSideContent")) {
						var aMainContent = oControl.getMainContent();
						for (var y = 0; y < aMainContent.length; y++) {
							if (oController.isSmartTable(aMainContent[y]) && aMainContent[y].getCurrentVariantId() == "") {
								if (oController.isUiTable(aMainContent[y].getTable())) {
									var flag = aMainContent[y].data("optimized");
									//									if(!flag) { #QA6504 table not optimizing if section is changed before data loading
									var oSmartTable = aMainContent[y];
									//									sap.ui.core.BusyIndicator.show(0);
									oController.refreshSmartTable(oSmartTable);
									setTimeout(function () {
										oController.optimizeSmartTable(oSmartTable);
										setTimeout(function () {
											oSmartTable.getTable()._getScrollExtension().getHorizontalScrollbar().scrollLeft = 0;
										});
										sap.ui.core.BusyIndicator.hide();
									}, 1000);
									//									}
								}
							}
						}
					} else if (oController.isControlOfType(oControl, "sap/ui/layout/ResponsiveSplitter")) {
						var aMainContent = oControl.getRootPaneContainer().getPanes()[0].getContent().getContent()[0].getContent();
						for (var y = 0; y < aMainContent.length; y++) {
							if (oController.isSmartTable(aMainContent[y]) && aMainContent[y].getCurrentVariantId() == "") {
								if (oController.isUiTable(aMainContent[y].getTable())) {
									var flag = aMainContent[y].data("optimized");
									//									if(!flag) { #QA6504 table not optimizing if section is changed before data loading
									var oSmartTable = aMainContent[y];
									//									sap.ui.core.BusyIndicator.show(0);
									oController.refreshSmartTable(oSmartTable);
									setTimeout(function () {
										oController.optimizeSmartTable(oSmartTable);
										setTimeout(function () {
											oSmartTable.getTable()._getScrollExtension().getHorizontalScrollbar().scrollLeft = 0;
										});
										sap.ui.core.BusyIndicator.hide();
									}, 1000);
									//									}
								}
							}
						}
					} else if (oController.isSmartTable(oControl) && oControl.getCurrentVariantId() == "") {
						if (oController.isUiTable(oControl.getTable())) {
							var flag = oControl.data("optimized");
							if (!flag) {
								var oSmartTable = oControl;
								//								sap.ui.core.BusyIndicator.show(0);
								oController.refreshSmartTable(oSmartTable);
								setTimeout(function () {
									oController.optimizeSmartTable(oSmartTable);
									setTimeout(function () {
										oSmartTable.getTable()._getScrollExtension().getHorizontalScrollbar().scrollLeft = 0;
									});
									sap.ui.core.BusyIndicator.hide();
								}, 1000);
							}
						}
					}
				}
			}
		},

		addEntry: function (oEvent) {
			var oController = this;
			oController.removeTransientMessages();

			var oModel = oController.getView().getModel();
			var oEventSource = oEvent.getSource();

			var oTable = oController.getOwnerControl(oEventSource);
			oTable = oController.isSmartTable(oTable) ? oTable : oTable.getParent();

			var sTablePath = oTable.getTableBindingPath();
			var sEntitySet = oTable.getEntitySet();
			var oComponent = oController.getOwnerComponent();
			var sBindingPath = "";

			var errorMessages = oController.checkErrorMessageExist(oModel);
			if (errorMessages) {
				oController.showMessagePopover(oController.messageButtonId);
				return;
			} else {

				var oView = oController.getView();
				var oViewContext = oView.getBindingContext();
				var sTableBindingPath = "";
				var oEntityType, oEntitySet, oNavigationEnd, oMetaModel;

				if (oViewContext) {
					// Detail screen
					sTableBindingPath = oController.getTableBindingInfo(oTable).path;

					// create binding path
					sTableBindingPath = "/" + sTableBindingPath;
					sBindingPath = oViewContext.getPath() + sTableBindingPath;
				} else {
					// on list, support only one entityset mapped to the root
					// component
					sBindingPath = "/" + sEntitySet;
				}

				return new Promise(function (resolve, reject) {
					var fnSuccess = function (oData, oResponse) {
						resolve({
							responseData: oData,
							httpResponse: oResponse
						});
						oController.refreshSmartTable(oTable);
					};

					var createdContext;
					var fnError = function (oError) {
						oModel.deleteCreatedEntry(createdContext);
						reject(oError);
					};

					createdContext = oModel.createEntry(sBindingPath, {
						success: fnSuccess,
						error: fnError,
						batchGroupId: "changes"
						//							changeSetId: mParameters.changeSetId
					});

					oModel.submitChanges({
						batchGroupId: "changes"
					});
				});
			}
		},

		deleteEntry: function (oEvent) {
			var oController = this;
			oController.removeTransientMessages();

			var oModel = oController.getView().getModel();
			var oEventSource = oEvent.getSource();
			var bundle = oController.getView().getModel("i18n").getResourceBundle();
			var oTable = oController.getOwnerControl(oEventSource);

			var selectedItem = oTable.getSelectedItem();
			var aContexts = oTable.getSelectedContexts();

			MessageBox.confirm(bundle.getText('CONFIRMDELETE'), {
				title: bundle.getText('CONFIRM'),
				actions: [MessageBox.Action.YES, MessageBox.Action.NO],
				onClose: function (oAction) {
					if (oAction == 'YES') {
						for (var i = 0; i < aContexts.length; i++) {
							oModel.remove(aContexts[i].getPath(), {
								batchGroupId: "changes",
								success: function (oData, response) {
									oModel.refresh(true);
								},
								error: function (oData, response) {
									if (oData.responseText) {
										var messageDetails = JSON.parse(oData.responseText);
										if (messageDetails.error.innererror.errordetails.length > 0) {
											oController.prepareMessageDialog(messageDetails.error.innererror.errordetails, oController);
										}
									}
								}
							});
						}
						oModel.submitChanges({
							batchGroupId: "changes"
						});
					}
				}
			});
		},

		getOwnerControl: function (oSourceControl) {
			var oCurrentControl = oSourceControl;
			while (oCurrentControl) {
				if (oCurrentControl instanceof ResponsiveTable || this.isUiTable(oCurrentControl) || this.isSmartTable(oCurrentControl)) {
					return oCurrentControl;
				}
				oCurrentControl = oCurrentControl.getParent && oCurrentControl.getParent();
			}
			return null;
		},

		getSmartTableControl: function (oSourceControl) {
			var oCurrentControl = oSourceControl;
			while (oCurrentControl) {
				if (this.isSmartTable(oCurrentControl)) {
					return oCurrentControl;
				}
				oCurrentControl = oCurrentControl.getParent && oCurrentControl.getParent();
			}
			return null;
		},

		isSmartTable: function (oControl) {
			return this.isControlOfType(oControl, "sap/ui/comp/smarttable/SmartTable");
		},

		isSmartForm: function (oControl) {
			return this.isControlOfType(oControl, "sap/ui/comp/smartform/SmartForm");
		},

		isUiTable: function (oControl) {
			return this.isControlOfType(oControl, "sap/ui/table/Table");
		},

		isMTable: function (oControl) {
			return this.isControlOfType(oControl, "sap/m/Table");
		},

		getTableBindingInfo: function (oTable) {
			if (this.isSmartTable(oTable)) {
				oTable = oTable.getTable(); // get SmartTable's inner table
				// first
			}

			if (this.isUiTable(oTable)) {
				return oTable.getBindingInfo("rows");
			} else if (oTable instanceof ResponsiveTable) {
				return oTable.getBindingInfo("items");
			}

			return null;
		},

		refreshSmartTable: function (oSmartTable) {
			var viewModel = oSmartTable.getModel("viewModel");
			var oBindingInfo = this.getTableBindingInfo(oSmartTable);
			if (oSmartTable.getTable() instanceof sap.ui.table.AnalyticalTable &&
				viewModel.getProperty("/searchEvent")) {
				oSmartTable.rebindTable();
			} else if (oBindingInfo && oBindingInfo.binding) {
				oBindingInfo.binding.refresh();
			} else if (oSmartTable && oSmartTable.rebindTable) {
				oSmartTable.rebindTable();
			}
		},
		isControlOfType: function (oControl, sPathToType) {
			var FNClass = sap.ui.require(sPathToType);
			return typeof FNClass === "function" && (oControl instanceof FNClass);
		},

		_updateUIElements: function () {
			var viewModel = this.getOwnerComponent().getModel("viewModel");
			var oUIState = this.getOwnerComponent().getHelper().getCurrentUIState();

			var previousUIState = viewModel.getProperty("/UIState");

			if (viewModel) {
				viewModel.setProperty("/UIState", oUIState);
			}
			if (sap.ui.Device.system.desktop) {
				var oModel = this.getOwnerComponent().getModel();
				if (oModel) {
					var oMetaModel = oModel.getMetaModel();
					var appControl = this.getOwnerComponent().getRootControl().byId("idAppControl");
					this.updateTableColumnVisibility(oUIState, previousUIState, "beginColumn", appControl, oMetaModel);
					this.updateTableColumnVisibility(oUIState, previousUIState, "midColumn", appControl, oMetaModel);
					this.updateTableColumnVisibility(oUIState, previousUIState, "endColumn", appControl, oMetaModel);
				}
			}
		},


		updateTableColumnVisibility: function (oUIState, previousUIState, columnName, appControl, oMetaModel) {
			if (sap.ui.Device.system.desktop) {
				if (previousUIState && oUIState.columnsVisibility[columnName]) {

					if (previousUIState.columnsSizes[columnName] != oUIState.columnsSizes[columnName]) {
						var page = null;
						if (columnName == "beginColumn") {
							page = appControl._getBeginColumn().getCurrentPage();
						} else if (columnName == "midColumn") {
							page = appControl._getMidColumn().getCurrentPage();
						} else if (columnName == "endColumn") {
							page = appControl._getEndColumn().getCurrentPage();
						}
						if (page && page.getContent()[0].getContent() && page.getContent()[0].getContent()[0]) {
							var objectPage = page.getContent()[0].getContent()[0].getContent()[0];
							if (objectPage && objectPage.getSections) {
								var sections = objectPage.getSections();
								for (var i = 0; i < sections.length; i++) {
									var subSections = sections[i].getSubSections();

									for (var j = 0; j < subSections.length; j++) {
										var oBlock = subSections[j].getBlocks()[0];
										var aContent = oBlock.getContent();

										for (var z = 0; z < aContent.length; z++) {
											var oSmartTable = aContent[z];
											if (this.isSmartTable(oSmartTable)) {
												this.changeSmartTableColumnVisibility(oSmartTable, oMetaModel, oUIState, columnName);
												//												if(columnChanged) {
												//												oSmartTable.rebindTable();
												//												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
		},

		changeSmartTableColumnVisibility: function (oSmartTable, oMetaModel, oUIState, columnName) {
			var columnChanged = false;
			var oController = this;
			if (oController.isMTable(oSmartTable.getTable())) {
				if (sap.ui.Device.system.desktop) {
					var entitySet = oSmartTable.getEntitySet();
					var oEntitySet = oMetaModel.getODataEntitySet(entitySet);
					var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
					var columns = [];
					var lineItems;
					if (oEntityType["vui.bodc.NonResponsiveLineItem"]) {
						lineItems = oEntityType["vui.bodc.NonResponsiveLineItem"];
					} else {
						lineItems = oEntityType["vui.bodc.ResponsiveLineItem"];
					}
					if (lineItems) {
						for (var index = 0; index < lineItems.length; index++) {
							if (lineItems[index]["com.sap.vocabularies.UI.v1.Importance"]) {
								if (oUIState.columnsSizes[columnName] < 50) {
									if (lineItems[index]["com.sap.vocabularies.UI.v1.Importance"].EnumMember == "com.sap.vocabularies.UI.v1.ImportanceType/Low") {
										columns.push(lineItems[index].Value.Path);
									} else if (lineItems[index]["com.sap.vocabularies.UI.v1.Importance"].EnumMember == "com.sap.vocabularies.UI.v1.ImportanceType/Medium") {
										columns.push(lineItems[index].Value.Path);
									}
								} else if (oUIState.columnsSizes[columnName] < 100) {
									if (lineItems[index]["com.sap.vocabularies.UI.v1.Importance"].EnumMember == "com.sap.vocabularies.UI.v1.ImportanceType/Low") {
										columns.push(lineItems[index].Value.Path);
									}
								}
							}
						}
					}

					if (oEntityType["vui.bodc.ResponsiveLineItem"]) {
						var lineItems = oEntityType["vui.bodc.ResponsiveLineItem"];

						for (var index = 0; index < lineItems.length; index++) {
							var key = "";
							if (lineItems[index].Value && lineItems[index].Value.Path) {
								key = lineItems[index].Value.Path;
							} else {
								key = lineItems[index].ID.String;
							}
							if (lineItems[index]["com.sap.vocabularies.UI.v1.Importance"]) {
								if (oUIState.columnsSizes[columnName] < 50) {
									if (lineItems[index]["com.sap.vocabularies.UI.v1.Importance"].EnumMember == "com.sap.vocabularies.UI.v1.ImportanceType/Low") {
										columns.push(key);
									} else if (lineItems[index]["com.sap.vocabularies.UI.v1.Importance"].EnumMember == "com.sap.vocabularies.UI.v1.ImportanceType/Medium") {
										columns.push(key);
									}
								} else if (oUIState.columnsSizes[columnName] < 100) {
									if (lineItems[index]["com.sap.vocabularies.UI.v1.Importance"].EnumMember == "com.sap.vocabularies.UI.v1.ImportanceType/Low") {
										columns.push(key);
									}
								}
							}
						}
					}

					oSmartTable.deactivateColumns(columns);
				}
			}
		},



		/* Session Popup */

		_prepareSessionPopup: function () {
			if (wrkspglobal.fromOtherApp) {
				return;
			}
			var oController = this;
			var bundle = oController.getOwnerComponent().getModel("i18n").getResourceBundle();
			// if(wrkspglobal.fromOtherApp == false){
			var sessionPopup = new sap.m.Dialog({
				title: bundle.getText('SessionPopup'),
				state: sap.ui.core.ValueState.Warning,
				content: [
					new sap.m.Label({
						text: {
							parts: [
								"/SESSION/ACTION_TYPE",
								"/SESSION/TIME_LEFT"
							],
							formatter: function (actionType, timeLeft) {

								var text = bundle.getText('timeleft') + " " + timeLeft + " " + bundle.getText("seconds");
								if (actionType == 'TIMEOUT') {
									text = bundle.getText('expired');
								}
								return text;
							}
						}
					})
				],
				buttons: [
					new sap.m.Button({
						text: {
							parts: [
								"/SESSION/ACTION_TYPE"
							],
							formatter: function (actionType) {
								var text = bundle.getText('SessionContinue');
								if (actionType == 'TIMEOUT') {
									text = bundle.getText('Restart');
								}
								return text;
							}
						},
						press: function (evt) {
							sessionPopup.enableOpen = false;
							sessionPopup.close();
							if (!wrkspglobal.session.ccounter) {

								//									oController.logOff();
								var oRouter = sap.ui.core.UIComponent.getRouterFor(oController);
								sap.ui.core.BusyIndicator.show(0);
								oRouter.navTo("Worklist");
								location.reload();
								sap.ui.core.BusyIndicator.hide();
							}
							else {
								var data = {};
								//									$.ajax({url: wrkspglobal.server.url.baseURL}).done(function(data){
								//									wrkspglobal.session.scounter = wrkspglobal.session.ccounter =
								//									wrkspglobal.session.maxTime;
								//									});
								initializeVariables();
							}
						}
					})
				]
			});
			sessionPopup.enableOpen = false;
			sessionPopup.addStyleClass("sapUiPopupWithPadding");

			var dialogJSON = new JSONModel();
			dialogJSON.setData({
				SESSION: {
					ACTION_TYPE: 'NOTIFY',
					TIME_LEFT: ''
				}
			});
			sessionPopup.setModel(dialogJSON);
			var sessionTime = setInterval(function () {
				if (wrkspglobal.session.counterPause) {
					if (wrkspglobal.session.ccounter <= wrkspglobal.session.notify) {
						if (wrkspglobal.session.ccounter == 0) {
							dialogJSON.setProperty('/SESSION/ACTION_TYPE', 'TIMEOUT');
							clearInterval(sessionTime);
							return false;
						}
						dialogJSON.setProperty('/SESSION/TIME_LEFT', wrkspglobal.session.ccounter);
						if (!sessionPopup.enableOpen) {
							sessionPopup.open();
							sessionPopup.enableOpen = true;
						}
					}
					if (wrkspglobal.session.scounter == wrkspglobal.session.notify &&
						wrkspglobal.session.scounter < wrkspglobal.session.ccounter) {
						//						$.ajax({
						//						data: [],
						//						xhrFields: {
						//						withCredentials: true
						//						},
						//						crossDomain: true,
						//						type: 'POST',
						//						url: wrkspglobal.server.url.baseURL,
						//						async: false
						//						}).done(function () {
						//						wrkspglobal.session.scounter = wrkspglobal.session.ccounter =
						//						wrkspglobal.session.maxTime;
						//						});
					}
					wrkspglobal.session.ccounter -= 1;
					wrkspglobal.session.scounter -= 1;
				}
			}, 1000);
			// }
		},
		logOff: function () {
			var oController = this;
			$.ajax({
				url: "/sap/public/bc/icf/logoff",
				async: false
			}).done(function () {

				$('body').children().detach();

				$.ajax({
					data: [],
					xhrFields: {
						withCredentials: true
					},
					crossDomain: true,
					type: 'POST',
					url: '/sap/public/bc/icf/logoff' + '?sap-sessioncmd=logoff',
					async: false
				}).done(function () {
					if (sap.ui.Device.browser.msie) {

						document.execCommand("ClearAuthenticationCache", false);
						location.reload();
					} else {

						var url = location.href;
						oController._logout(url);
					}
				});
			});
		},
		_logout: function (url) {
			var str = url.replace("http://", "http://" + new Date().getTime() + "@");
			var xmlhttp;
			if (window.XMLHttpRequest)
				xmlhttp = new XMLHttpRequest();
			else
				xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
			xmlhttp.onreadystatechange = function () {
				if (xmlhttp.readyState == 4) location.reload();
			};
			xmlhttp.open("GET", str, true);
			xmlhttp.setRequestHeader("Authorization", "Basic YXNkc2E6");
			xmlhttp.send();
			return false;
		},

		onBreadCrumbUrlPressed: function (oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var errorMessages = oController.checkErrorMessageExist(oModel);
			if (errorMessages) {
				oController.showMessagePopover(oController.messageButtonId);
				return;
			}

			var section = oController.getView().getContent()[0].getContent()[0]._oCurrentTabSection;
			var dynamicSideContent = oController.getResponsiveSplitter(section.getSubSections()[0].getBlocks()[0].getContent()[0]);
			var oSmartTable = dynamicSideContent.getMainContent()[0];
			var sEntitySet = oSmartTable.getEntitySet();
			var viewModel = oController.getView().getModel("viewModel");
			var currentRoute = viewModel.getProperty("/currentRoute");
			viewModel.setProperty("/" + sEntitySet + "showingSideContent", false);
			var NavigationTreeData = viewModel.getProperty("/NavigationTreeData");
			var entitySet = oEvent.getSource().data("entitySet");
			var selectedPaths = viewModel.getProperty("/selectedPaths");
			var node = selectedPaths, path, route, level;
			var modelChanged = viewModel.getProperty("/modelChanged");
			var oBundle = oController.getView().getModel("i18n").getResourceBundle();

			var entity = oModel.getMetaModel().getODataEntityType(oModel.getMetaModel().getODataEntitySet(sEntitySet).entityType);
			var findNavigationPath = function (entitySet) {
				while (node) {
					if (node.entity == entitySet) {
						path = node.path;
						route = node.route;
						level = node.level;
						break;
					} else {
						node = node.node;
					}
				}
			};
			findNavigationPath(entitySet);
			//Triggering metadata request
			var onDiscardComplete = function () {
				var level;
				if (
					viewModel.getProperty("/drillDownOnBeginColumnRoute") &&
					route == "Detail"
				) {
					var currentLevel = viewModel.getProperty(
						"/currentDetailPageLevel"
					);
					level = -currentLevel - 2;
					history.go(level);
					viewModel.setProperty("/modelChanged", false);
					// confirmation popup changes nav from launchpad
					if (parent && parent.commonUtils && parent.commonUtils.dataChanged) {
						parent.commonUtils.dataChanged = false;
					}
					// confirmation popup changes nav from launchpad
				} else {
					//						CI#16659 - Home button navigation after model changes
					var currentRoute = viewModel.getProperty("/currentRoute");
					if (
						currentRoute == "DetailDetail" ||
						currentRoute == "Inprocess"
					) {
						currentLevel = viewModel.getProperty("/currentDetailPageLevel");
					} else if (currentRoute == "BeginColumn") {
						currentLevel = viewModel.getProperty("/currentBeginPageLevel");
					}
					else {
						currentLevel = viewModel.getProperty("/currentDetailPageLevel");
					}
					//
					level = -currentLevel - 1;
					history.go(level);
				}
			};
			//Triggering metadata request
			if (entity["vui.bodc.workspace.Summary"] && entity["vui.bodc.workspace.Summary"].Bool
				&& entity["vui.bodc.workspace.Summary"].Bool == "true" && modelChanged) {
				MessageBox.confirm(oBundle.getText('BACKTOWORKSPACE'), {
					title: oBundle.getText('CONFIRM'),
					actions: [MessageBox.Action.YES, MessageBox.Action.NO],
					onClose: function (oAction) {
						if (oAction == 'YES') {
							//Triggering metadata request
							if (!level) {
								level = selectedPaths.level;
							}
							oController.onDiscard({}, onDiscardComplete);
							//Triggering metadata request
							if (currentRoute == "Inprocess") {
								if (route == "Detail") {
									var currentLevel = viewModel.getProperty("/currentDetailPageLevel");
									if (!currentLevel) currentLevel = 0;
									var level = - currentLevel - 2;
									history.go(level);
								} else if (route == "InprocessParent") {
									var currentLevel = viewModel.getProperty("/currentDetailPageLevel");
									if (!currentLevel) currentLevel = 0;
									var level = - currentLevel - 1;
									history.go(level);
								} else {
									var currentLevel = viewModel.getProperty("/currentDetailPageLevel")
									level = level - currentLevel - 1;
									history.go(level);
								}
							} else if (viewModel.getProperty("/inprocessCase")) {
								var flexibleColumnLayout = oController.getOwnerComponent().getRootControl().byId("idAppControl");
								var inprocessModel = flexibleColumnLayout.getCurrentBeginColumnPage().getModel();
								if (route == "Detail") {
									var currentLevel = viewModel.getProperty("/currentDetailPageLevel");
									if (!currentLevel) currentLevel = 0;
									var level = - currentLevel - 3;
									history.go(level);
								} else if (route == "InprocessParent") {
									var currentLevel = viewModel.getProperty("/currentDetailPageLevel");
									if (!currentLevel) currentLevel = 0;
									var level = - currentLevel - 2;
									history.go(level);
								} else {
									var currentLevel = viewModel.getProperty("/currentDetailPageLevel")
									level = level - currentLevel - 1;
									history.go(level);
								}
							} else if (route) {
								var currentLevel = viewModel.getProperty("/currentDetailPageLevel")
								level = level - currentLevel - 1;
								history.go(level);
							}
						}
					}
				});
			} else {
				if (currentRoute == "Inprocess") {
					if (route == "Detail") {
						var currentLevel = viewModel.getProperty("/currentDetailPageLevel");
						if (!currentLevel) currentLevel = 0;
						var level = - currentLevel - 2;
						history.go(level);
					} else if (route == "InprocessParent") {
						var currentLevel = viewModel.getProperty("/currentDetailPageLevel");
						if (!currentLevel) currentLevel = 0;
						var level = - currentLevel - 1;
						history.go(level);
					} else {
						var currentLevel = viewModel.getProperty("/currentDetailPageLevel")
						level = level - currentLevel - 1;
						history.go(level);
					}
				} else if (viewModel.getProperty("/inprocessCase")) {
					var flexibleColumnLayout = oController.getOwnerComponent().getRootControl().byId("idAppControl");
					var inprocessModel = flexibleColumnLayout.getCurrentBeginColumnPage().getModel();
					if (route == "Detail") {
						var currentLevel = viewModel.getProperty("/currentDetailPageLevel");
						if (!currentLevel) currentLevel = 0;
						var level = - currentLevel - 3;
						history.go(level);
					} else if (route == "InprocessParent") {
						var currentLevel = viewModel.getProperty("/currentDetailPageLevel");
						if (!currentLevel) currentLevel = 0;
						var level = - currentLevel - 2;
						history.go(level);
					} else {
						var currentLevel = viewModel.getProperty("/currentDetailPageLevel")
						level = level - currentLevel - 1;
						history.go(level);
					}
				} else if (route) {
					var currentLevel = viewModel.getProperty("/currentDetailPageLevel")
					level = level - currentLevel - 1;
					history.go(level);
				}
			}

		},

		prepareFacetPath: function (aFacets, sTableId) {
			var facetPath = "";
			for (var i = 0; i < aFacets.length; i++) {
				if (aFacets && aFacets[i].Target && aFacets[i].Target.AnnotationPath) {
					var annotationPath = aFacets[i].Target.AnnotationPath;
					annotationPath = annotationPath.replace('/@', '::');
					if (sTableId.indexOf(annotationPath) >= 0) {
						//						oFacet = aFacets[i];
						facetPath = i + "";
						break;
					}
				} else if (aFacets && aFacets[i].Facets) {
					var tempFacetPath = this.prepareFacetPath(aFacets[i].Facets, sTableId);
					if (tempFacetPath != "") {
						facetPath = i + "/Facets/" + tempFacetPath;
					}
				}
			}
			return facetPath;
		},

		onTableTypeChange: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			sap.ui.core.BusyIndicator.show();

			var oSource = oEvent.getSource();
			var tableType = oSource.data("SwitchTO");
			var oSmartTable = oSource.getParent();
			while (true) {
				if (oController.isSmartTable(oSmartTable)) {
					break;
				} else {
					oSmartTable = oSmartTable.getParent();
				}
			}
			var listEntitySet = oSmartTable.getEntitySet();
			viewModel.setProperty("/" + listEntitySet + "showingSideContent", false);
			var oTable = oSmartTable.getTable();
			var grid = oSmartTable.getParent().getParent();
			grid.destroyContent();
			grid.removeAllContent();

			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();

			var sPath = oController.getView().getBindingContext().getPath();
			var entitySet = sPath.substr(1, sPath.indexOf('(') - 1);

			var oEntitySet = oMetaModel.getODataEntitySet(entitySet);
			var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
			var aFacets = oEntityType["com.sap.vocabularies.UI.v1.Facets"]

			var facetPath = oController.prepareFacetPath(aFacets, oTable.getId());

			var hierarchyModel = new JSONModel();
			var hierarchy = [];
			hierarchyModel.setProperty("/nodes", hierarchy);

			if (oController.columnPosition == 'midColumn') {
				hierarchyModel.setProperty("/ShowDetailDetail", true);
			} else {
				if (oController.columnPosition == 'beginColumn') {
					hierarchyModel.setProperty("/ShowDetailDetail", false);
				}
			}

			var oEntities = viewModel.getProperty("/entities");

			var oListEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(listEntitySet).entityType);
			oEntities[oListEntityType.name] = tableType;
			hierarchyModel.setProperty("/entities", oEntities);
			viewModel.setProperty("/entities", oEntities);

			var oEntitySetContext = oMetaModel.createBindingContext(oMetaModel.getODataEntitySet(entitySet, true));
			var oEntityTypeContext = oMetaModel.createBindingContext(oEntityType.$path);
			var oFacetsContext = oMetaModel.createBindingContext(oEntityType.$path + "/com.sap.vocabularies.UI.v1.Facets");
			var oFacetContext = oMetaModel.createBindingContext(oEntityType.$path + "/com.sap.vocabularies.UI.v1.Facets/" + facetPath);

			var oFragment = XMLTemplateProcessor.loadTemplate("vui.workspace.fragment.SmartTable", "fragment");
			oFragment = XMLPreprocessor.process(oFragment, {
				caller: "XML-Fragment-templating"
			}, {
				bindingContexts: {
					meta: oMetaModel.createBindingContext("/"), // .createBindingContext(oMetaModel.getODataEntitySet(entitySet,
					// true)),
					entitySet: oEntitySetContext,
					entityType: oEntityTypeContext,
					facet: oFacetContext,
					facets: oFacetsContext
				},
				models: {
					meta: oMetaModel,
					entitySet: oMetaModel,
					entityType: oMetaModel,
					facet: oMetaModel,
					facets: oMetaModel,
					columnModel: hierarchyModel
				}
			}).then(function (fragment) {
				oFragment = sap.ui.xmlfragment({
					fragmentContent: fragment
				}, oController);
				if (oFragment instanceof Array) {
					for (var i = 0; i < oFragment.length; i++) {
						if (oController.isSmartTable(oFragment[i])) {
							oFragment[i].data("TypeChanged", true);
						}
						grid.addContent(oFragment[i]);
					}
				} else {
					oFragment.data("TypeChanged", true);
					grid.addContent(oFragment);
				}
				sap.ui.core.BusyIndicator.hide();
			});
		},
		openDSCToolbarAction: function (oSmartTable, selectAll, selectedRows, rowSelected, newSelectedPath) {
			var oController = this;
			var viewModel = this.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var oTable = oSmartTable.getTable();
			var sEntitySet = oSmartTable.getEntitySet();
			var entity = oModel.getMetaModel().getODataEntityType(oModel.getMetaModel().getODataEntitySet(sEntitySet).entityType);
			var showingSideContent = viewModel.getProperty("/" + sEntitySet + "showingSideContent");
			//			var dynamicSideContent = oController.getDynamicSideContent(oTable);
			var dynamicSideContent = oController.getResponsiveSplitter(oTable);
			var editingStatusDSC;
			if (!showingSideContent) {
				var currentRoute = viewModel.getProperty("/currentRoute");
				if (currentRoute == "Detail") {
					viewModel.setProperty("/DetailshowHideDsc", true);
				} else if (currentRoute == "DetailDetail") {
					viewModel.setProperty("/DetailDetailshowHideDsc", true);
				}
				if (viewModel.getProperty("/layout") == "TwoColumnsMidExpanded") {
					oController.onCollapse();
				}
				dynamicSideContent.setShowSideContent(true);
				viewModel.setProperty("/" + sEntitySet + "showingSideContent", true);
				viewModel.setProperty("/" + sEntitySet + "showSideContent", true);
				jQuery.sap.delayedCall(100, null, function () {
					oTable.rerender();
				});
			}
			if (selectedRows.length > 1) {
				var urlParameters = {}, rowIDs = [], edtstSpaceRowid = [], lockParameters = {},
					//						Manual Correction Changes - started
					showDscCorrectionLines = false;
				//					Manual Correction Changes - ended;

				_.each(selectedRows, function (context) {
					if (context && context.getPath) {
						var oContextData = oModel.getProperty(context.getPath());
						var rowId = oContextData.row_id;
						rowIDs.push(rowId);
						//		Manual Correction Changes - started
						var correction_row_id;
						if (
							oController.correction_row_id &&
							oController.correction_row_id[sEntitySet] &&
							oController.correction_row_id[sEntitySet][rowId]
						) {
							correction_row_id =
								oController.correction_row_id[sEntitySet][rowId];
						}
						var edtst = oContextData.edtst;
						if (edtst == undefined || edtst == "" || correction_row_id) {
							edtstSpaceRowid.push(rowId);
						}
						var pstatField = Object.keys(oContextData).find(function (f) {
							return f.endsWith("pstat")
						});

						var itcrdField = Object.keys(oContextData).find(function (f) {
							return f.endsWith("itcrd")
						});
						if (
							oContextData &&
							oContextData[pstatField] == "4" &&
							(!oContextData[itcrdField] || oContextData[itcrdField] == "O")
						) {
							showDscCorrectionLines = true;
						}
						//		Manual Correction Changes - end
					}
				});

				//		Manual Correction Changes - start
				if (
					showDscCorrectionLines &&
					!viewModel.getProperty("/addCorrectionLines" + sEntitySet)
				) {
					viewModel.setProperty(
						"/" + sEntitySet + "showDscCorrectionLines",
						true
					);
					//					viewModel.setProperty("/addCorrectionLines" + sEntitySet, true);
				} else {
					viewModel.setProperty(
						"/" + sEntitySet + "showDscCorrectionLines",
						false
					);
					//					viewModel.setProperty("/addCorrectionLines" + sEntitySet, false);
				}
				//					Manual Correction Changes - end


				if (selectAll) {
					urlParameters["_selal"] = true;
					lockParameters["_selal"] = true;
				} else {
					urlParameters["_row_id"] = rowIDs.toString();
					lockParameters["_row_id"] = rowIDs.toString();
					var unselected_row_ids = [];
					if (
						rowIDs.length !== selectedRows.length &&
						oController.rowSelectionData[sEntitySet]
					) {
						for (
							var i = 0;
							i < oController.rowSelectionData[sEntitySet].length;
							i++
						) {
							var oContextData = oModel.getProperty(
								oController.rowSelectionData[sEntitySet][i]
							);
							if (oContextData) {
								var found = rowIDs.find(function (obj) {
									return obj == oContextData.row_id;
								});
								if (!found) {
									unselected_row_ids.push(oContextData.row_id);
								}
							}
						}
						if (unselected_row_ids.length > 0) {
							lockParameters["_row_id"] = unselected_row_ids.toString();
							lockParameters["unselected"] = true;
						}
					}
				}
				urlParameters["_dscen"] = true;
				lockParameters["_dscen"] = true;
				sap.ui.core.BusyIndicator.show(0);
				if (!viewModel.getProperty("/skipLockFunction")) {
					//			Manual Correction Changes - start
					if (!viewModel.getProperty("/addCorrectionLines" + sEntitySet)) {
						oModel.callFunction("/" + sEntitySet + "_LOCK", {
							method: "POST",
							batchGroupId: "changes",
							urlParameters: lockParameters,
							success: function (oData, response) {
								var messageExists = oController.checkResponseForMessages(oData, response);
								if (messageExists) {
									setTimeout(function () {
										oController.showMessagePopover(oController.messageButtonId);
									});
								}
							},
							error: function (oData, response) {
								setTimeout(function () {
									oController.showMessagePopover(oController.messageButtonId);
								}, 1000);
							}
						});
					}
					//						Manual Correction Changes - end
				}
				else {
					viewModel.setProperty("/skipLockFunction", false);
				}


				oModel.submitChanges({
					batchGroupId: "changes",
					success: function (d, res) {
						oController.showMessagePopover(oController.messageButtonId);
						//						sap.ui.core.BusyIndicator.hide();
						if (viewModel.getProperty("/disp_only")) {
							editingStatusDSC = "";
							oController.prepareDynamicSideMultiEditContent(dynamicSideContent, entity, selectedRows, sEntitySet, urlParameters, editingStatusDSC, selectAll);
						} else if (!selectAll && edtstSpaceRowid && edtstSpaceRowid.length > 0) {
							//							var params = [];
							//								Manual Correction Changes - start
							var correction_rowid = [];
							if (
								oController.correction_row_id &&
								oController.correction_row_id[sEntitySet][edtstSpaceRowid[0]]
							) {
								for (var i = 0; i < edtstSpaceRowid.length; i++) {
									correction_rowid.push(
										oController.correction_row_id[sEntitySet][
										edtstSpaceRowid[i]
										]
									);
								}
								urlParameters["row_id"] = correction_rowid.toString();
								urlParameters["_row_id"] = correction_rowid.toString();
								urlParameters["corr_rows_get"] = true;
							} else {
								urlParameters["row_id"] = edtstSpaceRowid.toString();
							}
							//								Manual Correction Changes - end
							oModel.read("/" + sEntitySet, {
								urlParameters: urlParameters,
								_refresh: true,
								success: function (oData, response) {
									var messageExists = oController.checkResponseForMessages(oData, response);
									if (messageExists) {
										setTimeout(function () {
											oController.showMessagePopover(oController.messageButtonId);
										});
									}
									sap.ui.core.BusyIndicator.hide();
									//									oModel.setProperty(newSelectedPath + "/edtst",oData.edtst);
									delete urlParameters["row_id"];
									editingStatusDSC = viewModel.getProperty("/editingStatusDSC");
									if (editingStatusDSC == "1") {
										viewModel.getProperty("/editingStatusDSC", editingStatusDSC);
									} else {
										if (oData.edtst !== undefined) {
											viewModel.getProperty("/editingStatusDSC", oData.edtst);
										} else if (oData.results) {
											for (var i = 0; i < oData.results.length; i++) {
												editingStatusDSC = oData.results[i].edtst;
												if (oData.results[i].edtst == "1") {
													break;
												}
											}
											viewModel.getProperty("/editingStatusDSC", editingStatusDSC);
										}
									}
									oController.prepareDynamicSideMultiEditContent(dynamicSideContent, entity, selectedRows, sEntitySet, urlParameters, editingStatusDSC, selectAll);
								}
							});
						} else {
							if (selectAll) {
								//#164828 -> Approval Integration via Action code(GTM sync ) --Start 
								urlParameters = {};
								urlParameters["_selal"] = "X";
								var count = 0;
								//#164828 -> Approval Integration via Action code(GTM sync ) --end 
								if (d.__batchResponses && d.__batchResponses[0] && d.__batchResponses[0].__changeResponses && d.__batchResponses[0].__changeResponses[0].data &&
									d.__batchResponses[0].__changeResponses[0].data.edtst) {
									editingStatusDSC = d.__batchResponses[0].__changeResponses[0].data.edtst;
									//#164828 -> Approval Integration via Action code(GTM sync ) --Start 
									count = d.__batchResponses[0].__changeResponses[0].data.sl_count;
									//#164828 -> Approval Integration via Action code(GTM sync ) --end
								} else {
									editingStatusDSC = "";
								}
								if (edtstSpaceRowid && edtstSpaceRowid.length > 0) {
									if (oTable.getBinding && oTable.getBinding()) {
										// var lastEndIndex = oTable.getBinding().iLastEndIndex;
										// var startIndex = oTable.getBinding().iStartIndex;
										// if (startIndex > lastEndIndex) {
										// 	urlParameters["$top"] = startIndex + oTable.getBinding().iLastThreshold;
										// } else {
										// 	urlParameters["$top"] = lastEndIndex + oTable.getBinding().iLastThreshold;
										// }

										// if (urlParameters["$top"] < oTable.getBinding().aKeys.length) {
										// 	urlParameters["$top"] = oTable.getBinding().aKeys.length;
										// }
										// //										urlParameters["$skip"] = oTable.getBinding().iLastStartIndex;
										// //										if(!urlParameters["$skip"]){
										// //										urlParameters["$skip"] = 0;
										// //										}
										// urlParameters["$skip"] = 0;
										// if ((!urlParameters["$top"] || urlParameters["$top"] > oTable.getBinding().iLength) && oTable.getVisibleRowCount) {
										// 	urlParameters["$top"] = oTable.getThreshold() + oTable.getVisibleRowCount();
										// } else {
										// 	urlParameters["$top"] = urlParameters["$top"] - urlParameters["$skip"];
										// }
										//#164828 -> Approval Integration via Action code(GTM sync ) --Start 
										urlParameters["$skip"] = oTable.getBinding().iLastStartIndex;
										urlParameters["$top"] = oTable.getBinding().iLastLength;
										//#164828 -> Approval Integration via Action code(GTM sync ) --End
									}
									delete urlParameters["row_id"];
									//									Select All changes - Started
									oModel.read("/" + sEntitySet, {
										urlParameters: _.extend(urlParameters, oController.readQueryPrepare(sEntitySet)),
										_refresh: true,
										success: function (oData, response) {
											delete urlParameters["row_id"];
											//#164828 -> Approval Integration via Action code(GTM sync ) --Start 
											oController.prepareDynamicSideMultiEditContent(dynamicSideContent, entity, selectedRows, sEntitySet, urlParameters, editingStatusDSC, selectAll, count);
											//#164828 -> Approval Integration via Action code(GTM sync ) --End
										}
									});
									//									Select All Changes - Ended
								} else {
									oController.prepareDynamicSideMultiEditContent(dynamicSideContent, entity, selectedRows, sEntitySet, urlParameters, editingStatusDSC, selectAll);
								}
							} else {
								editingStatusDSC = "";
								_.each(selectedRows, function (context) {
									if (context && context.getPath) {
										var edtst = oModel.getProperty(context.getPath()).edtst;
										if (edtst == "1") {
											editingStatusDSC = edtst;
										}
									}
								});
								oController.prepareDynamicSideMultiEditContent(dynamicSideContent, entity, selectedRows, sEntitySet, urlParameters, editingStatusDSC, selectAll);
							}
						}
					},
					error: function (oData, response) {
						setTimeout(function () {
							sap.ui.core.BusyIndicator.hide();
							oController.showMessagePopover(oController.messageButtonId);
						}, 1000);
					}
				});
			} else if (selectedRows.length == 1) {
				viewModel.setProperty("/" + sEntitySet + "showDscApply", false);
				var selectedPath = selectedRows[0].getPath();
				//				if(oTable.getSelectedIndices){
				//				selectedPath = oEvent.getParameter('rowContext').getPath();
				//				}else{
				//				selectedPath = oEvent.getParameter("listItem").getBindingContextPath()
				//				}
				oController.prepareSideContentData(entity, selectedPath, dynamicSideContent, sEntitySet, oTable.getParent());
			}
		},
		onSelectionChange: function (oEvent) {
			var oController = this;
			var viewModel = this.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var oBundle = oController.getView().getModel("i18n").getResourceBundle();
			var oTable = oEvent.getSource().getParent().getTable();
			var sEntitySet = oTable.getParent().getEntitySet();
			var showingSideContent = viewModel.getProperty("/" + sEntitySet + "showingSideContent");
			var rowSelected = true, editingStatusDSC, newSelectedPath, selectAll;
			var listEntitySet = oModel.getMetaModel().getODataEntitySet(sEntitySet);
			var entity = oModel.getMetaModel().getODataEntityType(oModel.getMetaModel().getODataEntitySet(sEntitySet).entityType);
			var selectedRows = [], selectedRow = {};
			var modelChanged = viewModel.getProperty("/modelChanged");
			//			Required Changes
			// Messages are clearing on save --Start
			if (!viewModel.getProperty("/saveOnDetailPerformed")) {
				oController.removeMessages(oController);

			}
			viewModel.setProperty("/saveOnDetailPerformed", false);
			// Messages are clearing on save --End
			//			
			//			if(showingSideContent){
			if ((listEntitySet['Org.OData.Capabilities.V1.UpdateRestrictions'] &&
				listEntitySet['Org.OData.Capabilities.V1.UpdateRestrictions'].Updatable.Bool == "false") ||
				viewModel.getProperty("/skipSelectionChange")) {
				viewModel.setProperty("/skipSelectionChange", false);
				return;
			}
			var limit;
			if (oEvent.getParameter("selectAll") && window.selectAllLimit) {
				limit = window.selectAllLimit;
			}
			if (entity["vui.bodc.workspace.Summary"]) {
				if (oEvent.getParameter("selectAll")) {
					oTable.addStyleClass("gridTableDisableContent");
					oTable.getParent().getToolbar().getContent().forEach(function (button) {
						if (button.setEnabled && (button.data && button.data("Type") != 'SelectAll')) {
							button.setEnabled(false);
						}
					});
				} else {
					oTable.removeStyleClass("gridTableDisableContent");
					oTable.getParent().getToolbar().getContent().forEach(function (button) {
						if (button.setEnabled && (button.data && button.data("Type") != 'SelectAll')) {
							button.setEnabled(true);
						}
					});
				}
			}
			var selectAllButton = oTable.getParent().getToolbar().getContent().find(function (button) {
				if (button.data("Type") && button.data("Type") == "SelectAll") {
					return GamepadButton
				}
			})
			if (selectAllButton) {
				if (oEvent.getParameter("selectAll")) {
					selectAllButton.setType("Emphasized");
					selectAllButton.data("selected", "true");
				} else if (oEvent.getParameter("rowIndex") == -1) {
					selectAllButton.setType("Default");
					selectAllButton.data("selected", "false");
				}
			}
			//				Manual Correction Changes - start
			if (
				oEvent.getParameter("rowContext") &&
				oEvent.getParameter("rowContext").getPath &&
				oEvent.getParameter("rowContext").getPath() &&
				oModel.getProperty(oEvent.getParameter("rowContext").getPath()) &&
				oModel.getProperty(oEvent.getParameter("rowContext").getPath()).rowid_h &&
				//CHild row cannot be selected
				// oModel.getProperty(oEvent.getParameter("rowContext").getPath())
				// 	.row_id[0] == "C"
				oModel.getProperty(oEvent.getParameter("rowContext").getPath()).rowid_h != "0"
			) {
				var oBundle = oController
					.getView()
					.getModel("i18n")
					.getResourceBundle();
				var message = oBundle.getText("CHILDCANNOTSELECT");
				MessageToast.show(message, { duration: 5000, width: "30em" });
				var index = oEvent.getParameter("rowIndex");
				oTable.removeSelectionInterval(index, index);

				return;
			}
			if (viewModel.getProperty("/skipSlectionChange")) {
				return;
			}
			viewModel.setProperty("/addCorrectionLines" + sEntitySet, false);

			if (!oController.rowSelectionData) {
				oController.rowSelectionData = {};
			}
			if (
				oEvent.getParameter("rowIndex") == -1 &&
				!oEvent.getParameter("selectAll")
			) {
				delete oController.rowSelectionData[sEntitySet];
			} else if (oEvent.getParameter("selectAll")) {
				oController.rowSelectionData[sEntitySet] = [];
			} else if (oController.rowSelectionData[sEntitySet]) {
				if (oEvent.getParameter("rowContext")) {
					oController.rowSelectionData[sEntitySet].push(
						oEvent.getParameter("rowContext").getPath()
					);
				}
			}
			//				Manual Correction Changes - end
			if (oTable.getSelectedIndices) {
				var rowindex = oEvent.getParameter("rowIndex");
				var selectedIndices = oTable.getSelectedIndices();
				//				Select All Changes - Started
				//				_.each(selectedIndices,function(index){
				//				selectedRows.push(oTable.getContextByIndex(index));
				//				});
				//				if(oEvent.getParameter("selectAll") && limit < selectedIndices.length){
				//				MessageToast.show(oBundle.getText("FUNCTIONALITYNOTAPPLICABLE"), { duration:
				//				3000, width: "50em" });
				//				oTable.clearSelection();
				//				return;
				//				}
				var i = 0;
				selectedIndices.every(function (index) {
					// selectedRows.push(oTable.getContextByIndex(index));
					// i++;
					// if (oEvent.getParameter("selectAll")) {
					// 	return i < 49;
					// }
					if (oTable.getContextByIndex(index)) {
						selectedRows.push(oTable.getContextByIndex(index));
						i++;
						if (oEvent.getParameter("selectAll")) {
							return i < 50;
						}
					}
					// VHD#781605->Defect# 8000006302 - Price Code Susp Mgmt Physical --Start
					else {
						var aRows = oTable.getRows();
						if (aRows && aRows[index] && aRows[index].getBindingContext && aRows[index].getBindingContext()) {
							selectedRows.push(aRows[index].getBindingContext());
							i++;
							return i < 50;
						}


					}
					// VHD#781605->Defect# 8000006302 - Price Code Susp Mgmt Physical --End
					return true;
				});
				//				Select All Changes - Ended
				if (rowindex || rowindex == 0) {
					var index = selectedIndices.find(function (index) { return index == rowindex })
					if (index != undefined) {
						if (oTable.getContextByIndex(rowindex))
							newSelectedPath = oTable.getContextByIndex(rowindex).getPath();
						//						selectedRow = oTable.getContextByIndex(rowindex);
					} else {
						rowSelected = false;
					}
				}
			} else {
				var selectedItems = oTable.getSelectedItems();
				//				Select All Changes - Started
				//				_.each(selectedItems,function(item){
				//				selectedRows.push(item.getBindingContext());
				//				});
				//				if(oEvent.getParameter("selectAll") && limit < selectedItems.length){
				//				MessageToast.show(oBundle.getText("FUNCTIONALITYNOTAPPLICABLE"), { duration:
				//				3000, width: "50em" });
				//				oTable.removeSelections();
				//				return;
				//				}
				var i = 0;
				selectedItems.every(function (item) {
					selectedRows.push(item.getBindingContext());
					if (oEvent.getParameter("selectAll")) {
						return i < 49;
					}
					return true;
				})
			}

			//			var dynamicSideContent = oController.getDynamicSideContent(oTable);
			//			var DSCId = dynamicSideContent.getId();
			var dynamicSideContent = oController.getResponsiveSplitter(oTable);
			var DSCId = dynamicSideContent.content.getId();

			var segmentedButton;
			var itemTabBar = oController.getView().byId(DSCId + "::IconTab");
			if (!itemTabBar) {
				itemTabBar = sap.ui.getCore().byId(DSCId + "::IconTab");
				segmentedButton = sap.ui.getCore().byId(DSCId + "::SegButton");
			} else {
				//#164828 -> Approval Integration via Action code(GTM sync ) --Start 
				//segmentedButton = oController.getView().byId(DSCId + "::SegButton");
				segmentedButton = oController.getView().byId(DSCId + "::IconTab");
				//	#164828 -> Approval Integration via Action code(GTM sync ) --End
			}
			//			itemTabBar.getItems()[2].setVisible(false);

			//#164828 -> Approval Integration via Action code(GTM sync ) --Start 
			// if (segmentedButton.getItems()[2]) {
			// 	segmentedButton.getItems()[2].setVisible(false);
			// }
			if (segmentedButton.getItems() && segmentedButton.getItems().length > 1) {
				for (var i = 1; i < segmentedButton.getItems().length; i++) {
					segmentedButton.getItems()[i].setVisible(false);
				}
			}
			//	#164828 -> Approval Integration via Action code(GTM sync ) --End
			//			segmentedButton.getItems()[3].setVisible(false);
			viewModel.setProperty("/matchEntities", []);

			//			if(!viewModel.getProperty("/"+sEntitySet+"_MultiSelectEnabled")){
			//			if(rowSelected){
			//			selectedRows = [selectedRow];
			//			}else{
			//			selectedRows = [selectedRows[0]];
			//			}
			//			}else
			if (selectedRows.length > 1) {
				if (dynamicSideContent.getMainContent) {
					if (dynamicSideContent.getMainContent()[1]) {
						var mainTable = dynamicSideContent.getMainContent()[1].getTable();
					} else {
						var mainTable = dynamicSideContent.getMainContent()[0].getTable();
					}
					//VHD#740535->Error as Workspace encountered internal server error on cal run post - Start
					var count;
					if (mainTable.getParent().getTable() instanceof sap.m.Table) {
						count = mainTable.getParent().getTable().getMaxItemsCount();
					} else if (mainTable.getParent().getTable() instanceof sap.ui.table.Table) {
						count = mainTable.getParent().getTable().getBinding("rows").getLength();
					}
					//VHD#740535->Error as Workspace encountered internal server error on cal run post - End

					if (mainTable.getSelectedContexts) {
						var selectedContexts = mainTable.getSelectedContexts();
						if (mainTable.getVisibleItems().length == mainTable.getSelectedItems().length) {
							selectAll = true;
						}
					} else {
						if (oEvent.getParameter("selectAll")) {
							selectAll = true;
						}
						// VHD#781605->Defect# 8000006302 - Price Code Susp Mgmt Physical --Start
						// else if (mainTable.getParent()._getRowCount() <= mainTable.getVisibleRowCount()) {
						// 	if (mainTable.getParent()._getRowCount() == mainTable.getSelectedIndices().length) {
						// 		selectAll = true;
						// 	}
						// } else {
						// 	var tableAvailableRows = [];
						// 	_.each(oModel.mContexts, function (context) {
						// 		if (context.sPath.indexOf(sEntitySet + "(") == 1) {
						// 			tableAvailableRows.push(context);
						// 		}
						// 	})
						// 	if (tableAvailableRows.length == oTable.getSelectedIndices().length) {
						// 		selectAll = true;
						// 	}
						// }
						// VHD#781605->Defect# 8000006302 - Price Code Susp Mgmt Physical --End
					}
				}
			} else if (selectedRows.length == 1) {
				if (dynamicSideContent.getMainContent) {
					if (dynamicSideContent.getMainContent()[1]) {
						var mainTable = dynamicSideContent.getMainContent()[1].getTable();
					} else {
						var mainTable = dynamicSideContent.getMainContent()[0].getTable();
					}
					//VHD#740535->Error as Workspace encountered internal server error on cal run post - Start
					var count;
					if (mainTable.getParent().getTable() instanceof sap.m.Table) {
						count = mainTable.getParent().getTable().getMaxItemsCount();
					} else if (mainTable.getParent().getTable() instanceof sap.ui.table.Table) {
						count = mainTable.getParent().getTable().getBinding("rows").getLength();
					}
					//VHD#740535->Error as Workspace encountered internal server error on cal run post - End

					if (mainTable.getSelectedContexts) {
						var selectedContexts = mainTable.getSelectedContexts();
						if (mainTable.getVisibleItems().length == mainTable.getSelectedItems().length) {
							selectAll = true;
						}
					} else {
						if (count == mainTable.getSelectedIndices().length) {
							selectAll = true;
						}
					}
				}
			}
			// for back action during selectall and save & refresh
			//			if(entity["vui.bodc.workspace.Summary"] &&
			//			entity["vui.bodc.workspace.Summary"].Bool
			//			&& entity["vui.bodc.workspace.Summary"].Bool == "true"){
			//					Manual Correction Changes - start
			if (!oEvent.getParameter("selectAll") && selectedRows.length > 1) {
				var postedLinesWithCorrections = 0,
					postedLinesWithoutCorrections = 0,
					notPostedLines = 0;
				_.each(selectedRows, function (context) {
					if (context && context.getPath) {
						var oContextData = oModel.getProperty(context.getPath());
						if (oContextData.itcrd !== undefined) {
							if (oContextData && oContextData.pstat == "4") {
								if (oContextData.itcrd) {
									postedLinesWithCorrections++;
								} else {
									postedLinesWithoutCorrections++;
								}
							} else if (oContextData && oContextData.pstat == "2") {
								notPostedLines++;
							}
						}
					}
				});
				if (
					(postedLinesWithCorrections && postedLinesWithoutCorrections) ||
					(notPostedLines && postedLinesWithoutCorrections)
				) {
					if (oTable.clearSelection) {
						oTable.clearSelection();
						oTable.setSelectedIndex(oEvent.getParameter("rowIndex"));
					} else {
						oTable.removeSelections();
					}
					return;
				}
			}
			//				Manual Correction Changes - end
			if (selectAll) {
				viewModel.setProperty("/navBackOnSAVnRef", true);
				viewModel.setProperty("/selectAll_" + sEntitySet, true);
				oController.selectionChangeContinue(oController, selectedRows, oTable, selectAll, viewModel, oEvent);
			} else {
				if (!viewModel.getProperty("/modelChanged"))
					viewModel.setProperty("/navBackOnSAVnRef", false);
				if (viewModel.getProperty("/selectAll_" + sEntitySet)) {
					viewModel.setProperty("/selectAll_" + sEntitySet, false);
					//					if(entity["vui.bodc.workspace.Summary"] && entity["vui.bodc.workspace.Summary"].Bool
					//							&& entity["vui.bodc.workspace.Summary"].Bool == "true" && modelChanged){
					//
					//						MessageBox.confirm(oBundle.getText('BACKTOWORKSPACE'), {
					//							title: oBundle.getText('CONFIRM'),                                  
					//							actions: [MessageBox.Action.YES, MessageBox.Action.NO],
					//							onClose: function (oAction) {
					//								if(oAction == 'YES'){
					//									oController.onDiscard();
					//									oController.selectionChangeContinue(oController, selectedRows, oTable, selectAll, viewModel, oEvent);
					//								}
					//
					//							}
					//						});
					//
					//					}else{
					oController.selectionChangeContinue(oController, selectedRows, oTable, selectAll, viewModel, oEvent);
					//					}
				} else {
					oController.selectionChangeContinue(oController, selectedRows, oTable, selectAll, viewModel, oEvent);
				}
				if (!modelChanged && oEvent.getParameter("rowIndex") == -1) {
					var entityName = oEvent.getSource().getParent().getEntitySet();
					var functionImport = oMetaModel.getODataFunctionImport(entityName + "_DESELECT");
					// #188496
					if (functionImport) {
						var urlParameters = {};
						urlParameters["multi-select-off"] = true;
						oModel.callFunction("/" + functionImport.name, {
							method: "POST",
							batchGroupId: "changes",
							urlParameters: urlParameters,
							success: function () {
								// 188496 - batch request is cancelled on cancel action
								if (!oController.skipRefreshSmartTable) {
									oController.refreshSmartTable(oTable.getParent());
									oController.skipRefreshSmartTable = false;
								}
								// 188496 - batch request is cancelled on cancel action
							},
						});
						oModel.submitChanges({
							batchGroupId: "changes",
						});
					}
					// #188496		
				}
			}
			//			}
		},

		selectionChangeContinue: function (oController, selectedRows, oTable, selectAll, viewModel, oEvent) {
			if (selectedRows.length > 0) {
				oController.openDSCToolbarAction(oTable.getParent(), selectAll, selectedRows);
			} else {
				oController.onCloseTableDSC(oEvent);
			}

			var disableBulkEdit = viewModel.getProperty("/disableBulkEdit");
			var selectedItems;

			if (oTable.getSelectedItems) {
				selectedItems = oTable.getSelectedItems();
			} else {
				selectedItems = oTable.getSelectedIndices();
			}

			var entitySet = oTable.getParent().getEntitySet();
			if (selectedItems.length > 0) {
				viewModel.setProperty("/" + entitySet + "_rowSelected", true);
			} else {
				viewModel.setProperty("/" + entitySet + "_rowSelected", false);
			}
		},
		//	#164828 -> Approval Integration via Action code(GTM sync ) --Start
		prepareDynamicSideMultiEditContent: function (dynamicSideContent, entity, selectedRows, sEntitySet, urlParameters, editingStatusDSC, selectAll, selectAllCount) {
			//	#164828 -> Approval Integration via Action code(GTM sync ) --End
			var oController = this;
			var tableData = [];
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = this.getView().getModel("viewModel");
			var selectedPath, selectedRowData, rowIDs = [], oTargetEntity, selectedItemsLength;
			//			var DSCId = dynamicSideContent.getId();
			var DSCId = dynamicSideContent.content.getId();
			oController.mainTableParametersForDsc = urlParameters;
			if (dynamicSideContent.getMainContent) {
				if (dynamicSideContent.getMainContent()[1]) {
					var mainTable = dynamicSideContent.getMainContent()[1].getTable();
				} else {
					var mainTable = dynamicSideContent.getMainContent()[0].getTable();
				}

				if (mainTable.getSelectedContexts) {
					var selectedContexts = mainTable.getSelectedContexts();
					if (selectAll && window.selectAllLimit &&
						(mainTable.getSelectedItems().length > window.selectAllLimit)) {
						selectedItemsLength = window.selectAllLimit;
					} else {
						selectedItemsLength = mainTable.getSelectedItems().length;
					}
				} else {
					if (selectAll && window.selectAllLimit &&
						(mainTable.getSelectedIndices().length > window.selectAllLimit)) {
						selectedItemsLength = window.selectAllLimit;
					} else {
						selectedItemsLength = mainTable.getSelectedIndices().length;
					}
				}
			}

			var segmentedButton;
			//			var itemTabBar = dynamicSideContent.getSideContent()[2];
			var itemTabBar = oController.getView().byId(DSCId + "::IconTab");
			if (!itemTabBar) {
				var itemTabBar = sap.ui.getCore().byId(DSCId + "::IconTab");
				//	#164828 -> Approval Integration via Action code(GTM sync ) --Start 
				//				segmentedButton = oController.getView().byId(DSCId + "::SegButton");
				var segmentedButton = oController.getView().byId(DSCId + "::IconTab");
				//	#164828 -> Approval Integration via Action code(GTM sync ) --End
			} else {
				//	#164828 -> Approval Integration via Action code(GTM sync ) --Start 
				//				segmentedButton = oController.getView().byId(DSCId + "::SegButton");
				var segmentedButton = oController.getView().byId(DSCId + "::IconTab");
				//	#164828 -> Approval Integration via Action code(GTM sync ) --End
			}
			//			var sideContentTable =
			//			dynamicSideContent.getSideContent()[1].getItems()[0].getContent()[0];
			var sideContentTable = oController.getView().byId(DSCId + "::Table");
			if (!sideContentTable) {
				var sideContentTable = sap.ui.getCore().byId(DSCId + "::Table");
			}
			//#164828 -> Approval Integration via Action code(GTM sync ) --Start
			var infoText;
			if (selectAllCount) {
				infoText = selectAllCount + " rows Selected";
			} else {
				infoText = selectedItemsLength + " rows Selected";
			}
			//
			viewModel.setProperty("/infoToolbarText", infoText);
			//#164828 -> Approval Integration via Action code(GTM sync ) --End
			// var infoText = selectedItemsLength + " rows Selected";
			// dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[0].setText(infoText);
			// //			Making Apply Button Sticky changes
			// dynamicSideContent.getSideContent()[0].getItems()[2].getContent()[0].getItems()[0].setText(infoText);
			// dynamicSideContent.getSideContent()[0].getItems()[2].removeStyleClass("sapMTB-Transparent-CTX");
			//			dynamicSideContent.getSideContent()[0].getItems()[2].getContent()[0].getItems()[0].getContent()[0].getHeaderToolbar().getContent()[0].getItems()[0].setText(infoText);
			//			dynamicSideContent.getSideContent()[0].getItems()[2].getContent()[0].getItems()[0].getContent()[0].getHeaderToolbar().removeStyleClass("sapMTB-Transparent-CTX");
			//			

			var workspaceviewEntity = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet("WorkspaceView").entityType);
			if (workspaceviewEntity["vui.bodc.workspace.AutoUpdateDisable"] &&
				workspaceviewEntity["vui.bodc.workspace.AutoUpdateDisable"].Bool &&
				workspaceviewEntity["vui.bodc.workspace.AutoUpdateDisable"].Bool == "true") {
				viewModel.setProperty("/" + sEntitySet + "showDscApply", true);
			} else {
				viewModel.setProperty("/" + sEntitySet + "showDscApply", false);
			}
			var allRowsLocked = true;
			var disableDetails = true;
			if (editingStatusDSC == "1") {
				allRowsLocked = false;
				disableDetails = false;
				oController.allRowsLocked = false;
			} else {
				allRowsLocked = true;
				disableDetails = true;
				oController.allRowsLocked = true;
			}
			//				Manual Correction Changes - start
			if (viewModel.getProperty("/addCorrectionLines" + sEntitySet)) {
				disableDetails = false;
				oController.allRowsLocked = false;
			}

			if (
				!allRowsLocked ||
				viewModel.getProperty("/addCorrectionLines" + sEntitySet)
			) {
				//					Manual Correction Changes - end
				if (
					workspaceviewEntity["vui.bodc.workspace.AutoUpdateDisable"] &&
					workspaceviewEntity["vui.bodc.workspace.AutoUpdateDisable"].Bool &&
					workspaceviewEntity["vui.bodc.workspace.AutoUpdateDisable"].Bool ==
					"true"
				) {
					if (sideContentTable.getHeaderToolbar()) {
						sideContentTable.getHeaderToolbar().removeStyleClass("vistex-display-none");
					}
				} else {
					if (sideContentTable.getHeaderToolbar()) {
						sideContentTable.getHeaderToolbar()
							.addStyleClass("vistex-display-none");
					}
				}
				//				if (oToolbar.getContent()[1]) {
				//					oToolbar.getContent()[1].setVisible(true);
				//				}
				//				if (oToolbar.getContent()[2]) {
				//					oToolbar.getContent()[2].setVisible(true);
				//				}
				//				if (oToolbar.getContent()[3]) {
				//					oToolbar.getContent()[3].setVisible(true);
				//				}
			} else {
				if (sideContentTable.getHeaderToolbar()) {
					sideContentTable.getHeaderToolbar().addStyleClass("vistex-display-none");
				}
				//				if (oToolbar.getContent()[1]) {
				//					oToolbar.getContent()[1].setVisible(false);
				//				}
				//				if (oToolbar.getContent()[2]) {
				//					oToolbar.getContent()[2].setVisible(false);
				//				}
				//				if (oToolbar.getContent()[3]) {
				//					oToolbar.getContent()[3].setVisible(false);
				//				}
			}


			if (oController.sidePanelDSC && oController.sidePanelDSC.entitySet == sEntitySet) {
				if (segmentedButton.getItems()[1]) {
					if (oController.sidePanelDSC.showCodes) {
						segmentedButton.getItems()[1].setVisible(true);
					} else {
						segmentedButton.getItems()[1].setVisible(false);
					}
				}
				if (segmentedButton.getItems()[2]) {
					segmentedButton.getItems()[2].setVisible(false);
				}
			} else {
				oController.sidePanelDSC = {};
				oController.sidePanelDSC.entitySet = sEntitySet;
				if (segmentedButton.getItems()[1])
					segmentedButton.getItems()[1].setVisible(false);
				if (segmentedButton.getItems()[2])
					segmentedButton.getItems()[2].setVisible(false);
			}
			//			segmentedButton.getItems()[3].setVisible(false);
			itemTabBar.getItems()[1].removeAllContent();

			var columnData = [{ "col": "row1", "label": "Field" }, { "col": "row2", "label": "Value" }];
			viewModel.setProperty("/columnData", columnData);
			var lineItems;
			if (entity["com.sap.vocabularies.UI.v1.Identification"]) {
				lineItems = entity["com.sap.vocabularies.UI.v1.Identification"];
			} else {
				if (entity["vui.bodc.NonResponsiveLineItem"]) {
					lineItems = entity["vui.bodc.NonResponsiveLineItem"];
				} else {
					lineItems = entity["vui.bodc.ResponsiveLineItem"];
				}
			}
			var valueHelpData = [];
			var valueHelpFields = _.filter(entity.property, function (property) { return property["sap:value-list"] == "fixed-values" });
			_.each(valueHelpFields, function (valueHelpField) {
				var textField = valueHelpField["com.sap.vocabularies.Common.v1.Text"].Path.split("/")[1];
				var keyField = _.find(valueHelpField["com.sap.vocabularies.Common.v1.ValueList"].Parameters, function (parameter) {
					if (parameter["LocalDataProperty"] && parameter["LocalDataProperty"].PropertyPath == valueHelpField.name) {
						return parameter;
					}
				});
				keyField = keyField.ValueListProperty.String;
				//				valueHelpData.key = valueHelpField.name;
				oModel.read("/" + valueHelpField["com.sap.vocabularies.Common.v1.ValueList"].CollectionPath.String, {
					success: function (oData, response) {
						var Data = [];
						_.each(oData.results, function (result) {
							Data.push({ "key": result[keyField], "value": result[textField] });
						});
						valueHelpData.push({ "key": valueHelpField.name, "data": Data });
					}
				});
			});
			setTimeout(function () {
				_.each(lineItems, function (item) {
					if (item.Value.Path !== "edtst") {
						var cellData = [], multiFieldData = [];
						var cellType = "standard", fieldEnabled = true;
						var cellProperties = _.find(entity["property"], { name: item.Value.Path });
						//						Required Changes
						var required = false;
						if (cellProperties['com.sap.vocabularies.UI.v1.Mandatory'] && cellProperties['com.sap.vocabularies.UI.v1.Mandatory'].Bool) {
							required = true;
						}
						//						
						var nonResponsiveLineItem;
						if (lineItems) {
							nonResponsiveLineItem = lineItems.find(function (nrlitem) { return nrlitem.Value && nrlitem.Value.Path == item.Value.Path });
						}
						if (!nonResponsiveLineItem || (nonResponsiveLineItem && !nonResponsiveLineItem["vui.bodc.MultiInput"])) {
							multiFieldData.push({ "Text": "< Keep Existing Values >", "Key": "< Keep Existing Values >", "field": "ExistingValues" });
							multiFieldData.push({ "Text": "< Leave Blank >", "Key": "< Leave Blank >", "field": "LeaveBlank" });
							cellData.push({ "Text": "< Keep Existing Values >", "Key": "< Keep Existing Values >", "field": "ExistingValues" });
							//							Required Changes							
							if (!required) {
								cellData.push({ "Text": "< Leave Blank >", "Key": "< Leave Blank >", "field": "LeaveBlank" });
							}
							//							
							if (cellProperties.type == "Edm.DateTime") {
								cellData.push({ "Text": "< Select New Date >", "Key": "< Select New Date >", "field": "SelectNewDate" });
								cellType = "Date";
							}
							else if (cellProperties["sap:unit"]) {
								cellType = "multiField";
							}
							if (cellProperties['sap:value-list'] && cellProperties['sap:value-list'] == "standard") {
								cellData.push({ "Text": "< Use Value Help >", "Key": "< Use Value Help >", "field": "UseValueHelp" });
								cellType = "ValueHelp";
							}
							if (cellProperties['sap:value-list'] && cellProperties['sap:value-list'] == "fixed-values") {
								cellType = "DropDown";
							}
							if ((cellProperties['com.sap.vocabularies.UI.v1.ReadOnly'] && cellProperties['com.sap.vocabularies.UI.v1.ReadOnly'].Bool == "true") ||
								(cellProperties["com.sap.vocabularies.Common.v1.FieldControl"] && cellProperties["com.sap.vocabularies.Common.v1.FieldControl"].EnumMember == "com.sap.vocabularies.Common.v1.FieldControlType/ReadOnly")) {
								fieldEnabled = false;
							}
							// VHD#737628 -> Multiselect functionality is not working fine --Start
							var cellDataLength = cellData.length;
							// VHD#737628 -> Multiselect functionality is not working fine --End
							_.each(selectedRows, function (selectedRow) {
								if (selectedRow) {
									selectedPath = selectedRow.getPath();
									selectedRowData = oModel.getProperty(selectedPath);
									//									Manual Correction Changes - start
									if (
										oController.correction_row_id &&
										oController.correction_row_id[sEntitySet] &&
										oController.correction_row_id[sEntitySet][
										selectedRowData.row_id
										]
									) {
										var correction_row_id =
											oController.correction_row_id[sEntitySet][
											selectedRowData.row_id
											];
										var selectedPath1 = selectedPath.split("(")[0];
										selectedPath = selectedPath.split("(")[1].replace(
											selectedRowData.row_id,
											correction_row_id
										);
										selectedPath = selectedPath1 + "(" + selectedPath;
									}
									//									Manual Correction Changes - end

									selectedRowData = oModel.getProperty(selectedPath);

									if (cellType == "multiField") {
										multiFieldData.push({
											"Text": selectedRowData[cellProperties["sap:unit"]],
											"Key": selectedRowData[cellProperties["sap:unit"]]
										});
									}
									if (cellType == "Date") {
										// var date = new Date(selectedRowData[item.Value.Path]);
										// var fieldValue = date.getDate() + "-" + (date.getMonth() + 1) + "-" + date.getFullYear();
										// cellData.push({
										// 	"Text": fieldValue,
										// 	"Key": fieldValue,
										// 	"field": item.Value.Path
										// });
										// VHD#737628 -> Multiselect functionality is not working fine --Start
										var oDateFormat = sap.ui.core.format.DateFormat.getInstance(
											{ pattern: "dd-MM-yyyy" }
										);
										if (selectedRowData[item.Value.Path]) {

											var fieldValue =
												zvui.work.controller.AnnotationHelper.getChangeDateFormat(
													selectedRowData[item.Value.Path]
												);

											var formattedDate = oDateFormat.format(
												selectedRowData[item.Value.Path]
											);
											cellData.push({
												Text: fieldValue,
												Key: formattedDate,
												field: item.Value.Path,
											});
										}
										// VHD#737628 -> Multiselect functionality is not working fine --End
									} else if (cellType != "DropDown") {
										var itemValue = oController.getItemValueByText(item, selectedRowData, entity, fieldEnabled, selectedRow);
										cellData.push({
											"Text": itemValue,
											"Key": selectedRowData[item.Value.Path],
											"field": item.Value.Path
										});
									}
								}
							});
							if (cellType == "DropDown") {
								//								var textField =
								//								cellProperties["com.sap.vocabularies.Common.v1.Text"].Path.split("/")[1];
								//								var keyField =
								//								_.find(cellProperties["com.sap.vocabularies.Common.v1.ValueList"].Parameters,function(parameter){
								//								if(parameter["LocalDataProperty"] &&
								//								parameter["LocalDataProperty"].PropertyPath == item.Value.Path){
								//								return parameter;
								//								}
								//								});
								//								keyField = keyField.ValueListProperty.String;
								//								var contextPresent = false;
								//								_.each(oModel.mContexts,function(context){
								//								if(context.sPath.indexOf(cellProperties["com.sap.vocabularies.Common.v1.ValueList"].CollectionPath.String)
								//								> -1){
								//								contextPresent = true;
								//								var dropdownvalue = oModel.getProperty(context.sPath);
								//								cellData.push({"Text": dropdownvalue[textField],
								//								"Key": dropdownvalue[keyField],
								//								"field": item.Value.Path});
								//								}
								//								});
								var requiredData = _.find(valueHelpData, { key: item.Value.Path });
								if (requiredData) {
									_.each(requiredData.data, function (result) {
										cellData.push({
											"Text": result["value"],
											"Key": result["key"],
											"field": item.Value.Path
										});
									});
								}
							}
							cellData = getUnique(cellData);
							// VHD#737628 -> Multiselect functionality is not working fine --Start
							var sameValueExist = false;
							var sameValue;
							if (cellData.length - cellDataLength == 1) {
								sameValueExist = true;
								sameValue = cellData[cellData.length - 1].Text;
								if (cellType == "ValueHelp" && cellProperties["sap:text"]) {
									if (
										selectedRowData[cellProperties["sap:text"].split("/")[0]] &&
										selectedRowData[cellProperties["sap:text"].split("/")[0]]
											.__ref
									) {
										sameValue = oModel.getProperty(
											"/" +
											selectedRowData[
												cellProperties["sap:text"].split("/")[0]
											].__ref
										)[cellProperties["sap:text"].split("/")[1]];
									} else {
										sameValue = "";
									}
								} else if (cellType == "multiField") {
									var noofdecimal = nonResponsiveLineItem.NoOfDecimals;
									sameValue =
										zvui.work.controller.AnnotationHelper.formatDeimalValue(
											sameValue,
											noofdecimal,
											selectedRowData[cellProperties["sap:unit"]]
										);
								}

								if (!sameValue) {
									sameValue = cellData[cellData.length - 1].Text;
								}
							}
							// VHD#737628 -> Multiselect functionality is not working fine --End
							multiFieldData = getUnique(multiFieldData);
							if (cellProperties && cellProperties["com.sap.vocabularies.Common.v1.Label"] && cellProperties["com.sap.vocabularies.Common.v1.Label"].String) {
								tableData.push({
									"row1": cellProperties["com.sap.vocabularies.Common.v1.Label"].String,
									"row2": cellData,
									"type": cellType,
									"multiField": multiFieldData,
									"dataType": cellProperties.type,
									"field": item.Value.Path,
									"enable": fieldEnabled,
									//									Required Changes
									"required": required,
									//	
									// VHD#737628 -> Multiselect functionality is not working fine --Start
									sameValueExist: sameValueExist,
									sameValue: sameValue,
									// VHD#737628 -> Multiselect functionality is not working fine --End								
									"unit": cellProperties['sap:unit']
								});
							}
						}
					}
				});
				sideContentTable.removeAggregation("items");
				sideContentTable.destroyAggregation("items");
				sideContentTable.bindAggregation("items", "viewModel>/itemsData" + DSCId, function (sId, oContext) {
					var contextObject = oContext.getObject();
					var fcat_data = viewModel.getProperty("/columnData");
					var cells = [];
					_.each(fcat_data, function (obj) {
						if (obj.col != "row1") {
							if (contextObject.enable && !allRowsLocked) {
								if (contextObject.type == "standard") {
									var combobox = new sap.m.ComboBox({
										//										width: "150px",
										change: [oController.onBulkeditChanges, oController],
										enabled: contextObject.enable
									}).bindValue("viewModel>" + obj["col"] + "/0/Key", null, sap.ui.model.BindingMode.TwoWay);
									// VHD#737628 -> Multiselect functionality is not working fine --Start
									combobox.bindAggregation("items", "viewModel>" + obj["col"], new sap.ui.core.Item({
										text: "{viewModel>Text}", key: "{viewModel>Key}"
									}));
									combobox.addCustomData(new sap.ui.core.CustomData({ "key": "dataType", "value": contextObject.dataType }));
									combobox.addCustomData(new sap.ui.core.CustomData({ "key": "field", "value": contextObject.field }));
									// VHD#737628 -> Multiselect functionality is not working fine --End
									cells.push(combobox);
								} else if (contextObject.type == "ValueHelp") {
									var combobox = new sap.m.ComboBox({
										//										width: "150px",
										change: [oController.onValueHelpRequest, oController],
										enabled: contextObject.enable
									}).bindValue("viewModel>" + obj["col"] + "/0/Key", null, sap.ui.model.BindingMode.TwoWay);
									combobox.bindAggregation("items", "viewModel>" + obj["col"], new sap.ui.core.Item({
										text: "{viewModel>Text}", key: "{viewModel>Key}"
									}));
									combobox.addCustomData(new sap.ui.core.CustomData({ "key": "dataType", "value": contextObject.dataType }));
									combobox.addCustomData(new sap.ui.core.CustomData({ "key": "field", "value": contextObject.field }));
									cells.push(combobox);
								} else if (contextObject.type == "DropDown") {
									var combobox = new sap.m.ComboBox({
										//										width: "150px",
										change: [oController.onValueValidation, oController],
										enabled: contextObject.enable
									}).bindValue("viewModel>" + obj["col"] + "/0/Key", null, sap.ui.model.BindingMode.TwoWay);
									combobox.bindAggregation("items", "viewModel>" + obj["col"], new sap.ui.core.Item({
										text: "{viewModel>Text}", key: "{viewModel>Key}"
									}));
									combobox.addCustomData(new sap.ui.core.CustomData({ "key": "dataType", "value": contextObject.dataType }));
									combobox.addCustomData(new sap.ui.core.CustomData({ "key": "field", "value": contextObject.field }));
									cells.push(combobox);
								} else if (contextObject.type == "Date") {
									var combobox = new sap.m.ComboBox({
										//										width: "150px",
										change: [oController.onDateChange, oController],
										enabled: contextObject.enable
									}).bindValue("viewModel>" + obj["col"] + "/0/Key", null, sap.ui.model.BindingMode.TwoWay);
									combobox.bindAggregation("items", "viewModel>" + obj["col"], new sap.ui.core.Item({
										text: "{viewModel>Text}", key: "{viewModel>Key}"
									}));
									combobox.addCustomData(new sap.ui.core.CustomData({ "key": "dataType", "value": contextObject.dataType }));
									combobox.addCustomData(new sap.ui.core.CustomData({ "key": "field", "value": contextObject.field }));
									cells.push(combobox);
								} else if (contextObject.type == "multiField") {
									var combobox = new sap.m.ComboBox({
										//										width: "90px",
										enabled: contextObject.enable
									}).bindValue("viewModel>" + obj["col"] + "/0/Key", null, sap.ui.model.BindingMode.TwoWay);
									combobox.bindAggregation("items", "viewModel>" + obj["col"], new sap.ui.core.Item({
										text: "{viewModel>Text}", key: "{viewModel>Key}"
									}));
									combobox.addCustomData(new sap.ui.core.CustomData({ "key": "dataType", "value": contextObject.dataType }));
									combobox.addCustomData(new sap.ui.core.CustomData({ "key": "field", "value": contextObject.field }));
									combobox.addCustomData(new sap.ui.core.CustomData({ "key": "multiField", "value": contextObject.unit }));

									var combobox1 = new sap.m.ComboBox({
										//										width: "80px",
										enabled: contextObject.enable
									}).bindValue("viewModel>" + "multiField" + "/0/Key", null, sap.ui.model.BindingMode.TwoWay);
									combobox1.bindAggregation("items", "viewModel>" + "multiField", new sap.ui.core.Item({
										text: "{viewModel>Text}", key: "{viewModel>Key}"
									}));

									var hbox = new sap.m.HBox({
										items: [combobox, combobox1]
									}).addStyleClass("rightMargin");
									cells.push(hbox);
								} else {
									var combobox = new sap.m.ComboBox({
										//										width: "150px",
										enabled: contextObject.enable
									}).bindValue("viewModel>" + obj["col"] + "/0/Key", null, sap.ui.model.BindingMode.TwoWay);
									combobox.bindAggregation("items", "viewModel>" + obj["col"], new sap.ui.core.Item({
										text: "{viewModel>Text}", key: "{viewModel>Key}"
									}));
									combobox.addCustomData(new sap.ui.core.CustomData({ "key": "dataType", "value": contextObject.dataType }));
									combobox.addCustomData(new sap.ui.core.CustomData({ "key": "field", "value": contextObject.field }));
									cells.push(combobox);
								}
							} else {
								// var text = new sap.m.Label({ text: "(multiple)" });
								// VHD#737628 -> Multiselect functionality is not working fine --Start
								var text;

								if (contextObject.sameValueExist) {
									//								if(contextObject.multiField && contextObject.multiField[2] && contextObject.multiField[2].Text){
									//									text = new sap.m.Label({text: contextObject.sameValue + " " + contextObject.multiField[2].Text});
									//								}else{
									//									text = new sap.m.Label({text: contextObject.sameValue});
									//								}
									text = new sap.m.Label({ text: contextObject.sameValue });

								} else {
									text = new sap.m.Label({ text: "(multiple)" });
								}
								// VHD#737628 -> Multiselect functionality is not working fine --End
								cells.push(text);
							}
						} else {
							//							Required Changes
							var text = new sap.m.Label({ design: "Bold", wrapping: true, required: contextObject["required"] }).bindProperty("text", "viewModel" + ">" + obj["col"], null, sap.ui.model.BindingMode.OneWay);
							//							
							cells.push(text);
						}
					});
					var selectedPath = "";
					if (selectedRows && selectedRows[0] && selectedRows[0].getPath) {
						selectedPath = selectedRows[0].getPath()
					}
					return new sap.m.ColumnListItem({
						cells: cells,
						type: "Active",
						// changes from du8
					}).addStyleClass("noPadding").data("selectedPath", selectedRows[0].getPath());
					// chnages from du8
				});
				viewModel.setProperty("/itemsData" + DSCId, tableData);
				viewModel.setProperty("/bulkEditCode", {});
				viewModel.setProperty("/bulkEditCode/codesEntity", []);
				var codesEntity = [];
				if (entity.navigationProperty && entity.navigationProperty.length > 0) {
					for (var i = 0; i < entity.navigationProperty.length; i++) {
						oTargetEntity = oMetaModel.getODataEntityType(oMetaModel.getODataAssociationEnd(entity, entity.navigationProperty[i].name).type);
						if (oTargetEntity && oTargetEntity['vui.bodc.workspace.CodesEditable']) {
							// if (segmentedButton.getItems()[1])
							// 	segmentedButton.getItems()[1].setVisible(true);
							// oController.sidePanelDSC.showCodes = true;
							// oController.prepareCodesSection = true;
							oController.codesAllRowsLocked = true;
							oController.codesDetails = {
								allRowsLocked: allRowsLocked,
								urlParameters: urlParameters
							};

							//							Manual Correction Changes - start
							if (viewModel.getProperty("/addCorrectionLines" + sEntitySet)) {
								oController.codesDetails = {
									allRowsLocked: true,
									urlParameters: urlParameters,
								};
							}
							//
							if (oTargetEntity["vui.bodc.workspace.DisplayCodesInDetail"] &&
								oTargetEntity["vui.bodc.workspace.DisplayCodesInDetail"].Bool
							) {
								oController.sidePanelDSC.displayCodesInDetail = true;
							} else {
								if (segmentedButton.getItems()[1])
									segmentedButton.getItems()[1].setVisible(true);
								oController.sidePanelDSC.showCodes = true;
								oController.prepareCodesSection = true;
								var editablelistEntity = oMetaModel.getODataAssociationSetEnd(entity, entity.navigationProperty[i].name).entitySet;
								codesEntity.push(editablelistEntity);
							}

							//							viewModel.setProperty("/bulkEditCode/" + editablelistEntity,{});
							//							viewModel.setProperty("/bulkEditCode/" + editablelistEntity +
							//							"/entityName",editablelistEntity);
							//							var codesList = new sap.m.List();
							//							var singleSelect = false;
							//							if(oTargetEntity["vui.bodc.workspace.SingleSelect"] &&
							//							oTargetEntity["vui.bodc.workspace.SingleSelect"].Bool){
							//							singleSelect = true;
							//							}

							//							var codeListItemPath = "viewModel>/bulkEditCode/" + editablelistEntity +
							//							"/itemsData";
							//							codesList.bindAggregation("items",codeListItemPath,function(sId,oContext){
							//							if(allRowsLocked){
							//							return new sap.m.CustomListItem({
							//							content: new sap.m.CheckBox({
							//							selected:"{viewModel>seltd}",
							//							enabled:false,
							//							partiallySelected:"{viewModel>psltd}",
							//							text:"{viewModel>text}"
							//							})
							//							});
							//							}else{
							//							return new sap.m.CustomListItem({
							//							content: new sap.m.CheckBox({
							//							select: [oController.onCodeListSelectionChange, oController],
							//							selected:"{viewModel>seltd}",
							//							enabled:"{= ${viewModel>seltd_fc} === 3 }",
							//							partiallySelected:"{viewModel>psltd}",
							//							text:"{viewModel>text}"
							//							}).data("singleSelect",singleSelect)
							//							.data("entity",editablelistEntity)
							//							});
							//							}
							//							// return new sap.m.CustomListItem({
							//							// content: new sap.m.CheckBox({
							//							// selected:"{viewModel>seltd}",
							//							// enabled:"{= ${viewModel>seltd_fc} === 3 }",
							//							// partiallySelected:"{viewModel>psltd}",
							//							// text:"{viewModel>text}"
							//							// })
							//							// });

							//							});
							//							var oCodesToolbar = new sap.m.Toolbar();
							//							oCodesToolbar.addContent(new sap.m.Title({
							//							text:
							//							oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"]["TypeName"].String
							//							}));
							//							oCodesToolbar.addContent(new sap.m.ToolbarSpacer());
							//							if(!allRowsLocked){
							//							var oCodesApplyButton = new sap.m.Button({
							//							type: "Emphasized",
							//							press: [oController.onDscApply,oController],
							//							text:"{i18n>APPLY}",
							//							visible:"{viewModel>/" + sEntitySet +"showDscApply}"
							//							}).data("codes",true);
							//							oCodesApplyButton.data("codeEntity", editablelistEntity);
							//							oCodesToolbar.addContent(oCodesApplyButton);
							//							}

							//							codesList.setHeaderToolbar(oCodesToolbar);
							//							// codesList.bindElement("/" + listEntity);
							//							itemTabBar.getItems()[1].addContent(codesList);

							//							oModel.read("/" + editablelistEntity,{
							//							urlParameters: urlParameters,
							//							success: function(oData,response , test){
							//							if(oData.results[0]){
							//							var responseEntity =
							//							oData.results[0].__metadata.type.split(".")[oData.results[0].__metadata.type.split(".").length
							//							- 1].split("Type")[0];
							//							viewModel.setProperty("/bulkEditCode/" + responseEntity + "/itemsData",
							//							$.extend(true,{},oData.results));
							//							viewModel.setProperty("/bulkEditCode/" + responseEntity +
							//							"/referenceItemsData",$.extend(true,{},oData.results));
							//							}
							//							}
							//							});

							// break;
						} else if (oTargetEntity && oTargetEntity['vui.bodc.workspace.CodesNonEditable']) {
							if (segmentedButton.getItems()[1])
								segmentedButton.getItems()[1].setVisible(true);
							oController.sidePanelDSC.showCodes = true;
							oController.prepareCodesSection = true;
							/*
							 * var listEntity =
							 * oMetaModel.getODataAssociationSetEnd(entity,entity.navigationProperty[i].name).entitySet;
							 * var codesList = new sap.ui.comp.smartlist.SmartList({
							 * entitySet: listEntity, header:
							 * oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"]["TypeName"].String,
							 * showRowCount: false, enableAutoBinding:true,
							 * listItemTemplate: new sap.m.StandardListItem({
							 * title:"{text}", // description:"{text}" }) // new
							 * sap.m.CustomListItem({ // content: new sap.m.CheckBox({ //
							 * selected:"{seltd}", // enabled:"{= ${seltd_fc} === 3 }", //
							 * partiallySelected:"{psltd}", // text:"{text}" // }) // })
							 * }); // codesList.bindElement("/" + listEntity);
							 * itemTabBar.getItems()[1].addContent(codesList);
							 */

						}
					}
				}

				viewModel.setProperty("/bulkEditCode/codesEntity", codesEntity);
				//	#164828 -> Approval Integration via Action code(GTM sync ) --Start
				if (oController.sidePanelDSC.displayCodesInDetail) {
					//				oCodeListItems =
					oController.displayCodesInDetail(DSCId, selectedRows, dynamicSideContent, mainTable.getParent(), editingStatusDSC);
				}
				// ********************************* Hiding the Splitter Bar ******************************************
				else {
					sideContentTable.getParent().getParent().getContentAreas()[0].setLayoutData(
						new sap.ui.layout.SplitterLayoutData({ size: "100%" })
					);
					sideContentTable.getParent().getParent().getContentAreas()[1].removeAllContent();
					setTimeout(function () {
						sideContentTable.getParent().getParent().$().addClass("hideSplitterBar");
					}, 500);
				}
				// ********************************* Hiding the Splitter Bar ******************************************
				//	#164828 -> Approval Integration via Action code(GTM sync ) --End
				//				}
				//				});



				//				if(!viewModel.getProperty("/DSCSegmentedButtonSelectedKey")){
				if (segmentedButton.getItems()[0]) {
					// segmentedButton.getItems()[0].firePress();
					// segmentedButton.getButtons()[0].firePress();
					//#164828 -> Approval Integration via Action code(GTM sync ) --Start 
					segmentedButton.setSelectedKey(segmentedButton.getItems()[0].getKey());
					//#164828 -> Approval Integration via Action code(GTM sync ) --End
				}
				//				}else{
				//				var DSCSegmentedButtonSelectedKey =
				//				viewModel.getProperty("/DSCSegmentedButtonSelectedKey");
				//				for(var i=0; i<segmentedButton.getButtons().length; i++){
				//				if(segmentedButton.getItems()[i].getKey() === DSCSegmentedButtonSelectedKey){
				//				segmentedButton.getItems()[i].firePress();
				//				segmentedButton.getButtons()[i].firePress();
				//				segmentedButton.setSelectedKey(segmentedButton.getItems()[i].getKey());
				//				break;
				//				}
				//				}
				//				}

				function getUnique(array) {
					var uniqueArray = [];

					// Loop through array values
					for (var i = 0; i < array.length; i++) {
						var value = array[i];
						if (_.findIndex(uniqueArray, { Key: value.Key }) === -1) {
							uniqueArray.push(value);
						}
					}
					return uniqueArray;
				}
				//				},

				//				});
				oModel.submitChanges({
					batchGroupId: "changes"
				});

				//				setTimeout(function(){
				//				itemTabBar.getItems()[1].setVisible(false);
				//				itemTabBar.removeAllContent();
				//				if(entity.navigationProperty && entity.navigationProperty.length > 0){
				//				for(var i=0 ; i<entity.navigationProperty.length; i++){
				//				oTargetEntity =
				//				oMetaModel.getODataEntityType(oMetaModel.getODataAssociationEnd(entity,entity.navigationProperty[i].name).type);
				//				if(oTargetEntity && oTargetEntity['vui.bodc.workspace.CodesEditable']){
				//				itemTabBar.getItems()[1].setVisible(true);
				//				var listEntity =
				//				oMetaModel.getODataAssociationSetEnd(entity,entity.navigationProperty[i].name).entitySet;
				//				var codesList = new sap.ui.comp.smartlist.SmartList({
				//				entitySet: listEntity,
				//				enableAutoBinding:true,
				//				listItemTemplate: new sap.m.CustomListItem({
				//				content: new sap.m.CheckBox({
				//				selected:"{seltd}",
				//				enabled:"{= ${seltd_fc} === 3 }",
				//				partiallySelected:"{psltd}",
				//				text:"{text}"
				//				})
				//				})
				//				});
				//				codesList.bindElement("/" + listEntity);
				//				itemTabBar.addContent(codesList);
				//				// break;
				//				}
				//				}
				//				}
				//				var columnData = [{"col":"row1","label":"Field"},{"col":"row2","label":
				//				"Value"}];
				//				viewModel.setProperty("/columnData",columnData);
				//				_.each(entity["com.sap.vocabularies.UI.v1.LineItem"],function(item){
				//				var cellData = [], multiFieldData=[];
				//				var cellType = "standard", fieldEnabled = true;
				//				var cellProperties = _.find(entity["property"],{name: item.Value.Path});
				//				multiFieldData.push({"Text":"< Keep Existing Values >","Key":"< Keep Existing
				//				Values >","field":"ExistingValues"});
				//				multiFieldData.push({"Text":"< Leave Blank >","Key":"Leave
				//				Blank","field":"LeaveBlank"});
				//				cellData.push({"Text":"< Keep Existing Values >","Key":"< Keep Existing
				//				Values >","field":"ExistingValues"});
				//				cellData.push({"Text":"< Leave Blank >","Key":"Leave
				//				Blank","field":"LeaveBlank"});
				//				if(cellProperties.type == "Edm.DateTime"){
				//				cellData.push({"Text":"< Select New Date >","Key":"Select New
				//				Date","field":"SelectNewDate"});
				//				cellType = "Date";
				//				}
				//				else if(cellProperties["sap:unit"]){
				//				cellType = "multiField";
				//				}
				//				if(cellProperties['sap:value-list'] && cellProperties['sap:value-list'] ==
				//				"standard"){
				//				cellData.push({"Text":"< Use Value Help >","Key":"Use Value
				//				Help","field":"UseValueHelp"});
				//				cellType = "ValueHelp";
				//				}
				//				if(cellProperties['sap:value-list'] && cellProperties['sap:value-list'] ==
				//				"fixed-values"){
				//				cellType = "DropDown";
				//				}
				//				if(cellProperties['com.sap.vocabularies.UI.v1.ReadOnly'] &&
				//				cellProperties['com.sap.vocabularies.UI.v1.ReadOnly'].Bool == "true"){
				//				fieldEnabled = false;
				//				}
				//				_.each(selectedRows,function(selectedRow){
				//				if(selectedRow){
				//				selectedPath = selectedRow.getPath();
				//				selectedRowData = oModel.getProperty(selectedPath);
				//				if(cellType == "multiField"){
				//				multiFieldData.push({"Text": selectedRowData[cellProperties["sap:unit"]],
				//				"Key": selectedRowData[cellProperties["sap:unit"]]});
				//				}
				//				cellData.push({"Text": selectedRowData[item.Value.Path],
				//				"Key": selectedRowData[item.Value.Path],
				//				"field": item.Value.Path});
				//				}
				//				});
				//				cellData = getUnique(cellData);
				//				multiFieldData = getUnique(multiFieldData);
				//				tableData.push({"row1":
				//				cellProperties["com.sap.vocabularies.Common.v1.Label"].String,
				//				"row2": cellData,
				//				"type": cellType,
				//				"multiField": multiFieldData,
				//				"dataType": cellProperties.type,
				//				"field": item.Value.Path,
				//				"enable": fieldEnabled,
				//				"unit": cellProperties['sap:unit']});
				//				});
				//				sideContentTable.removeAggregation("items");
				//				sideContentTable.destroyAggregation("items");
				//				sideContentTable.bindAggregation("items","viewModel>/itemsData",function(sId,oContext){
				//				var contextObject = oContext.getObject();
				//				var fcat_data = viewModel.getProperty("/columnData");
				//				var cells = [];
				//				_.each(fcat_data,function(obj){
				//				if(obj.col != "row1"){
				//				if(contextObject.enable){
				//				if(contextObject.type == "standard"){
				//				var combobox = new sap.m.ComboBox({
				//				width: "150px",
				//				enabled: contextObject.enable
				//				}).bindValue("viewModel>" + obj["col"] +
				//				"/0/Key",null,sap.ui.model.BindingMode.TwoWay);
				//				combobox.bindAggregation("items", "viewModel>"+obj["col"],new
				//				sap.ui.core.Item({
				//				text: "{viewModel>Text}"}));
				//				combobox.addCustomData(new sap.ui.core.CustomData({"key": "dataType","value":
				//				contextObject.dataType}));
				//				combobox.addCustomData(new sap.ui.core.CustomData({"key": "field","value":
				//				contextObject.field}));
				//				cells.push(combobox);
				//				}else if(contextObject.type == "ValueHelp"){
				//				var combobox = new sap.m.ComboBox({
				//				width: "150px",
				//				change:[oController.onValueHelpRequest, oController],
				//				enabled: contextObject.enable
				//				}).bindValue("viewModel>" + obj["col"] +
				//				"/0/Key",null,sap.ui.model.BindingMode.TwoWay);
				//				combobox.bindAggregation("items", "viewModel>"+obj["col"],new
				//				sap.ui.core.Item({
				//				text: "{viewModel>Text}"}));
				//				combobox.addCustomData(new sap.ui.core.CustomData({"key": "dataType","value":
				//				contextObject(Type}));
				//				combobox.addCustomData(new sap.ui.core.CustomData({"key": "field","value":
				//				contextObject.field}));
				//				cells.push(combobox);
				//				}else if(contextObject.type == "DropDown"){
				//				var combobox = new sap.m.ComboBox({
				//				width: "150px",
				//				change: [oController.onValueValidation, oController],
				//				enabled: contextObject.enable
				//				}).bindValue("viewModel>" + obj["col"] +
				//				"/0/Key",null,sap.ui.model.BindingMode.TwoWay);
				//				combobox.bindAggregation("items", "viewModel>"+obj["col"],new
				//				sap.ui.core.Item({
				//				text: "{viewModel>Text}"}));
				//				combobox.addCustomData(new sap.ui.core.CustomData({"key": "dataType","value":
				//				contextObject.dataType}));
				//				combobox.addCustomData(new sap.ui.core.CustomData({"key": "field","value":
				//				contextObject.field}));
				//				cells.push(combobox);
				//				}else if(contextObject.type == "Date"){
				//				var combobox = new sap.m.ComboBox({
				//				width: "150px",
				//				change: [oController.onDateChange, oController],
				//				enabled: contextObject.enable
				//				}).bindValue("viewModel>" + obj["col"] +
				//				"/0/Key",null,sap.ui.model.BindingMode.TwoWay);
				//				combobox.bindAggregation("items", "viewModel>"+obj["col"],new
				//				sap.ui.core.Item({
				//				text: "{viewModel>Text}"}));
				//				combobox.addCustomData(new sap.ui.core.CustomData({"key": "dataType","value":
				//				contextObject.dataType}));
				//				combobox.addCustomData(new sap.ui.core.CustomData({"key": "field","value":
				//				contextObject.field}));
				//				cells.push(combobox);
				//				}else if(contextObject.type == "multiField"){
				//				var combobox = new sap.m.ComboBox({
				//				width: "90px",
				//				enabled: contextObject.enable
				//				}).bindValue("viewModel>" + obj["col"] +
				//				"/0/Key",null,sap.ui.model.BindingMode.TwoWay);
				//				combobox.bindAggregation("items", "viewModel>"+obj["col"],new
				//				sap.ui.core.Item({
				//				text: "{viewModel>Text}"}));
				//				combobox.addCustomData(new sap.ui.core.CustomData({"key": "dataType","value":
				//				contextObject.dataType}));
				//				combobox.addCustomData(new sap.ui.core.CustomData({"key": "field","value":
				//				contextObject.field}));
				//				combobox.addCustomData(new sap.ui.core.CustomData({"key":
				//				"multiField","value": contextObject.unit}));

				//				var combobox1 = new sap.m.ComboBox({
				//				width: "80px",
				//				enabled: contextObject.enable
				//				}).bindValue("viewModel>" + "multiField" +
				//				"/0/Key",null,sap.ui.model.BindingMode.TwoWay);
				//				combobox1.bindAggregation("items", "viewModel>"+"multiField",new
				//				sap.ui.core.Item({
				//				text: "{viewModel>Text}"}));

				//				var hbox = new sap.m.HBox({
				//				items: [combobox, combobox1]
				//				}).addStyleClass("rightMargin");
				//				cells.push(hbox);
				//				}else{
				//				var combobox = new sap.m.ComboBox({
				//				width: "150px",
				//				enabled: contextObject.enable
				//				}).bindValue("viewModel>" + obj["col"] +
				//				"/0/Key",null,sap.ui.model.BindingMode.TwoWay);
				//				combobox.bindAggregation("items", "viewModel>"+obj["col"],new
				//				sap.ui.core.Item({
				//				text: "{viewModel>Text}"}));
				//				combobox.addCustomData(new sap.ui.core.CustomData({"key": "dataType","value":
				//				contextObject.dataType}));
				//				combobox.addCustomData(new sap.ui.core.CustomData({"key": "field","value":
				//				contextObject.field}));
				//				cells.push(combobox);
				//				}
				//				}else{
				//				var text = new sap.m.Label({text: "(multiple)"});
				//				cells.push(text);
				//				}
				//				}else{
				//				var text = new sap.m.Label({design: "Bold"}).bindProperty("text","viewModel"
				//				+ ">" + obj["col"],null,sap.ui.model.BindingMode.OneWay);
				//				cells.push(text);
				//				}
				//				});
				//				return new sap.m.ColumnListItem({
				//				cells: cells,
				//				type: "Active",
				//				}).addStyleClass("noPadding");
				//				});
				//				viewModel.setProperty("/itemsData",tableData);

				//				function getUnique(array){
				//				var uniqueArray = [];

				//				// Loop through array values
				//				for(var value of array){
				//				if(_.findIndex(uniqueArray, {Text: value.Text}) === -1){
				//				uniqueArray.push(value);
				//				}
				//				}
				//				return uniqueArray;
				//				}
				//				}, 1000);
			}, 500);
		},

		onShowDsc: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			//			var currentSectionId =
			//			oEvent.getSource().getParent().getParent().getSelectedSection();
			//			var dynamicSideContent =
			//			oController.getView().byId(currentSectionId).getSubSections()[0].getBlocks()[0].getContent()[0];
			var currentRoute = viewModel.getProperty("/currentRoute");
			if (currentRoute == "Detail") {
				viewModel.setProperty("/DetailshowHideDsc", true);
			} else if (currentRoute == "DetailDetail") {
				viewModel.setProperty("/DetailDetailshowHideDsc", true);
			}
			//			var dynamicSideContent =
			//			oController.getDynamicSideContent(oEvent.getSource());
			var dynamicSideContent = oController.getResponsiveSplitter(oEvent.getSource());
			if (dynamicSideContent.getMainContent) {
				if (dynamicSideContent.getMainContent()[1]) {
					var mainContentTable = dynamicSideContent.getMainContent()[1].getTable();
				} else {
					var mainContentTable = dynamicSideContent.getMainContent()[0].getTable();
				}
			} else {
				return;
			}
			if (viewModel.getProperty("/layout") == "TwoColumnsMidExpanded") {
				oController.onCollapse();
			}
			var sEntitySet = mainContentTable.getParent().getEntitySet();
			var entity = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(sEntitySet).entityType);
			var selectedPath;
			if (mainContentTable.getRows) {
				if (mainContentTable.getRows()[0]) {
					selectedPath = mainContentTable.getRows()[0].getBindingContext().getPath();
					mainContentTable.setSelectedIndex(0);
				}
			} else {
				if (mainContentTable.getVisibleItems()[0]) {
					selectedPath = mainContentTable.getVisibleItems()[0].getBindingContextPath();
					mainContentTable.removeSelections();
					mainContentTable.setSelectedItem(mainContentTable.getVisibleItems()[0]);
				}
			} if (selectedPath) {
				dynamicSideContent.setShowSideContent(true);
				viewModel.setProperty("/" + sEntitySet + "showingSideContent", true);
				oController.prepareSideContentData(entity, selectedPath, dynamicSideContent, sEntitySet, mainContentTable.getParent());
			}
		},
		onShowTableDSC: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			//			var dynamicSideContent =
			//			oController.getDynamicSideContent(oEvent.getSource());
			var dynamicSideContent = oController.getResponsiveSplitter(oEvent.getSource());
			if (dynamicSideContent.getMainContent) {
				if (dynamicSideContent.getMainContent()[1]) {
					var mainContentTable = dynamicSideContent.getMainContent()[1].getTable();
				} else {
					var mainContentTable = dynamicSideContent.getMainContent()[0].getTable();
				}
			} else {
				return;
			}
			oController.fromShowTableDSC = true;
			var currentRoute = viewModel.getProperty("/currentRoute");
			if (currentRoute == "Detail") {
				viewModel.setProperty("/DetailshowHideDsc", true);
			} else if (currentRoute == "DetailDetail") {
				viewModel.setProperty("/DetailDetailshowHideDsc", true);
			}
			if (viewModel.getProperty("/layout") == "TwoColumnsMidExpanded") {
				oController.onCollapse();
			}
			var sEntitySet = mainContentTable.getParent().getEntitySet();
			var entity = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(sEntitySet).entityType);
			var selectedPath;
			if (mainContentTable.getRows) {
				selectedPath = oEvent.getSource().getParent().getBindingContext().getPath();
				mainContentTable.setSelectedIndex(oEvent.getSource().getParent().getParent().getIndex());
			} else {
				selectedPath = oEvent.getSource().getParent().getBindingContextPath();
				mainContentTable.removeSelections();
				oEvent.getSource().getParent().setSelected();
			}
			var showingSideContent = viewModel.getProperty("/" + sEntitySet + "showingSideContent");
			if (!showingSideContent && selectedPath) {
				dynamicSideContent.setShowSideContent(true);
				viewModel.setProperty("/" + sEntitySet + "showingSideContent", true);
				viewModel.setProperty("/" + sEntitySet + "showSideContent", true);
				jQuery.sap.delayedCall(100, null, function () {
					mainContentTable.rerender();
				});
				oController.prepareSideContentData(entity, selectedPath, dynamicSideContent, sEntitySet, mainContentTable.getParent());
			}
			oController.fromShowTableDSC = false;
		},
		onCloseTableDSC: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			//			var dynamicSideContent =
			//			oController.getDynamicSideContent(oEvent.getSource());
			var dynamicSideContent = oController.getResponsiveSplitter(oEvent.getSource());
			var currentRoute = viewModel.getProperty("/currentRoute");
			if (currentRoute == "Detail") {
				viewModel.setProperty("/DetailshowHideDsc", false)
			} else if (currentRoute == "DetailDetail") {
				viewModel.setProperty("/DetailDetailshowHideDsc", false)
			}
			//			oEvent.getSource().setVisible(false);
			//			oController.getView().byId(oEvent.getSource().data().id).setVisible(true);
			oController.onClosingDscSideContent(dynamicSideContent);
		},
		onShowDsc1: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var sections = oController.getView().getContent()[0].getSections();

			var currentSectionId = oEvent.getSource().getParent().getParent().getSelectedSection();
			//			var dynamicSideContent =
			//			oController.getView().byId(currentSectionId).getSubSections()[0].getBlocks()[0].getContent()[0];
			//			if(!dynamicSideContent.getMainContent){
			//			dynamicSideContent =
			//			oController.getView().byId(currentSectionId).getSubSections()[0].getBlocks()[0].getContent()[1];
			//			}
			var dynamicSideContent;
			if (oController.isControlOfType(section.getSubSections()[0].getBlocks()[0].getContent()[0], "sap/ui/layout/ResponsiveSplitter")) {
				dynamicSideContent = oController.getView().byId(currentSectionId).getSubSections()[0].getBlocks()[0].getContent()[0];
			} else {
				dynamicSideContent = oController.getView().byId(currentSectionId).getSubSections()[0].getBlocks()[0].getContent()[1];
			}
			//			var dynamicSideContent =
			//			oController.getDynamicSideContent(oEvent.getSource());
			//			oEvent.getSource().setVisible(false);
			//			oController.getView().byId(oEvent.getSource().data().id).setVisible(true);
			_.each(sections, function (section) {
				//				var dynamicSideContent =
				//				section.getSubSections()[0].getBlocks()[0].getContent()[0];
				//				if(!dynamicSideContent.getMainContent){
				//				dynamicSideContent =
				//				section.getSubSections()[0].getBlocks()[0].getContent()[1];
				//				}
				var dynamicSideContent;
				if (oController.isControlOfType(section.getSubSections()[0].getBlocks()[0].getContent()[0], "sap/ui/layout/ResponsiveSplitter")) {
					dynamicSideContent = oController.getResponsiveSplitter(section.getSubSections()[0].getBlocks()[0].getContent()[0]);
				} else {
					dynamicSideContent = oController.getResponsiveSplitter(section.getSubSections()[0].getBlocks()[0].getContent()[1]);
				}
				var currentRoute = viewModel.getProperty("/currentRoute");
				if (currentRoute == "Detail") {
					viewModel.setProperty("/DetailshowHideDsc", true);
				} else if (currentRoute == "DetailDetail") {
					viewModel.setProperty("/DetailDetailshowHideDsc", true);
				}
				if (dynamicSideContent.getMainContent) {
					if (dynamicSideContent.getMainContent()[1]) {
						var mainContentTable = dynamicSideContent.getMainContent()[1].getTable();
					} else {
						var mainContentTable = dynamicSideContent.getMainContent()[0].getTable();
					}
				} else {
					return;
				}
				if (viewModel.getProperty("/layout") == "TwoColumnsMidExpanded") {
					oController.onCollapse();
				}
				var sEntitySet = mainContentTable.getParent().getEntitySet();
				var entity = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(sEntitySet).entityType);
				var selectedPath;
				if (mainContentTable.getRows) {
					if (mainContentTable.getRows()[0]) {
						selectedPath = mainContentTable.getRows()[0].getBindingContext().getPath();
						mainContentTable.setSelectedIndex(0);
					}
				} else {
					if (mainContentTable.getVisibleItems()[0]) {
						selectedPath = mainContentTable.getVisibleItems()[0].getBindingContextPath();
						mainContentTable.removeSelections();
						mainContentTable.setSelectedItem(mainContentTable.getVisibleItems()[0]);
					}
				} if (selectedPath) {
					dynamicSideContent.setShowSideContent(true);
					viewModel.setProperty("/" + sEntitySet + "showingSideContent", true);
					oController.prepareSideContentData(entity, selectedPath, dynamicSideContent, sEntitySet, mainContentTable.getParent());
				}
			});
		},

		onHideDsc1: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			//			var currentSectionId =
			//			oEvent.getSource().getParent().getParent().getSelectedSection();
			//			var dynamicSideContent =
			//			oController.getView().byId(currentSectionId).getSubSections()[0].getBlocks()[0].getContent()[0];
			var sections = oController.getView().getContent()[0].getSections();
			_.each(sections, function (section) {
				//				var dynamicSideContent =
				//				section.getSubSections()[0].getBlocks()[0].getContent()[0];
				//				if(!dynamicSideContent.getMainContent){
				//				dynamicSideContent =
				//				section.getSubSections()[0].getBlocks()[0].getContent()[1];
				//				}
				var dynamicSideContent;
				if (oController.isControlOfType(section.getSubSections()[0].getBlocks()[0].getContent()[0], "sap/ui/layout/ResponsiveSplitter")) {
					dynamicSideContent = oController.getResponsiveSplitter(section.getSubSections()[0].getBlocks()[0].getContent()[0]);
				} else {
					dynamicSideContent = oController.getResponsiveSplitter(section.getSubSections()[0].getBlocks()[0].getContent()[1]);
				}
				var currentRoute = viewModel.getProperty("/currentRoute");
				if (currentRoute == "Detail") {
					viewModel.setProperty("/DetailshowHideDsc", false)
				} else if (currentRoute == "DetailDetail") {
					viewModel.setProperty("/DetailDetailshowHideDsc", false)
				}
				//				oEvent.getSource().setVisible(false);
				//				oController.getView().byId(oEvent.getSource().data().id).setVisible(true);
				oController.onClosingDscSideContent(dynamicSideContent);
			});
		},

		prepareSideContentData: function (entity, selectedPath, dynamicSideContent, sEntitySet, oSmartTable) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");

			var urlParameters = {}, oTargetEntity;
			//			var DSCId = dynamicSideContent.getId();
			var DSCId = dynamicSideContent.content.getId();
			var matchEntities = [], duplicationEntities = [], segmentedButton;
			var oEntityType = oModel.getMetaModel().getODataEntityType(oModel.getMetaModel().getODataEntitySet(sEntitySet).entityType);
			//			var itemTabBar = dynamicSideContent.getSideContent()[2];
			var itemTabBar = oController.getView().byId(DSCId + "::IconTab");
			if (!itemTabBar) {
				itemTabBar = sap.ui.getCore().byId(DSCId + "::IconTab");
				//** #164828 -> Approval Integration via Action code(GTM sync ) --Start  **start
				//				segmentedButton = oController.getView().byId(DSCId + "::SegButton");
				var segmentedButton = oController.getView().byId(DSCId + "::IconTab");
				//** #164828 -> Approval Integration via Action code(GTM sync ) --Start  **end
			} else {
				//** #164828 -> Approval Integration via Action code(GTM sync ) --Start  **start
				//				segmentedButton = oController.getView().byId(DSCId + "::SegButton");
				var segmentedButton = oController.getView().byId(DSCId + "::IconTab");
				//** #164828 -> Approval Integration via Action code(GTM sync ) --Start  **end
			}

			var errorMessages = oController.checkErrorMessageExist(oModel);
			if (!errorMessages) {
				oController.removeMessages(oController);
			}

			urlParameters["_row_id"] = oModel.getProperty(selectedPath).row_id;
			urlParameters["_dscen"] = true;
			//			if(!viewModel.getProperty("/disp_only")){

			if (!viewModel.getProperty("/skipLockFunction")) {
				//					Manual Correction Changes - start
				if (!viewModel.getProperty("/addCorrectionLines" + sEntitySet)) {

					oModel.callFunction("/" + sEntitySet + "_LOCK", {
						method: "POST",
						batchGroupId: "changes",
						urlParameters: urlParameters,
						success: function (oData, response) {
							var messageExists = oController.checkResponseForMessages(oData, response);
							if (messageExists) {
								setTimeout(function () {
									oController.showMessagePopover(oController.messageButtonId);
								});
							}
						},
						error: function (oData, response) {
							setTimeout(function () {
								oController.showMessagePopover(oController.messageButtonId);
							}, 1000);
						}
					});
				}
				//					Manual Correction Changes - end
			} else {
				!viewModel.setProperty("/skipLockFunction", false);
			}

			//			}
			itemTabBar.getItems()[1].setVisible(false);

			if (oController.sidePanelDSC && oController.sidePanelDSC.entitySet == sEntitySet) {
				if (segmentedButton.getItems()[1]) {
					if (oController.sidePanelDSC.showCodes) {
						segmentedButton.getItems()[1].setVisible(true);
					} else {
						segmentedButton.getItems()[1].setVisible(false);
					}
				}
				if (segmentedButton.getItems()[2]) {
					if (oController.sidePanelDSC.showSuggestion) {
						segmentedButton.getItems()[2].setVisible(true);
					} else {
						segmentedButton.getItems()[2].setVisible(false);
					}
				}
			} else {
				oController.sidePanelDSC = {};
				oController.sidePanelDSC.entitySet = sEntitySet;
				if (segmentedButton.getItems()[1])
					segmentedButton.getItems()[1].setVisible(false);
				if (segmentedButton.getItems()[2])
					segmentedButton.getItems()[2].setVisible(false);
			}

			//			segmentedButton.getItems()[3].setVisible(false);
			//			if(!viewModel.getProperty("/DSCSegmentedButtonSelectedKey")){
			// if (segmentedButton.getItems()[0]) {
			// 	segmentedButton.getButtons()[0].firePress();
			// 	segmentedButton.getItems()[0].firePress();
			// 	segmentedButton.setSelectedKey(segmentedButton.getItems()[0].getKey());
			// }
			//	#164828 -> Approval Integration via Action code(GTM sync ) --Start     

			if (!viewModel.getProperty("/selectedSegmenetedButton") &&
				!viewModel.getProperty("/matchResultActionPerformed") &&
				segmentedButton.getItems()[0]) {
				//** new dsc changes - 16-Mar-2022 **start
				//					segmentedButton.getButtons()[0].firePress();
				//					segmentedButton.getItems()[0].firePress();
				// CI#17234-When we click randomly on rows action code are shown. **-start
				if (segmentedButton.getSelectedKey() !== "details") {
					//					oController.dscSegmentedButtonDeselected;
					segmentedButton.setSelectedKey(segmentedButton.getItems()[0].getKey());

					//					segmentedButton.setSelectedItem(segmentedButton.getItems()[0]);
				}

				// CI#17234-When we click randomly on rows action code are shown. **-end
				//** new dsc changes - 16-Mar-2022 **end
			} else if (viewModel.getProperty("/matchResultActionPerformed")) {
				segmentedButton._getIconTabHeader().setSelectedItem(segmentedButton.getItems()[0]);
			}
			//#164828 -> Approval Integration via Action code(GTM sync ) --end    

			//			}else{
			//			var DSCSegmentedButtonSelectedKey =
			//			viewModel.getProperty("/DSCSegmentedButtonSelectedKey");
			//			for(var i=0; i<segmentedButton.getButtons().length; i++){
			//			if(segmentedButton.getItems()[i].getKey() === DSCSegmentedButtonSelectedKey){
			//			segmentedButton.getItems()[i].firePress();
			//			segmentedButton.getButtons()[i].firePress();
			//			segmentedButton.setSelectedKey(segmentedButton.getItems()[i].getKey());
			//			break;
			//			}
			//			}
			//			}
			itemTabBar.getItems()[1].removeAllContent();

			var tableBindingInfo = oController.getTableBindingInfo(oSmartTable);
			viewModel.setProperty("/mainTableBindingInfo", tableBindingInfo);
			viewModel.setProperty("/mainTableSelectedPath", selectedPath);
			viewModel.setProperty("/" + sEntitySet + "showDscApply", false);
			var row_id, urlParameters1 = {};
			//				Manual Correction Changes - start
			if (
				oController.correction_row_id &&
				oController.correction_row_id[sEntitySet] &&
				oController.correction_row_id[sEntitySet][urlParameters["_row_id"]]
			) {
				var correction_row_id =
					oController.correction_row_id[sEntitySet][urlParameters["_row_id"]];
				row_id = correction_row_id;
				var selectedPath1 = selectedPath.split("(")[0];
				selectedPath = selectedPath.split("(")[1].replace(urlParameters["_row_id"], correction_row_id);
				selectedPath = selectedPath1 + "(" + selectedPath;
				urlParameters1["corr_rows_get"] = true;
			} else {
				row_id = urlParameters["_row_id"];
			}
			//				Manual Correction Changes - end
			if (oController.adjustmentFlow) {
				if (oSmartTable.getTable && oSmartTable.getTable().getSelectedIndices) {
					var tableIndicesForDsc = {};
					tableIndicesForDsc.tableId = oSmartTable.getTable().getId();
					tableIndicesForDsc.indices = oSmartTable.getTable().getSelectedIndices();
					oController.mainTableIndicesForDsc = tableIndicesForDsc;
					viewModel.setProperty("/tablePosition", oSmartTable.getTable()._getScrollExtension().getVerticalScrollbar().scrollTop);
				}
			} else {
				oController.mainTableParametersForDsc = urlParameters;
			}
			var sideContentTable = oController.getView().byId(DSCId + "::Table");
			if (!sideContentTable) {
				var sideContentTable = sap.ui.getCore().byId(DSCId + "::Table");
			}
			sideContentTable.bindElement(selectedPath);
			oModel.submitChanges({
				batchGroupId: "changes",
				success: function () {
					//					oModel.refresh();
					//					oSmartTable.rebindTable();
					//					tableBindingInfo.binding.refresh();
					oController.showMessagePopover(oController.messageButtonId);
					//					oController.refreshSmartTable(oSmartTable);					
					oModel.read(selectedPath, {
						_refresh: true,
						urlParameters: _.extend(urlParameters1, oController.readQueryPrepare(sEntitySet)),
						success: function (oData, response) {
							//							oModel.setProperty(selectedPath + "/edtst",oData.edtst);
							var messageExists = oController.checkResponseForMessages(oData, response);
							if (messageExists) {
								setTimeout(function () {
									oController.showMessagePopover(oController.messageButtonId);
								}, 1000);
							}

							var mainTableSelectedRowData = oData;

							viewModel.setProperty("/editingStatusDSC", oData.edtst);
							//	#164828 -> Approval Integration via Action code(GTM sync ) --Start
							var editingStatusDSC = viewModel.getProperty("/editingStatusDSC");
							//	#164828 -> Approval Integration via Action code(GTM sync ) --End
							var tableData = [];
							var lineItems;
							if (entity["com.sap.vocabularies.UI.v1.Identification"]) {
								lineItems = entity["com.sap.vocabularies.UI.v1.Identification"];
							} else {
								if (entity["vui.bodc.NonResponsiveLineItem"]) {
									lineItems = entity["vui.bodc.NonResponsiveLineItem"];
								} else {
									lineItems = entity["vui.bodc.ResponsiveLineItem"];
								}
							}
							//	#164828 -> Approval Integration via Action code(GTM sync ) --Start
							var lowerTableData = [];
							_.each(lineItems, function (item) {
								if (item.Value.Path !== "edtst" && item.RecordType !== "vui.bodc.Popover") {
									var obj = {};
									var cellProperties = _.find(entity["property"], { name: item.Value.Path });
									var nonResponsiveLineItem;


									if (entity["vui.bodc.NonResponsiveLineItem"]) {
										nonResponsiveLineItem = entity["vui.bodc.NonResponsiveLineItem"].find(function (nrlitem) { return nrlitem.Value && nrlitem.Value.Path == item.Value.Path });
									}
									if (!nonResponsiveLineItem || (nonResponsiveLineItem && !nonResponsiveLineItem["vui.bodc.MultiInput"])) {
										if (cellProperties && cellProperties["com.sap.vocabularies.Common.v1.Label"] && cellProperties["com.sap.vocabularies.Common.v1.Label"].String) {
											//											Required Changes
											// var required = false;
											// if (cellProperties['com.sap.vocabularies.UI.v1.Mandatory'] && cellProperties['com.sap.vocabularies.UI.v1.Mandatory'].Bool) {
											// 	required = true;
											// }
											// tableData.push({ "row1": cellProperties["com.sap.vocabularies.Common.v1.Label"].String, "field": cellProperties.name, "required": required });
											//	
											obj = {
												row1: cellProperties["com.sap.vocabularies.Common.v1.Label"].String,
												field: cellProperties.name,
											};
										}
									}
									if (obj && Object.keys(obj).length > 0) {
										if (item.FieldPlacement && item.FieldPlacement.String == "Lower") {
											lowerTableData.push(obj);
										} else {
											tableData.push(obj);
										}
									}
								}
							});
							//							var sideContentTable =
							//							dynamicSideContent.getSideContent()[1].getItems()[0].getContent()[0];							
							//							Making Apply Button Sticky changes
							//dynamicSideContent.getSideContent()[0].getItems()[2].addStyleClass("vistex-display-none");
							//							sideContentTable.getHeaderToolbar().addStyleClass("vistex-display-none");
							//	
							var sideContentTable = oController.getView().byId(DSCId + "::Table");
							if (!sideContentTable) {
								var sideContentTable = sap.ui.getCore().byId(DSCId + "::Table");
							}
							if (sideContentTable.getHeaderToolbar && sideContentTable.getHeaderToolbar()) {
								sideContentTable.getHeaderToolbar().addStyleClass("vistex-display-none");
							}
							var workspaceviewEntity = oMetaModel.getODataEntityType(
								oMetaModel.getODataEntitySet("WorkspaceView").entityType
							);
							var autoUpdate;
							if (workspaceviewEntity &&
								workspaceviewEntity["vui.bodc.workspace.AutoUpdateDisable"] &&
								workspaceviewEntity["vui.bodc.workspace.AutoUpdateDisable"].Bool &&
								workspaceviewEntity["vui.bodc.workspace.AutoUpdateDisable"].Bool == "true") {
								oModel.setDefaultBindingMode(sap.ui.model.BindingMode.OneWay);
								sideContentTable.bindElement(selectedPath);
								// viewModel.setProperty("/sideContentData", oModel.getProperty(selectedPath));
								var autoUpdate = false;
								// sideContentTable.setModel(viewModel, "viewModel");
								// sideContentTable.bindElement("/sideContentData");
							} else {
								var autoUpdate = true;
								sideContentTable.bindElement(selectedPath);
							}
							oController.DSCSourcePath = selectedPath;
							var columnData = [{ "col": "row1", "label": "Field" }, { "col": "row2", "label": "Value" }];
							//							sideContentTable.bindAggregation("columns","viewModel>/columnData",function(sId,oContext){
							//							var contextObject = oContext.getObject();
							//							return new sap.m.Column({
							//							header:new sap.m.Label({
							//							text : contextObject["label"]
							//							})
							//							});
							//							});

							var oLowerPanel, oTableArray = [], oLowerTable;
							oTableArray.push({
								sPath: "viewModel>/itemsData" + DSCId,
								content: sideContentTable,
							});
							_.each(oTableArray, function (table) {
								table.content.bindAggregation("items", table.sPath, function (sId, oContext) {
									var contextObject = oContext.getObject();
									var fcat_data = viewModel.getProperty("/columnData");
									var cells = [];
									_.each(fcat_data, function (obj) {
										if (obj.col != "row1") {
											if (contextObject.codeEntity && !contextObject.field) {
												var actionCodeMultiInput = new sap.m.MultiInput({
													editable: false,
												}).addStyleClass("actionCodeMultiInputField");
												var codeListItemPath = "/" + contextObject.codeEntity;
												var oFilters = [];
												oFilters.push(
													new sap.ui.model.Filter("seltd", sap.ui.model.FilterOperator.EQ, true)
												);
												var tokenTemplate = new sap.m.Token({
													key: "{value}",
													text: "{text}",
												});
												actionCodeMultiInput.data({
													entity: contextObject.codeEntity,
													DSCId: DSCId,
													label: contextObject.row1,
												});
												actionCodeMultiInput.bindAggregation("tokens", {
													path: codeListItemPath,
													template: tokenTemplate,
													filters: oFilters,
												});

												actionCodeMultiInput.attachTokenChange(function (oEvent) {
													var tokens = oEvent.getSource().getTokens();
													var sPath;
													for (var i = 0; i < tokens.length; i++) {
														if (tokens[i].getModel().getProperty(tokens[i].getBindingContext().getPath()).seltd) {
															sPath = tokens[i].getBindingContext().getPath();
															break;
														}
													}
													if (sPath) {
														oController.setBindingPathToCodeEntityFields(sPath, oEvent.getSource().data("entity"),
															oEvent.getSource().data("DSCId"));
													}
												},
													oController);

												var actionCodeMultiInputButton = new sap.m.Button({
													icon: "sap-icon://slim-arrow-down",
													tooltip: "",
													press: [
														oController.actionCodePopover,
														oController,
													],
												}).addStyleClass("actionCodeMultiInputButton");
												actionCodeMultiInputButton.destroyTooltip();

												actionCodeMultiInputButton.data({
													entity: contextObject.codeEntity,
													DSCId: DSCId,
													label: contextObject.row1,
												});

												cells.push(
													new sap.m.HBox({
														width: "100%",
														alignItems: sap.m.FlexAlignItems.Center,
														items: [
															actionCodeMultiInput,
															actionCodeMultiInputButton,
														],
													}).addStyleClass("actionCodeMultiInputHBox")
												);
											} else {
												var field_propLineItem, field_prop;
												if (contextObject.codeEntity) {
													var codeEntityType = oMetaModel.getODataEntityType(
														oMetaModel.getODataEntitySet(contextObject.codeEntity).entityType);
													field_propLineItem = codeEntityType["com.sap.vocabularies.UI.v1.Identification"].find(function (prop) {
														return prop.Value.Path === contextObject.field;
													});

													field_prop = codeEntityType["property"].find(function (prop) {
														return prop.name === contextObject.field;
													});
												} else {
													var field_propLineItem = lineItems.find(function (prop) {
														return prop.Value.Path === contextObject.field
													});

													var field_prop = entity["property"].find(function (prop) {
														return prop.name === contextObject.field
													});

													// var input;
													// if (field_propLineItem.NoOfDecimals || field_propLineItem["ManualUnitField"] || field_prop["sap:unit"]) {
													// 	var noofDecimals = 2;
													// 	if (field_propLineItem.NoOfDecimals) {
													// 		noofDecimals = field_propLineItem.NoOfDecimals.String;
													// 	}
													// 	if ((field_prop['com.sap.vocabularies.UI.v1.ReadOnly']
													// 		&& field_prop['com.sap.vocabularies.UI.v1.ReadOnly'].Bool
													// 		&& field_prop['com.sap.vocabularies.UI.v1.ReadOnly'].Bool == "true") ||
													// 		(field_prop['com.sap.vocabularies.Common.v1.FieldControl']
													// 			&& field_prop['com.sap.vocabularies.Common.v1.FieldControl'].EnumMember
													// 			&& field_prop['com.sap.vocabularies.Common.v1.FieldControl'].EnumMember == "com.sap.vocabularies.Common.v1.FieldControlType/ReadOnly")) {
													// 		input = new sap.m.Text({
													// 			wrapping: false,
													// 			text: "{parts:[{path:'" + field_prop.name + "'},{path:'" + field_prop["sap:unit"] + "'},{value: '" + noofDecimals + "'}],formatter: 'zvui.work.controller.AnnotationHelper.formatDecimalField'}"
													// 		});
													// 	} else {
													// 		//												Consider No. of decimals in edit mode
													// 		var scaleLength = 3;
													// 		if (field_prop['scale']) {
													// 			scaleLength = field_prop['scale'].length;
													// 		}

													// 		field_prop['scale'] = oController.zeroPadding(noofDecimals, scaleLength);
													// 		if (field_propLineItem["ManualUnitField"]) {
													// 			input = new sap.m.HBox({
													// 				justifyContent: "End",
													// 				items: [
													// 					new sap.ui.comp.smartfield.SmartField({
													// 						value: "{" + field_prop.name + "}",
													// 						editable: "{= ${edtst} === '1' }",
													// 						change: [oController.onTableFieldChange, oController]
													// 					}),
													// 					new sap.ui.comp.smartfield.SmartField({
													// 						value: "{" + field_prop["sap:unit"] + "}",
													// 						editable: "{= ${edtst} === '1' }",
													// 						change: [oController.onTableFieldChange, oController]
													// 					}).addStyleClass("UnitFieldMarginLeft")
													// 				]
													// 			});
													// 		} else {
													// 			input = new sap.ui.comp.smartfield.SmartField({
													// 				value: "{" + field_prop.name + "}",
													// 				editable: "{= ${edtst} === '1' }",
													// 				change: [oController.onTableFieldChange, oController],
													// 				configuration: [
													// 					new sap.ui.comp.smartfield.Configuration({
													// 						displayBehaviour: oController.getTextArrangementForSmartControl(field_propLineItem, oEntityType)
													// 					})
													// 				]
													// 			});
													// 		}
													// 	}
													// } else {
													// 	input = new sap.ui.comp.smartfield.SmartField({
													// 		value: "{" + contextObject.field + "}",
													// 		//												Required Changes
													// 		clientSideMandatoryCheck: contextObject["required"],
													// 		//												
													// 		change: [oController.onTableFieldChange, oController],
													// 		configuration: [
													// 			new sap.ui.comp.smartfield.Configuration({
													// 				displayBehaviour: oController.getTextArrangementForSmartControl(field_propLineItem, oEntityType)
													// 			})
													// 		]
													// 	});
													// }
													// //										Required Changes
													// if (field_prop["com.sap.vocabularies.Common.v1.FieldControl"] && field_prop["com.sap.vocabularies.Common.v1.FieldControl"].EnumMember == "com.sap.vocabularies.Common.v1.FieldControlType/Mandatory") {
													// 	input.bindProperty("editable", {
													// 		path: "edtst", formatter: function (edtst) {
													// 			if (edtst == 1) {
													// 				return true;
													// 			}
													// 			return false;
													// 		}
													// 	}, null, sap.ui.model.BindingMode.OneWay);
													// }
													//										
													var input = oController.prepareSideContentTableInput(field_propLineItem, field_prop, oEntityType, sEntitySet, selectedPath);
													cells.push(input);
												}
											}
										} else {
											//										Required Changes
											var text = new sap.m.Label({ design: "Bold", wrapping: true, required: contextObject["required"] }).bindProperty("text", "viewModel" + ">" + obj["col"], null, sap.ui.model.BindingMode.OneWay);
											//										
											cells.push(text);
										}
									});
									var columnListItem = new sap.m.ColumnListItem({
										cells: cells,
										type: "Active",
									}).addStyleClass("noPadding");
									if (contextObject.codeEntity && contextObject.field) {
										columnListItem.data("codeEntity", contextObject.codeEntity);
										columnListItem.data("codeEntityField", true);
									}
									return columnListItem;
									// return new sap.m.ColumnListItem({
									// 	cells: cells,
									// 	type: "Active",
									// }).addStyleClass("noPadding");
								});
							});
							if (lowerTableData && entity["vui.bodc_workspace.ShowSplitter"]) {
								viewModel.setProperty("/lowerTableItemsData" + DSCId, lowerTableData);
							}
							//164828
							//sideContentTable.addStyleClass("vistexCompactStyle");
							//	#164828 -> Approval Integration via Action code(GTM sync ) --End
							viewModel.setProperty("/columnData", columnData);
							viewModel.setProperty("/itemsData" + DSCId, tableData);

							itemTabBar.getItems()[1].removeAllContent();

							//itemTabBar.getItems()[1].getContent()[0].removeAllContent();
							//								Manual Correction Changes - start

							var pstatField = Object.keys(oData).find(function (f) {
								return f.endsWith("pstat")
							});

							var itcrdField = Object.keys(oData).find(function (f) {
								return f.endsWith("itcrd")
							});

							if (
								oData &&
								oData[pstatField] == "4" &&
								(!oData[itcrdField] || oData[itcrdField] == "O") &&
								!viewModel.getProperty("/addCorrectionLines" + sEntitySet)
							) {
								viewModel.setProperty("/" + sEntitySet + "showDscCorrectionLines", true);
								//								viewModel.setProperty("/addCorrectionLines" + sEntitySet, true);
							} else {
								viewModel.setProperty("/" + sEntitySet + "showDscCorrectionLines", false);
								//								viewModel.setProperty("/addCorrectionLines" + sEntitySet, false);
							}
							//								Manual Correction Changes - end



							if (entity.navigationProperty && entity.navigationProperty.length > 0) {
								for (var i = 0; i < entity.navigationProperty.length; i++) {
									oTargetEntity = oMetaModel.getODataEntityType(oMetaModel.getODataAssociationEnd(entity, entity.navigationProperty[i].name).type);
									if (oTargetEntity && oTargetEntity['vui.bodc.workspace.CodesEditable']) {
										// itemTabBar.getItems()[1].setVisible(true);
										//	#164828 -> Approval Integration via Action code(GTM sync ) --Start
										var codesSection = segmentedButton.getItems().find(function (item) {
											return item.getKey() == "codes";
										});



										if (codesSection) {
											//											if (mainTableSelectedRowData.pstat != "4") {
											//												oController.codesDataEnabled =
											//													mainTableSelectedRowData.edtst;
											//											}else{
											oController.codesDataEnabled = "1";
											//											}
											if (
												oTargetEntity["vui.bodc.workspace.DisplayCodesInDetail"] &&
												oTargetEntity["vui.bodc.workspace.DisplayCodesInDetail"].Bool
											) {
												oController.sidePanelDSC.displayCodesInDetail = true;
											} else {
												if (segmentedButton.getItems()[1])
													segmentedButton.getItems()[1].setVisible(true);
												codesSection.setVisible(true);
												oController.sidePanelDSC.showCodes = true;
												oController.prepareCodesSection = true;
												//												oController.codesDataEnabled = mainTableSelectedRowData.edtst;
											}
										}
										//	#164828 -> Approval Integration via Action code(GTM sync ) --End

										/*
										 * var listEntity =
										 * oMetaModel.getODataAssociationSetEnd(entity,entity.navigationProperty[i].name).entitySet;
										 * var codesList = new
										 * sap.ui.comp.smartlist.SmartList({
										 * entitySet: listEntity, header:
										 * oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"]["TypeName"].String,
										 * showRowCount: false,
										 * enableAutoBinding:true }); var
										 * customListItem;
										 * if(mainTableSelectedRowData.edtst ===
										 * "1"){ customListItem = new
										 * sap.m.CustomListItem({ content: new
										 * sap.m.CheckBox({ selected:"{seltd}",
										 * enabled:"{= ${seltd_fc} === 3}",
										 * partiallySelected:"{psltd}",
										 * text:"{text}" }) }); }else{
										 * customListItem = new
										 * sap.m.CustomListItem({ content: new
										 * sap.m.CheckBox({ selected:"{seltd}",
										 * enabled: false,
										 * partiallySelected:"{psltd}",
										 * text:"{text}" }) }); }
										 *  // customListItem = new
										 * sap.m.CustomListItem({ // content:
										 * new sap.m.CheckBox({ //
										 * selected:"{seltd}", // enabled:"{=
										 * ${seltd_fc} === 3}", //
										 * partiallySelected:"{psltd}", //
										 * text:"{text}" // }) // });
										 * 
										 * codesList.setListItemTemplate(customListItem);
										 *  // codesList.bindElement("/" +
										 * listEntity);
										 * itemTabBar.getItems()[1].addContent(codesList);
										 */
									} else if (oTargetEntity && oTargetEntity['vui.bodc.workspace.CodesNonEditable']) {
										// itemTabBar.getItems()[1].setVisible(true);
										if (segmentedButton.getItems()[1])
											segmentedButton.getItems()[1].setVisible(true);
										//	#164828 -> Approval Integration via Action code(GTM sync ) --Start
										var codesSection = segmentedButton.getItems().find(function (item) {
											return item.getKey() == "codes";
										});
										if (codesSection) {
											codesSection.setVisible(true);
										}
										//	#164828 -> Approval Integration via Action code(GTM sync ) --End
										oController.sidePanelDSC.showCodes = true;
										oController.prepareCodesSection = true;
										/*
										 * var listEntity =
										 * oMetaModel.getODataAssociationSetEnd(entity,entity.navigationProperty[i].name).entitySet;
										 * var codesList = new
										 * sap.ui.comp.smartlist.SmartList({
										 * entitySet: listEntity, header:
										 * oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"]["TypeName"].String,
										 * showRowCount: false,
										 * enableAutoBinding:true,
										 * listItemTemplate: new
										 * sap.m.StandardListItem({
										 * title:"{text}", //
										 * description:"{text}" }) // new
										 * sap.m.CustomListItem({ // content:
										 * new sap.m.CheckBox({ //
										 * selected:"{seltd}", // enabled:"{=
										 * ${seltd_fc} === 3 }", //
										 * partiallySelected:"{psltd}", //
										 * text:"{text}" // }) // }) }); //
										 * codesList.bindElement("/" +
										 * listEntity);
										 * itemTabBar.getItems()[1].addContent(codesList);
										 */
									} else if (oTargetEntity && oTargetEntity['vui.bodc.workspace.MatchHeader']) {
										var entityset = oMetaModel.getODataAssociationSetEnd(entity, entity.navigationProperty[i].name).entitySet;
										matchEntities.push(entityset);
										viewModel.setProperty("/matchEntities", matchEntities);
									}
									// Duplication Changes -- Start
									else if (
										oTargetEntity && oTargetEntity["vui.bodc.workspace.Duplication"]
									) {
										var entityset = oMetaModel.getODataAssociationSetEnd(entity, entity.navigationProperty[i].name).entitySet;
										duplicationEntities.push(entityset);
										viewModel.setProperty("/duplicationEntities", duplicationEntities);
									}
									// Duplication Changes -- End	
									else if (oTargetEntity && oTargetEntity['vui.bodc.workspace.Notes']) {
										if (segmentedButton.getItems()[3])
											segmentedButton.getItems()[3].setVisible(true);
										oController.noteSectionPrepare(oTargetEntity, itemTabBar);
									}
								}
							}
							//	#164828 -> Approval Integration via Action code(GTM sync ) --Start
							var sideContentTable = oController.getView().byId(DSCId + "::Table");
							if (!sideContentTable) {
								var sideContentTable = sap.ui.getCore().byId(DSCId + "::Table");
							}

							if (oController.sidePanelDSC.displayCodesInDetail) {
								oController.displayCodesInDetail(
									DSCId,
									selectedPath,
									dynamicSideContent,
									oSmartTable,
									editingStatusDSC
								);
							}
							// ********************************* Hiding the Splitter Bar ******************************************
							else {
								sideContentTable.getParent().getParent().getContentAreas()[0].setLayoutData(new sap.ui.layout.SplitterLayoutData({ size: "100%" })
								);
								sideContentTable.getParent().getParent().getContentAreas()[1].removeAllContent();
								setTimeout(function () {
									sideContentTable.getParent().getParent().$().addClass("hideSplitterBar");
								}, 500);
							}
							// ********************************* Hiding the Splitter Bar ******************************************
							//	#164828 -> Approval Integration via Action code(GTM sync ) --End
							if (matchEntities.length > 0) {
								if (mainTableSelectedRowData.edtst == "1") {
									if (segmentedButton.getItems()[2])
										segmentedButton.getItems()[2].setVisible(true);
									oController.sidePanelDSC.showSuggestion = true;
									//									segmentedButton.getItems()[3].setVisible(true);
									oController.matchSectionPrepare(matchEntities, itemTabBar);
								}
							}
							// Duplication Changes -- Start
							if (duplicationEntities.length > 0) {
								var duplicationSection = segmentedButton
									.getItems()
									.find(function (item) {
										return item.getKey() == "duplicates";
									});
								if (duplicationSection) {
									duplicationSection.setVisible(true);
								}
								oController.duplicationSectionPrepare(
									duplicationEntities,
									itemTabBar
								);
							}

							// Duplication Changes -- End
						}
					});


				},
				error: function (oData, response) {
					setTimeout(function () {
						oController.showMessagePopover(oController.messageButtonId);
					}, 1000);
					sap.ui.core.BusyIndicator.hide();
				}
			});

		},
		//		Consider No. of decimals in edit mode
		zeroPadding: function (num, size) {
			num = num.toString();
			while (num.length < size) num = "0" + num;
			return num;
		},

		//#164828 -> Approval Integration via Action code(GTM sync ) --Start
		onDscApply: function (oEvent, oEventCustomData) {
			//#164828 -> Approval Integration via Action code(GTM sync ) --End
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			//			var oDynamicSideContent =
			//			oController.getDynamicSideContent(oEvent.getSource());
			//			var DSCId = oDynamicSideContent.getId();
			//			Required Changes
			oController.removeMessages(oController);
			//			
			//var oDynamicSideContent = oController.getResponsiveSplitter(oEvent.getSource());
			//var DSCId = oDynamicSideContent.content.getId();
			//#164828 -> Approval Integration via Action code(GTM sync ) --Start 
			var oDynamicSideContent;
			if (oEvent.getSource) {
				if (oEvent.getSource() && oEvent.getSource().data("DSCId")) {
					var DSCId = oEvent.getSource().data("DSCId");
					var sideContentTable = oController
						.getView()
						.byId(DSCId + "::Table");
					if (!sideContentTable) {
						var sideContentTable = sap.ui.getCore().byId(DSCId + "::Table");
					}
					oDynamicSideContent =
						oController.getResponsiveSplitter(sideContentTable);
				} else {
					oDynamicSideContent = oController.getResponsiveSplitter(
						oEvent.getSource()
					);
				}
			} else {
				oDynamicSideContent = oController.getResponsiveSplitter(oEvent);
			}

			var DSCId = oDynamicSideContent.content.getId();
			//#164828 -> Approval Integration via Action code(GTM sync ) --End
			var dscTable = oController.getView().byId(DSCId + "::Table");
			if (!dscTable) {
				var dscTable = sap.ui.getCore().byId(DSCId + "::Table");
			}
			//var oEventCustomData = oEvent.getSource().data();
			//			var dscTable =
			//			oDynamicSideContent.getSideContent()[1].getItems()[0].getContent()[0];
			if (oDynamicSideContent.getMainContent) {
				if (oDynamicSideContent.getMainContent()[1]) {
					var mainTable = oDynamicSideContent.getMainContent()[1].getTable();
				} else
					var mainTable = oDynamicSideContent.getMainContent()[0].getTable();
			} else {
				return;
			}
			var selectAll, urlParameters = {},
				//	VHD#737628 -> Multiselect functionality is not working fine --Start
				codesParameters = {},
				//	VHD#737628 -> Multiselect functionality is not working fine --End
				selectedContext = [], rowIDs = [];
			var entitySet = mainTable.getParent().getEntitySet();
			//				Manual Correction Changes - start
			var addCorrectionLines = viewModel.getProperty(
				"/addCorrectionLines" + entitySet
			);
			//				Manual Correction Changes - end
			var functionImport, correction_row_id;
			functionImport = oMetaModel.getODataFunctionImport(entitySet + "_BulkEditApply");
			if (mainTable.getSelectedContexts) {
				var selectedContexts = mainTable.getSelectedContexts();
				if (mainTable.getVisibleItems().length == mainTable.getSelectedItems().length) {
					selectAll = true;
				}
			} else {
				var tableAvailableRows = [];
				//VHD#740535->Error as Workspace encountered internal server error on cal run post - Start
				var count;
				if (mainTable.getParent().getTable() instanceof sap.m.Table) {
					count = mainTable.getParent().getTable().getMaxItemsCount();
				} else if (mainTable.getParent().getTable() instanceof sap.ui.table.Table) {
					count = mainTable.getParent().getTable().getBinding("rows").getLength();
				}
				//VHD#740535->Error as Workspace encountered internal server error on cal run post - End
				_.each(oModel.mContexts, function (context) {
					if (context.sPath.indexOf(entitySet + "(") == 1) {
						tableAvailableRows.push(context);
					}
				})
				if (tableAvailableRows.length == mainTable.getSelectedIndices().length) {
					selectAll = true;
				}
				if (count == mainTable.getSelectedIndices().length) {
					selectAll = true;
				}
			}

			if (selectAll) {
				urlParameters["_selal"] = "X";
				//	VHD#737628 -> Multiselect functionality is not working fine --Start
				codesParameters["_selal"] = "X";
				//	VHD#737628 -> Multiselect functionality is not working fine --End
			} else {
				if (mainTable.getSelectedIndices) {
					var selectedIndices = mainTable.getSelectedIndices();
					_.each(selectedIndices, function (index) {
						selectedContext.push(mainTable.getContextByIndex(index));
					});
				} else {
					var selectedItems = mainTable.getSelectedItems();
					_.each(selectedItems, function (item) {
						selectedContext.push(item.getBindingContext());
					});
				}

				_.each(selectedContext, function (context) {
					if (context && context.getPath) {
						var rowId = oModel.getProperty(context.getPath()).row_id;
						//		Manual Correction Changes - start
						if (
							oController.correction_row_id &&
							oController.correction_row_id[entitySet] &&
							oController.correction_row_id[entitySet][rowId]
						) {
							correction_row_id =
								oController.correction_row_id[entitySet][rowId];
						} else {
							correction_row_id = rowId;
						}
						rowIDs.push(correction_row_id);
						//	Manual Correction Changes - end
					}
				});

				urlParameters["_row_id"] = rowIDs.toString();
				//	VHD#737628 -> Multiselect functionality is not working fine --Start
				codesParameters["_row_id"] = rowIDs.toString();
				var unselected_row_ids = [];
				if (
					rowIDs.length !== selectedContext.length &&
					oController.rowSelectionData[entitySet]
				) {
					for (
						var i = 0;
						i < oController.rowSelectionData[entitySet].length;
						i++
					) {
						var oContextData = oModel.getProperty(
							oController.rowSelectionData[entitySet][i]
						);
						if (oContextData) {
							var found = rowIDs.find(function (obj) {
								return obj == oContextData.row_id;
							});
							if (!found) {
								unselected_row_ids.push(oContextData.row_id);
							}
						}
					}
					if (unselected_row_ids.length > 0) {
						urlParameters["_row_id"] = unselected_row_ids.toString();
						urlParameters["unselected"] = true;
						codesParameters["_row_id"] = unselected_row_ids.toString();
						codesParameters["unselected"] = true;
					}
				}
				//	VHD#737628 -> Multiselect functionality is not working fine --End
			}
			var tableBindingInfo = oController.getTableBindingInfo(mainTable.getParent());
			//			Required Changes
			var changesExists = false;
			//			
			if (!oEventCustomData.codes) {
				_.each(dscTable.getItems(), function (item) {
					if (!item.getCells()[1].getText) {
						var cell;
						if (item.getCells()[1].getValue) {
							cell = item.getCells()[1];
						} else {
							cell = item.getCells()[1].getItems()[0];
						}
						var cellValue = cell.getValue();
						//	VHD#737628 -> Multiselect functionality is not working fine --Start
						if (
							cell.data("valueHelpSelectedKey") !== undefined &&
							cell.data("valueHelpSelectedKey") !== null
						) {
							cellValue = cell.data("valueHelpSelectedKey");
						}
						if (cell.data("dateValue")) {
							cellValue = cell.data("dateValue");
						}
						// VHD#737628 -> Multiselect functionality is not working fine --End
						if (cell.getSelectedItem && cell.getSelectedItem() && cell.getSelectedItem().getKey() != "") {
							cellValue = cell.getSelectedItem().getKey();
						}
						//var fieldPropertyName = cell.getCustomData()[1].getValue();
						var fieldPropertyName;
						if (cell && cell.getCustomData()[1]) {
							fieldPropertyName = cell.getCustomData()[1].getValue();
						} else if (
							cell &&
							cell.getBindingInfo("value") &&
							cell.getBindingInfo("value").binding.getPath()
						) {
							fieldPropertyName = cell
								.getBindingInfo("value")
								.binding.getPath();
						}
						//var dataType = cell.getCustomData()[0].getValue();
						var dataType = "Edm.String";
						if (cell && cell.getCustomData()[0]) {
							dataType = cell.getCustomData()[0].getValue();
						}
						if (cellValue != "< Keep Existing Values >") {
							//							Required Changes
							changesExists = true;
							//							
							if (cellValue == "< Leave Blank >" || cellValue == null) {
								switch (dataType) {
									case "Edm.String":
										urlParameters[fieldPropertyName] = "";
										break;
									case "Edm.Boolean":
										urlParameters[fieldPropertyName] = false;
										break;
									case "Edm.Byte":
									case "Edm.Decimal":
									case "Edm.Double":
									case "Edm.Single":
									case "Edm.Int16":
									case "Edm.Int32":
									case "Edm.Int64":
									case "Edm.SByte":
										urlParameters[fieldPropertyName] = 0;
										// var sUomPropertyName =
										// oField.getUnitOfMeasurePropertyName();
										// if (oField.isComposite()) {
										// urlParameters[sUomPropertyName] = "";
										// }
										break;
									case "Edm.DateTime":
										urlParameters[fieldPropertyName] = new Date(0);
										break;
									default:
										urlParameters[fieldPropertyName] = "";
										break;
								}
							} else {
								switch (dataType) {
									case "Edm.String":
									case "Edm.Boolean":
									case "Edm.Byte":
									case "Edm.Decimal":
									case "Edm.Double":
									case "Edm.Single":
									case "Edm.Int16":
									case "Edm.Int32":
									case "Edm.Int64":
									case "Edm.SByte":
										urlParameters[fieldPropertyName] = cellValue;
										break;
									case "Edm.DateTime":
										urlParameters[fieldPropertyName] = new Date(0);
										var dateValues = cellValue.split('-');
										urlParameters[fieldPropertyName].setFullYear(dateValues[2], dateValues[1] - 1, dateValues[0]);
										break;
									default:
										urlParameters[fieldPropertyName] = cellValue;
										break;
								}
								// urlParameters[fieldPropertyName] = cellValue;
								// if (cell.getCustomData()[2]) {
								// 	if (item.getCells()[1].getItems()[1].getValue() == ("< Keep Existing Values >" || "< Leave Blank >" || null)) {
								// 		urlParameters[cell.getCustomData()[2].getValue()] = "";
								// 	} else
								// 		urlParameters[cell.getCustomData()[2].getValue()] = item.getCells()[1].getItems()[1].getValue();
								// }
								// VHD#737628 -> Multiselect functionality is not working fine --Start
								if (
									cell.getCustomData()[2] &&
									cell.getCustomData()[2].getKey() !== "dateValue" &&
									cell.getCustomData()[2].getKey() !== "valueHelpSelectedKey"
								) {
									if (
										item.getCells()[1].getItems()[1].getValue &&
										item.getCells()[1].getItems()[1].getValue() ==
										("< Keep Existing Values >" || "< Leave Blank >" || null)
									) {
										urlParameters[cell.getCustomData()[2].getValue()] = "";
									} else if (item.getCells()[1].getItems()[1].getValue) {
										urlParameters[cell.getCustomData()[2].getValue()] = item
											.getCells()[1]
											.getItems()[1]
											.getValue();
									} else if (
										item.getCells()[1].getItems()[1].getText &&
										item.getCells()[1].getItems()[1].getText() ==
										("< Keep Existing Values >" || "< Leave Blank >" || null)
									) {
										urlParameters[cell.getCustomData()[2].getValue()] = "";
									} else if (item.getCells()[1].getItems()[1].getText) {
										urlParameters[cell.getCustomData()[2].getValue()] = item
											.getCells()[1]
											.getItems()[1]
											.getText();
									}
								}
								// VHD#737628 -> Multiselect functionality is not working fine --End
							}
						}
					}
				});
				//				Manual Correction Changes - start
				if (addCorrectionLines) {
					urlParameters["correction_line"] = true;
				}
				//				Manual Correction Changes - end

				// oModel.callFunction("/" + entitySet + "_BulkEditApply", {
				// 	method: "POST",
				// 	batchGroupId: "changes",
				// 	urlParameters: urlParameters
				// });
				// VHD#737628 -> Multiselect functionality is not working fine --Start
				var dataChanged = false;
				if (
					Object.keys(urlParameters) &&
					Object.keys(urlParameters).length > 1
				) {
					oModel.callFunction("/" + functionImport.name, {
						method: "POST",
						batchGroupId: "changes",
						urlParameters: urlParameters,
					});
					dataChanged = true;
				}

				urlParameters = codesParameters;
				if (!dataChanged) {
					return;
				}
				if (!urlParameters["_selal"]) {
					urlParameters["_row_id"] = rowIDs.toString();
				}
				// VHD#737628 -> Multiselect functionality is not working fine --End
			} else {
				var codeList = viewModel.getProperty("/bulkEditCode/" + oEventCustomData.codeEntity);
				urlParameters["Value"] = "";
				for (var i in codeList.itemsData) {
					if (codeList.itemsData[i].seltd !== codeList.referenceItemsData[i].seltd ||
						codeList.itemsData[i].psltd !== codeList.referenceItemsData[i].psltd) {
						var value;
						if (codeList.itemsData[i].seltd) {
							value = codeList.itemsData[i].row_id + "_add";
						} else {
							value = codeList.itemsData[i].row_id + "_remove";
						}
						urlParameters["Value"] += urlParameters["Value"].length == 0 ? value : "," + value;
					}
				}

				if (urlParameters["Value"].length > 0) {
					//					Required Changes
					changesExists = true;
					//					
					oModel.callFunction("/" + oEventCustomData.codeEntity + "_CodesApply", {
						method: "POST",
						batchGroupId: "changes",
						urlParameters: urlParameters
					});
				}

				//				for(var codeEntity in codeLists){
				//				oModel.update("/" + codeLists[codeEntity].entityName,
				//				codeLists[codeEntity].itemsData, {
				//				method: "PUT",
				//				batchGroupId: "changes",
				//				urlParameters: urlParameters,
				//				success: function(data) {
				//				oModel.read("/" + codeLists[codeEntity].entityName,{
				//				success: function(oData,response){
				//				var responseEntity =
				//				oData.results[0].__metadata.type.split(".")[oData.results[0].__metadata.type.split(".").length
				//				- 1].split("Type")[0];
				//				viewModel.setProperty("/bulkEditCode/" + responseEntity +
				//				"/itemsData",oData.results);
				//				}
				//				});
				//				tableBindingInfo.binding.refresh();
				//				viewModel.setProperty("/modelChanged",true);
				//				},
				//				error: function(e) {
				//				// alert("error");
				//				}
				//				})
				//				}
			}
			oModel.submitChanges({
				batchGroupId: "changes",
				success: function (oData, response) {
					//					oModel.refresh(true);
					oController.showMessagePopover(oController.messageButtonId);
					if (!oEventCustomData.codes) {
						if (selectAll) {
							//							**** For tree table on binding refresh rows are unselecting
							if (mainTable instanceof sap.ui.table.TreeTable) {
								viewModel.setProperty("/tablePosition", mainTable._getScrollExtension().getVerticalScrollbar().scrollTop);
								var indices = mainTable.getSelectedIndices();
								viewModel.setProperty("/skipSlectionChange", true);
								var correction_line_table_indices = {};
								correction_line_table_indices.tableId = mainTable.getId();
								correction_line_table_indices.indices = indices;
								viewModel.setProperty("/correction_line_table_indices", correction_line_table_indices);
							}
							//							**** For tree table on binding refresh rows are unselecting
							if (mainTable instanceof sap.ui.table.AnalyticalTable) {
								var AnalyticalTableSelectionsData = {};
								AnalyticalTableSelectionsData.tableID = mainTable.getId();
								AnalyticalTableSelectionsData.selectAll = true;
								viewModel.setProperty("/AnalyticalTableSelectionsData", AnalyticalTableSelectionsData);
							}
							tableBindingInfo.binding.refresh();
						} else {
							var entitySet = mainTable.getParent().getEntitySet();
							urlParameters.row_id = urlParameters._row_id
							oModel.read("/" + entitySet, {
								urlParameters: _.extend(urlParameters, oController.readQueryPrepare(entitySet))
							});
						}
						//						****
					} else {
						var codesEntity = viewModel.getProperty("/bulkEditCode/codesEntity");
						if (codesEntity && codesEntity.length > 0) {
							oController.optimizedUpdateCalls(codesEntity[0]);
							for (var i = 0; i < codesEntity.length; i++) {
								var params = {};
								if (urlParameters["_selal"]) {
									params["_selal"] = urlParameters["_selal"];
								} else {
									params["_row_id"] = urlParameters["_row_id"];
								}
								oModel.read("/" + codesEntity[i], {
									urlParameters: params,
									_refresh: true,
									success: function (oData, response, test) {
										if (oData.results && oData.results.length > 0) {
											var responseEntity = oData.results[0].__metadata.type.split(".")[oData.results[0].__metadata.type.split(".").length - 1].split("Type")[0];
											if (viewModel.getProperty("/bulkEditCode/" + responseEntity)) {
												viewModel.setProperty("/bulkEditCode/" + responseEntity + "/itemsData", $.extend(true, {}, oData.results));
												viewModel.setProperty("/bulkEditCode/" + responseEntity + "/referenceItemsData", $.extend(true, {}, oData.results));
											}
										}
									}
								});
							}
						}
					}
					//					Required Changes
					if (changesExists) {
						viewModel.setProperty("/modelChanged", true);
						// confirmation popup changes nav from launchpad
						if (parent && parent.commonUtils && parent.commonUtils.dataChanged) {
							parent.commonUtils.dataChanged = true;
						}
						// confirmation popup changes nav from launchpad
					}
					//					
					oController.noBackPlease();
					//					if(oEventCustomData.codes){
					//					var params = {};
					//					if(urlParameters["_selal"]){
					//					params["_selal"] = urlParameters["_selal"];
					//					}else{
					//					params["_row_id"] = urlParameters["_row_id"];
					//					}
					//					oModel.read("/" + oEventCustomData.codeEntity,{
					//					urlParameters: params,
					//					success: function(oData,response , test){
					//					var responseEntity =
					//					oData.results[0].__metadata.type.split(".")[oData.results[0].__metadata.type.split(".").length
					//					- 1].split("Type")[0];
					//					viewModel.setProperty("/bulkEditCode/" + responseEntity +
					//					"/itemsData",$.extend(true,{},oData.results));
					//					viewModel.setProperty("/bulkEditCode/" + responseEntity +
					//					"/referenceItemsData",$.extend(true,{},oData.results));
					//					}
					//					});
					//					}
					//					oController.onClosingDscSideContent(oDynamicSideContent);
				},
				error: function (oData, response) {
					setTimeout(function () {
						oController.showMessagePopover(oController.messageButtonId);
					}, 1000);
					//					sap.ui.core.BusyIndicator.hide();
				}
			});
		},

		onMessageStripLinkPress: function (oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
		},

		onValueValidation: function (oEvent) {
			var oController = this;
			var newValue = oEvent.getParameter("value");
			var items = oEvent.getSource().getItems();
			var valueExists = false;
			for (var i = 0; i < items["length"]; ++i) {
				if (items[i].getText() == newValue) {
					valueExists = true;
					break;
				}
			}
			if (!valueExists) {
				oEvent.getSource().setValueState("Error");
			} else {
				oEvent.getSource().setValueState("None");
				//	#164828 -> Approval Integration via Action code(GTM sync ) --Start
				oController.onBulkeditChanges(oEvent);
				//	#164828 -> Approval Integration via Action code(GTM sync ) --End
			}
		},

		onDateChange: function (oEvent) {
			var oController = this;
			var dateField = oEvent.getSource();
			if (oEvent.getParameter("value") == "< Select New Date >") {
				// var oCalendar = new sap.ui.unified.Calendar({
				// 	width: "100%",
				// }), oSelectedDate, sDate,
				// 	oDateFormat = sap.ui.core.format.DateFormat.getInstance({ pattern: "dd-MM-yyyy" });
				// VHD#737628 -> Multiselect functionality is not working fine --Start
				var oCalendar = new sap.ui.unified.Calendar({
					width: "100%",
				}),
					oSelectedDate,
					sDate,
					formatedDate,
					oDateFormat = sap.ui.core.format.DateFormat.getInstance({
						pattern: "dd-MM-yyyy",
					});

				// VHD#737628 -> Multiselect functionality is not working fine --End
				var oSelectNewDateDialog = new sap.m.Dialog({
					title: "Select New Date",
					content: [
						oCalendar
					],
					beginButton: new sap.m.Button({
						text: "OK",
						press: function (oEvent) {
							oSelectedDate = oCalendar.getSelectedDates()[0].getStartDate();
							// sDate = oDateFormat.format(oSelectedDate);
							// dateField.setValue(sDate);
							// dateField.setSelectedKey(sDate);
							// VHD#737628 -> Multiselect functionality is not working fine --Start
							formatedDate = oDateFormat.format(oSelectedDate);
							sDate = oController.formatDateWithoutUTC(oSelectedDate);
							dateField.setValue(sDate);
							dateField.setSelectedKey(sDate);
							dateField.setSelectedItem(
								new sap.ui.core.Item({ text: sDate, key: formatedDate })
							);
							dateField.data("dateValue", formatedDate);

							// VHD#737628 -> Multiselect functionality is not working fine --End
							//	#164828 -> Approval Integration via Action code(GTM sync ) --Start
							oController.onBulkeditChanges(dateField);
							//	#164828 -> Approval Integration via Action code(GTM sync ) --End
							oEvent.getSource().getParent().close();
						}.bind(this)
					}),
					endButton: new sap.m.Button({
						text: "Close",
						press: function () {
							// VHD#737628 -> Multiselect functionality is not working fine --Start
							dateField.setSelectedItem(
								new sap.ui.core.Item({
									text: "< Keep Existing Values >",
									key: "< Keep Existing Values >",
								})
							);
							// VHD#737628 -> Multiselect functionality is not working fine --End
							oEvent.getSource().getParent().close();
						}.bind(this)
					})
				});

				oController.getView().addDependent(oSelectNewDateDialog);
				oSelectNewDateDialog.open();
			} else {
				//	#164828 -> Approval Integration via Action code(GTM sync ) --Start
				oController.onBulkeditChanges(oEvent);
				//	#164828 -> Approval Integration via Action code(GTM sync ) --End
			}
		},

		onValueHelpRequest: function (oEvent) {
			var oController = this;
			var eventSource = oEvent.getSource();
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			//			var oDynamicSideContent =
			//			oController.getDynamicSideContent(oEvent.getSource());
			var oDynamicSideContent = oController.getResponsiveSplitter(oEvent.getSource());
			if (oDynamicSideContent.getMainContent) {
				if (oDynamicSideContent.getMainContent()[1]) {
					var mainTable = oDynamicSideContent.getMainContent()[1];
				} else {
					var mainTable = oDynamicSideContent.getMainContent()[0];
				}
			} else {
				return;
			}
			if (oEvent.getParameter("value") == "< Use Value Help >") {
				//				oEvent.getSource().revertSelection();
				var selectedBoxPath = oEvent.getSource().getBindingInfo("items").binding.oContext.getPath();
				var selectedBoxData = viewModel.getProperty(selectedBoxPath);
				var fieldPath = oEvent.getSource().getBindingContext().getPath();
				var fieldData = oModel.getProperty(oEvent.getSource().getParent().data()["selectedPath"]);

				var entity = mainTable.getEntitySet();
				var oEntity = oMetaModel.getODataEntitySet(entity);
				var oEntityType = oMetaModel.getODataEntityType(oEntity.entityType);
				var oProperty = oMetaModel.getODataProperty(oEntityType, selectedBoxData.field);
				// VHD#805573 - Rule profile not triggering --Start
				var showKey = true;
				if (
					oProperty &&
					oProperty["com.sap.vocabularies.Common.v1.Text"] &&
					oProperty["com.sap.vocabularies.Common.v1.Text"][
					"com.sap.vocabularies.UI.v1.TextArrangement"
					] &&
					oProperty["com.sap.vocabularies.Common.v1.Text"][
					"com.sap.vocabularies.UI.v1.TextArrangement"
					]["EnumMember"]
				) {
					var textArrangement =
						oProperty["com.sap.vocabularies.Common.v1.Text"][
						"com.sap.vocabularies.UI.v1.TextArrangement"
						]["EnumMember"];
					if (
						textArrangement ==
						"com.sap.vocabularies.UI.v1.TextArrangementType/TextOnly"
					) {
						showKey = false;
					}
				}
				oController.showKeyOnMultiEdit = showKey;
				// VHD#805573 - Rule profile not triggering --End
				var sTitle = oProperty["com.sap.vocabularies.Common.v1.Label"] ? oProperty["com.sap.vocabularies.Common.v1.Label"].String : oProperty["sap:label"];
				var path = oEntity.entityType + "/" + selectedBoxData.field;

				//				var valueHelpEntity = fieldData["to_" + selectedBoxData.field].__ref.split('(')[0];				
				var valueHelpEntity = oProperty["com.sap.vocabularies.Common.v1.ValueList"].CollectionPath.String;
				viewModel.setProperty("/valueHelpEntity", valueHelpEntity);
				viewModel.setProperty("/valueHelpBasicSearchField", selectedBoxData.field);
				var ValueHelpDialog = sap.ui.xmlfragment("vui.workspace.fragment.ValueHelpDialog", oController);
				ValueHelpDialog.setTitle(sTitle);
				oController.getView().addDependent(ValueHelpDialog);
				ValueHelpDialog.setModel(oModel);

				if (!this._oMetadataAnalyser) {
					this._oMetadataAnalyser = new MetadataAnalyser(oModel);
				}
				var annotation = this._oMetadataAnalyser.getValueListAnnotation(path);
				var oAnnotation = annotation.primaryValueListAnnotation;
				oController.keyField = oAnnotation.keyField;
				// VHD#805573 - Rule profile not triggering --Start
				if (oAnnotation.descriptionField) {
					oController.descrField = oAnnotation.descriptionField;
				} else {
					oController.descrField = null;
				}
				// VHD#805573 - Rule profile not triggering --End
				var iLen = 0, i = 0, aCols, oField, sType, oType, oConstraints, oFormatOptions;
				oController._oInput = eventSource;

				if (oModel && oAnnotation) {
					var bSupportBasicSearch = oAnnotation.isSearchSupported;
					var sValueListTitle = oAnnotation.valueListTitle || oAnnotation.qualifier;
					var sKey = oAnnotation.keyField;
					var _aKeys = oAnnotation.keys;
					var sValueListEntitySetName = oAnnotation.valueListEntitySetName;
					var mInParams = oAnnotation.inParams;
					var mOutParams = oAnnotation.outParams;

					// the calculated display behaviour for tokens
					var sTokenDisplayBehaviour = "descriptionAndId"
					//						this.sDisplayBehaviour;
					//						if (!this.sTokenDisplayBehaviour || this.sTokenDisplayBehaviour ===
					//						DisplayBehaviour.auto) {
					//						this.sTokenDisplayBehaviour = this.oFilterProvider ?
					//						this.oFilterProvider.sDefaultTokenDisplayBehaviour :
					//						DisplayBehaviour.descriptionAndId;
					//						}

					// fallback to idOnly if no description is present for
					// tokens
					if (!oAnnotation.descriptionField) {
						sTokenDisplayBehaviour = "idOnly"; // DisplayBehaviour.idOnly;
					}

					var sDescription = oAnnotation.descriptionField || sKey; // fall
					// back
					// to
					// key
					// if
					// there
					// is
					// no
					// description

					if (sValueListEntitySetName && sKey) {
						// Get the Columns information (all fields on the UI)
						var _aCols = [];
						var aSelect = [];
						aCols = oAnnotation.valueListFields;
						iLen = aCols.length;
						for (i = 0; i < iLen; i++) {
							oField = aCols[i];
							// Type Handling: Special handling for date and
							// boolean fields
							sType = null;
							oType = null;
							oConstraints = undefined;
							oFormatOptions = undefined;
							if (oField.type === "Edm.Boolean") {
								sType = "boolean";
							} else if (oField.type === "Edm.DateTime" && oField.displayFormat === "Date") {
								sType = "date";
								oFormatOptions = {};
								oConstraints = {
									displayFormat: "Date"
								};
							} else if (oField.type === "Edm.Decimal") {
								sType = "decimal";
								oConstraints = {
									precision: oField.precision,
									scale: oField.scale
								};
							} else if (oField.type === "Edm.String") {
								if (oField.isCalendarDate) {
									sType = "stringdate";
								} else {
									sType = "string";
								}
							}

							oType = ODataType.getType(oField.type, oFormatOptions, oConstraints, oField.isCalendarDate);

							if (oField.visible) {
								_aCols.push({
									label: oField.fieldLabel,
									tooltip: oField.quickInfo || oField.fieldLabel,
									type: sType,
									oType: oType,
									width: FormatUtil.getWidth(oField, 15),
									template: oField.name,
									sort: oField.sortable ? oField.name : undefined,
									sorted: oField.sortable && oField.name === this.sKey,
									sortOrder: "Ascending" // sap.ui.table.SortOrder.Ascending
								});
							}
							// Request data for fields regardless of visibility
							// (since it could be needed for OUT param
							// handling)!
							//							this.aSelect.push(oField.name);
						}

						var oColModel = new JSONModel();
						oColModel.setData({
							cols: _aCols
						});

						var oEntity = oMetaModel.getODataEntitySet(valueHelpEntity);
						var oEntityType = oMetaModel.getODataEntityType(oEntity.entityType);

						ValueHelpDialog.getTableAsync().then(function (oTable) {
							oTable.setModel(oColModel, "columns");
							oTable.setModel(oModel);

							if (oTable.bindRows) {
								oTable.bindRows("/" + oEntity.name);
							}

							if (oTable.bindItems) {
								oTable.bindAggregation("items", "/" + oEntity.name, function () {
									return new ColumnListItem({
										cells: _aCols.map(function (column) {
											return new Label({ text: "{" + column.template + "}" });
										})
									});
								});
							}
							ValueHelpDialog.update();
						}.bind(this));
						ValueHelpDialog.open();


						//						if (oAnnotation.descriptionField) {
						//						this.aSelect.push(oAnnotation.descriptionField);
						//						}
					}
					//					else {
					//					if (!this.sKey) {
					//					Log.error("BaseValueListProvider", "key for ValueListEntitySetName '" +
					//					this.sValueListEntitySetName + "' missing! Please check your annotations");
					//					}
					//					}

				}

			} else {
				//	#164828 -> Approval Integration via Action code(GTM sync ) --Start
				oController.onBulkeditChanges(oEvent);
				//	#164828 -> Approval Integration via Action code(GTM sync ) --End
			}
		},
		onValueHelpCancelPress: function (oEvent) {

		},

		onValueHelpSearch: function (oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			var filterBar = oEvent.getSource();
			var filterEntity = filterBar.getEntitySet();
			var valueHelpDialog = filterBar.getParent();
			while (!(valueHelpDialog instanceof sap.ui.comp.valuehelpdialog.ValueHelpDialog)) {
				valueHelpDialog = valueHelpDialog.getParent();
			}
			var aFilters = filterBar.getFilters();
			var mParameters = filterBar.getParameters();
			var aSelect = ["mtrnr", "extid", "descr", "mtrtp_descr", "mtrct_descr", "mtsts_descr", "descr"];
			mParameters["select"] = aSelect.toString();

			var mBindingParams = {
				path: "/" + filterEntity,
				filters: aFilters,
				parameters: mParameters,
				events: {
					dataReceived: function (oEvt) {
						valueHelpDialog.TableStateDataFilled();
						var oBinding = oEvt.getSource();
						valueHelpDialog.getTableAsync().then(function (oTable) {
							oTable.setBusy(false);
							if (oBinding && valueHelpDialog && valueHelpDialog.isOpen()) {
								var iBindingLength = oBinding.getLength();
								// Infinite number of requests are triggered
								// if an error occurs, so don't update if no
								// data is present
								// The below code is mainly required for
								// token handling on the ValueHelpDialog.
								if (iBindingLength) {
									valueHelpDialog.update();
								}
							}
						});
					}
				}
			};

			valueHelpDialog.getTableAsync().then(function (oTable) {
				oTable.setShowOverlay(false);
				valueHelpDialog.TableStateDataSearching();
				oTable.setBusy(true);

				if (oTable instanceof sap.m.Table) {

					// Check which property can be sorted
					//					var aEntitySetFields;
					//					if (this.sKey && this._oMetadataAnalyser) {
					//					aEntitySetFields =
					//					this._oMetadataAnalyser.getFieldsByEntitySetName(this.sValueListEntitySetName);
					//					for (var i = 0; i < aEntitySetFields.length; i++) {
					//					if (aEntitySetFields[i].name === this.sKey && aEntitySetFields[i].sortable
					//					!== false) {
					//					mBindingParams.sorter = new Sorter(this.sKey);
					//					break;
					//					}
					//					}
					//					}

					//					mBindingParams.factory = function(sId, oContext) {
					//					var aCols = oTable.getModel("columns").getData().cols;
					//					return new ColumnListItem({
					//					cells: aCols.map(function(column) {
					//					var colname = column.template;
					//					return new Label({
					//					text: "{" + colname + "}"
					//					});
					//					})
					//					});
					//					};
					//					oTable.bindItems(mBindingParams);
				} else {

					// create the sorter based on the current sorted columns
					var aColumns = oTable.getColumns();
					for (var i = 0; i < aColumns.length; i++) {
						var oColumn = aColumns[i];
						oColumn._appDefaults = null;	// TODO: remove the
						// column._appDefaults,
						// otherwise the sort
						// icon will be set back
						// to the default column
						// inside bindRows of
						// the table!!!!
					}

					aColumns = oTable.getSortedColumns(); // when the user
					// changed the
					// sorting we get an
					// array of
					// SortedColumns
					if (!aColumns || aColumns.length == 0) {
						aColumns = oTable.getColumns();	// if not, we have to
						// loop over all columns
						// and used the one
						// which we created as
						// sorted.
					}
					for (var i = 0; i < aColumns.length; i++) {
						var oColumn = aColumns[i];
						if (oColumn.getSorted()) {
							if (!mBindingParams.sorter) {
								mBindingParams.sorter = [];
							}
							mBindingParams.sorter.push(new sap.ui.model.Sorter(oColumn.getSortProperty(), oColumn.getSortOrder() === "Descending"));
						}
					}

					oTable.bindRows(mBindingParams);
				}
			});

		},

		prepareValueHelpDialog: function (dialogData, input) {
			var oController = this;
			oController._oInput = input;
			var valuehelpColumns = [];
			var DialogValues = [];
			var oColModel = new sap.ui.model.json.JSONModel();
			oColModel.setProperty("/cols", valuehelpColumns);
			_.each(dialogData, function (obj) {
				DialogValues.push({ "Id": obj.descr, "Name": obj.descr });
			});
			var oDialogModel = new sap.ui.model.json.JSONModel();
			oDialogModel.setProperty("/DialogValues", DialogValues);
			valuehelpColumns.push({ "label": "Value", "template": "Name" });
			var aCols = valuehelpColumns;

			var _oValueHelpDialog1 = new sap.ui.comp.valuehelpdialog.ValueHelpDialog({
				//				title: "Manager",
				ok: [oController.onValueHelpOkPress, oController],
				cancel: [oController.onValueHelpCancelPress, oController],
				afterClose: [oController.onValueHelpAfterClose, oController],
				beforeClose: [oController.onValueHelpBeforeClose, oController],
				supportMultiselect: false,
				key: "Id",
				descriptionKey: "Name"
			});
			_oValueHelpDialog1.getTableAsync().then(function (oTable) {
				oTable.setModel(oDialogModel);
				oTable.setModel(oColModel, "columns");

				if (oTable.bindRows) {
					oTable.bindAggregation("rows", "/DialogValues");
				}

				if (oTable.bindItems) {
					oTable.bindAggregation("items", "/DialogValues", function () {
						return new ColumnListItem({
							cells: aCols.map(function (column) {
								return new Label({ text: "{" + column.template + "}" });
							})
						});
					});
				}

				_oValueHelpDialog1.update();
			}.bind(this));
			_oValueHelpDialog1.setTokens([
				new sap.m.Token({
					key: oController._oInput.getValue(),
					text: oController._oInput.getValue()
				})
			]);
			_oValueHelpDialog1.open();


		},

		onValueHelpBeforeClose: function (oEvent) {
			var oController = this;
			var _oValueHelpDialog = oEvent.getSource();
		},

		onValueHelpOkPress: function (oEvent) {
			// var oController = this;
			// var _oValueHelpDialog = oEvent.getSource();
			// var aTokens = oEvent.getParameter("tokens");
			// var selectedValue = aTokens[0].data().row[oController.keyField];
			// //			var dialogTable =
			// //			_oValueHelpDialog.getContent()[0].getItems()[1].getItems()[0];
			// //			var selectedIndex = dialogTable.getSelectedIndex();
			// //			var selectedValue =
			// //			dialogTable.getRows()[selectedIndex].getCells()[0].getText();
			// //			oController._oInput.setValue(selectedValue);
			// //			oController._oInput.setSelectedKey(selectedValue);
			// oController._oInput.setSelectedItem(new sap.ui.core.Item({ text: selectedValue, key: selectedValue }));
			// _oValueHelpDialog.close();
			// //	#164828 -> Approval Integration via Action code(GTM sync ) --Start
			// oController.onBulkeditChanges(oController._oInput);
			// //	#164828 -> Approval Integration via Action code(GTM sync ) --End

			// VHD#805573 - Rule profile not triggering --Start
			var oController = this;
			var _oValueHelpDialog = oEvent.getSource();
			var aTokens = oEvent.getParameter("tokens");
			var selectedValue, selectedDescr, displayValue;
			selectedValue = aTokens[0].data().row[oController.keyField];
			oController.showKeyOnMultiEdit;
			if (oController.descrField) {
				selectedDescr = aTokens[0].data().row[oController.descrField];
			} else {
				selectedDescr = aTokens[0].data().row[oController.keyField];
			}
			if (oController.showKeyOnMultiEdit) {
				if (oController.descrField && selectedValue !== selectedDescr) {
					displayValue = selectedDescr + " (" + selectedValue + ")";
				} else {
					displayValue = selectedValue;
				}
			} else {
				displayValue = selectedDescr;
			}
			if (oController._oInput.data("matchFilter")) {
				oController._oInput.data("selectedKey", selectedValue);
			}
			oController._oInput.setSelectedItem(
				new sap.ui.core.Item({ text: displayValue, key: selectedValue })
			);
			oController._oInput.data("valueHelpSelectedKey", selectedValue);
			_oValueHelpDialog.close();
			//			Changes to remove apply button and send apply action directly on change
			oController.onBulkeditChanges(oController._oInput);
			// VHD#805573 - Rule profile not triggering --End
		},

		onValueHelpCancelPress: function (oEvent) {
			var oController = this;
			var _oValueHelpDialog = oEvent.getSource();
			_oValueHelpDialog.close();
		},

		onValueHelpAfterClose: function (oEvent) {
			var oController = this;
			var _oValueHelpDialog = oEvent.getSource();
			_oValueHelpDialog.destroy();
		},


		onCallActionFromToolBar: function (oEvent) {

			var oController = this;
			oController.removeTransientMessages();
			sap.ui.core.BusyIndicator.show(0);

			var oModel = oController.getView().getModel();

			var viewModel = this.getView().getModel("viewModel");
			var errorMessages = oController.checkErrorMessageExist(oModel);
			if (errorMessages) {
				sap.ui.core.BusyIndicator.hide();
				oController.showMessagePopover(oController.messageButtonId);
				return;
			} else {

				var oMetaModel = oModel.getMetaModel();
				var oButton = oEvent.getSource();
				var oSmartTable = oButton.getParent().getParent().getParent();
				var oTable = oSmartTable.getTable();
				//VHD#740535->Error as Workspace encountered internal server error on cal run post - Start
				var count;
				if (oSmartTable.getTable() instanceof sap.m.Table) {
					count = oSmartTable.getTable().getMaxItemsCount();
				} else if (oSmartTable.getTable() instanceof sap.ui.table.Table) {
					count = oSmartTable.getTable().getBinding("rows").getLength();
				}
				//VHD#740535->Error as Workspace encountered internal server error on cal run post - End
				//changes from Du8
				var dynamicSideContent = oController.getResponsiveSplitter(oTable);
				var DSCId = dynamicSideContent.content.getId();
				var sideContentTable = sap.ui.getCore().byId(DSCId + "::Table");
				//changes from Du8
				var selectedContexts = [], selectAll = false, selectedIndices;
				if (oTable.getSelectedContexts) {
					selectedContexts = oTable.getSelectedContexts();
					if (oTable.getVisibleItems().length == oTable.getSelectedItems().length &&
						oTable.getVisibleItems().length >= oTable.getGrowingThreshold()) {
						selectAll = true;
					}
				} else {
					// VHD#740535->Error as Workspace encountered internal server error on cal run post
					if (count == oTable.getSelectedIndices().length &&
						count >= oTable.getVisibleRowCount()) {
						selectAll = true;
					}
					//					if(selectAll){
					//					selectedContexts = oTable._getRowContexts();
					//					}else{
					//					selectedIndices = oTable.getSelectedIndices();
					//					selectedContexts = [];
					//					_.each(selectedIndices,function(index){
					//					selectedContexts.push(oTable.getContextByIndex(index));
					//					});
					//					}

					selectedIndices = oTable.getSelectedIndices();
					selectedContexts = [];
					// 188496 - batch request is cancelled on cancel action - start
					if (oTable.data("selectAll") != "true") {
						// _.each(selectedIndices, function (index) {
						// 	if (oTable.getContextByIndex(index)) {
						// 		selectedContexts.push(oTable.getContextByIndex(index));
						// 		i++;
						// 		return i < 50;
						// 	}
						// 	if (oTable.data("selectAll") == "true") {
						// 		if(oTable._getContexts() && oTable._getContexts().length >= 50) {
						// 			return i < 50;
						// 		} else {
						// 			return i < oTable._getContexts().length - 1;
						// 		}
						// 	}	
						// });
						_.each(selectedIndices, function (index) {
							if (oTable.getContextByIndex(index))
								selectedContexts.push(oTable.getContextByIndex(index));
						});
					}
					if (oTable.data("selectAll") === "true") {
						selectAll = true;
					}
					else {
						selectAll = false;
					}
					// 188496 - batch request is cancelled on cancel action - end

				}

				var functionName = oButton.data("Action");
				if (functionName == "Row_Details") {
					// 188496 - batch request is cancelled on cancel action - end
					_.each(selectedIndices, function (index) {
						if (oTable.getContextByIndex(index)) {
							selectedContexts.push(oTable.getContextByIndex(index));
							i++;
						}
					});
					// 188496 - batch request is cancelled on cancel action - end
					sap.ui.core.BusyIndicator.hide();
					oController.openDSCToolbarAction(oSmartTable, selectAll, selectedContexts);
					return;
				}

				var functionImport = oMetaModel.getODataFunctionImport(functionName);
				var length = functionImport.parameter.length;

				if (!functionImport.name.endsWith("_REMOVE_FILTER")
					&& !selectAll && functionImport["vui.bodc.SelectionType"].String !== "None" && selectedIndices.length <= 0 && !functionImport.name.indexOf("DOWNLOAD")) {
					sap.ui.core.BusyIndicator.hide();
					return;
				}

				var urlParameters = {};
				if (selectAll) {
					urlParameters["_selal"] = true;
				} else {
					var rowIDs = [];
					for (var i = 0; i < selectedContexts.length; i++) {
						var object = selectedContexts[i].getObject();
						rowIDs.push(object.row_id);
					}
					urlParameters["_row_id"] = rowIDs.toString();
				}
				//				Manual Correction Changes - start
				if (oTable._getScrollExtension && oTable._getScrollExtension().getVerticalScrollbar) {
					viewModel.setProperty("/tablePosition",
						oTable._getScrollExtension().getVerticalScrollbar().scrollTop);
				}
				//				Manual Correction Changes - end
				if (functionImport.name.endsWith("_DOWNLOAD")) {
					//					sap.ui.core.BusyIndicator.hide();
					//					viewModel.setProperty("/skipBusyIndicator", true);
					var downloadDialog = new sap.m.Dialog({
						title: "{i18n>DOWNLOAD}",
						contentWidth: "10rem",
						content: [new sap.m.HBox({
							justifyContent: "Center",
							alignItems: "Center",
							items: [
								new sap.m.Label({ text: "{i18n>FILENAME}" }),
								new sap.m.Input({ value: oTable.getParent().getHeader().split("(")[0] })
							]
						})],
						buttons: [new sap.m.Button({
							text: "{i18n>CONTINUE}",
							type: "Emphasized",
							press: function (oEvent) {
								oEvent.getSource().getParent().close();
								var value = oEvent.getSource().getParent().getContent()[0].getItems()[1].getValue();
								if (value) {
									urlParameters["file_name"] = value;
								}
								oModel.callFunction("/" + functionImport.name, {
									method: "POST",
									batchGroupId: "changes",
									urlParameters: urlParameters
								});
								oModel.submitChanges({
									batchGroupId: "changes",
									success: function (oData, response) {
										oController.showMessagePopover(oController.messageButtonId);
										var url = oModel.sServiceUrl;
										window.open(url, "_blank");
									}
								});
							}
						})]
					});
					jQuery.sap.syncStyleClass(oController.getOwnerComponent().getContentDensityClass(), oController.getView(), downloadDialog);
					oController.getView().addDependent(downloadDialog);
					downloadDialog.open();
					return;
				}
				oModel.callFunction("/" + functionImport.name, {
					method: "POST",
					batchGroupId: "changes",
					urlParameters: urlParameters
				});
				oModel.submitChanges({
					batchGroupId: "changes",
					success: function (oData, response) {
						var entitySet = oSmartTable.getEntitySet();
						oController.showMessagePopover(oController.messageButtonId);
						//oSmartTable.setBusy(false);
						//changes from Du8
						var segmentedButton = oController.getView().byId(DSCId + "::IconTab");

						// var codesSection = dynamicSideContent.getSideContent()[0].getItems()[0].getItems()[0].getItems().find(function (item) {
						// 	return item.getKey() == "codes";
						// });  
						var selectedKey = viewModel.getProperty("/DSCSegmentedButtonSelectedKey");
						if (sideContentTable && selectedKey == "codes") {
							// getting console error on click reprocess - start
							// var codes = dynamicSideContent.getSideContent()[0].getItems()[3]?.getContent()[0].getItems()[1].getContent();
							// if (codes) {
							// 	for (var i = 0; i < codes.length; i++) {
							// 		if (codes[i].getEntitySet) {
							// 			codes[i].rebindList();
							// 		}
							// 		else if (codes[i].getBindingInfo("items")) {
							// 			codes[i].getBindingInfo("items").binding.refresh();
							// 		}
							// 	}
							// }
							var codes = dynamicSideContent.getSideContent()[0].getItems()[0].getItems()[0].getItems().find(function (item) {
								return item.getKey() == "codes";
							}).getContent();

							for (var i = 0; i < codes.length; i++) {
								var items = codes[i] && codes[i].getItems();
								for (var j = 0; j < items.length; j++) {
									if (items[j].getEntitySet) {
										items[j].rebindList();
									} else if (
										items[j].getBindingInfo &&
										items[j].getBindingInfo("items") &&
										items[j].getBindingInfo("items").binding &&
										items[j].getBindingInfo("items").binding.refresh
									) {
										items[j].getBindingInfo("items").binding.refresh();
									}
								}

							}
							// getting console error on click reprocess - start
						}

						if (functionImport.name.endsWith("_REMOVE_FILTER")) {
							var aDocumentFilters = viewModel.getProperty("/aDocFilters");
							//changes from DU8
							var entitySet = oSmartTable.getEntitySet();
							//changes from DU8
							var oDocFilter = _.findWhere(aDocumentFilters, { entitySet: entitySet });

							var sChildEntitiesLabel = "";
							for (var i = 0; i < oDocFilter.children.length; i++) {
								if (sChildEntitiesLabel == "")
									sChildEntitiesLabel = oDocFilter.children[i].label;
								else
									sChildEntitiesLabel = sChildEntitiesLabel + "/" + oDocFilter.children[i].label;
							}

							var oBundle = oController.getView().getModel("i18n").getResourceBundle();
							var message = oBundle.getText("additionalFilterRemoved", [sChildEntitiesLabel]);
							MessageToast.show(message);

							for (var i = 0; i < aDocumentFilters.length; i++) {
								if (aDocumentFilters[i].entitySet === entitySet) {
									aDocumentFilters.splice(i, 1);
								}
							}
							viewModel.setProperty("/aDocFilters", aDocumentFilters);
							viewModel.setProperty("/aDocFiltersLength", aDocumentFilters.length);
							oModel.refresh();
							//							Manual Correction Changes - start
						} else if (
							functionImport["vui.bodc.ActionVisibility"].CorrectionLine &&
							functionImport["vui.bodc.ActionVisibility"].CorrectionLine
								.Bool !== "false"
						) {
							if (
								viewModel.getProperty(
									"/" + entitySet + "showDscCorrectionLines"
								)
							) {
								viewModel.setProperty("/addCorrectionLines" + entitySet, true);
								setTimeout(function () {
									var indices = oTable.getSelectedIndices();
									viewModel.setProperty("/skipSlectionChange", true);
									var correction_line_table_indices = {};
									correction_line_table_indices.tableId = oTable.getId();
									correction_line_table_indices.indices = indices;
									viewModel.setProperty(
										"/correction_line_table_indices",
										correction_line_table_indices
									);
									if (oTable.collapseAll) oTable.collapseAll();
									oController
										.getTableBindingInfo(oSmartTable)
										.binding.refresh();
									//									setTimeout(function(){
									//										for(var i=0; i < indices.length; i++){
									//											if(i == indices.length-1)
									//												viewModel.setProperty("/skipSlectionChange",false);
									//											oTable.addSelectionInterval(indices[i],indices[i]);
									//										}
									//									},800);
									if (
										oData.__batchResponses &&
										oData.__batchResponses[0] &&
										oData.__batchResponses[0].__changeResponses &&
										oData.__batchResponses[0].__changeResponses[0].data &&
										oData.__batchResponses[0].__changeResponses[0].data
											.upd_row_id
									) {
										if (!oController.correction_row_id) {
											oController.correction_row_id = {};
										}
										if (!oController.correction_row_id[entitySet]) {
											oController.correction_row_id[entitySet] = {};
										}
										//										if(rowIDs.length == 1){
										//										oController.correction_row_id[entitySet][rowIDs[0]] = oData.__batchResponses[0].__changeResponses[0].data.upd_row_id;
										//										}
										var correction_row_id =
											oData.__batchResponses[0].__changeResponses[0].data.upd_row_id.split(
												","
											);
										for (var i = 0; i < correction_row_id.length; i++) {
											oController.correction_row_id[entitySet][
												correction_row_id[i].split(":")[0]
											] = correction_row_id[i].split(":")[1];
										}
									}
								});
								//								oController.openDSCToolbarAction(oSmartTable,selectAll,selectedContexts);
							}
							//							Manual Correction Changes - end
						} else if (functionImport.name.endsWith("_DOWNLOAD")) {
							var url = oModel.sServiceUrl;
							//							$.ajax({
							//							url: url,
							//							async: false
							//							}).done(function (data) {
							//							debugger;
							//							});
							//							viewModel.setProperty("/skipBusyIndicator", false);
							window.open(url, "_blank");
							//							$.ajax({
							//							url: url,
							//							type: "post",
							//							responseType: "blob",
							//							dataType: "binary",
							//							success: function(res){
							//							var blob = new Blob([res], {type: "application/vnd.ms-excel"});
							//							var objectUrl = URL.createObjectURL(blob);
							//							window.open(objectUrl);
							//							}
							//							});
						} else {
							var navurl = "";
							if (oData && oData.__batchResponses && oData.__batchResponses.length > 0) {
								for (var i = 0; i < oData.__batchResponses.length; i++) {
									if (oData.__batchResponses[i].__changeResponses && oData.__batchResponses[i].__changeResponses.length) {
										for (var j = 0; j < oData.__batchResponses[i].__changeResponses.length; j++) {
											if (oData.__batchResponses[i].__changeResponses[j].data) {
												navurl = oData.__batchResponses[i].__changeResponses[j].data.navurl;
												break;
											}
										}
									}
									if (navurl && navurl != "")
										break;
								}
								if (navurl && navurl != "") {
									if (navurl[0] !== "#") {
										navurl = "#" + navurl;
									}
									sap.ui.core.BusyIndicator.show(0);
									window.previousModelServiceUrl = oModel.sServiceUrl;
									window.previousModelRCount = oModel.mMetadataUrlParams.RCOUNT;
									window.previousSelectedPaths = viewModel.getProperty("/selectedPaths");
									window.previousDetailLevel = oController.previousLevel;
									var urlParameters = {};
									var SavefunctionImport = oMetaModel.getODataFunctionImport("SAVE");
									if (SavefunctionImport) {
										oModel.callFunction("/" + "SAVE", {
											method: "POST",
											urlParameters: urlParameters,
											success: function (oData, response) {
												delete sessionStorage.semanticObjectParams;
												sap.m.URLHelper.redirect(window.location.href.split('#')[0] + navurl, true);
												sap.ui.core.BusyIndicator.hide();
											},
											error: function (oData, response) {
												sap.ui.core.BusyIndicator.hide();
											}
										});
									} else {
										delete sessionStorage.semanticObjectParams;
										sap.m.URLHelper.redirect(window.location.href.split('#')[0] + navurl, true);
										sap.ui.core.BusyIndicator.hide();
									}
								} else {
									oController.refreshSmartTable(oSmartTable);
								}
								//								sap.ushell.Container.getService("CrossApplicationNavigation").toExternal( {
								//								target : { shellHash : navurl } } );
							} else {
								oController.refreshSmartTable(oSmartTable);
							}
						}
						sap.ui.core.BusyIndicator.hide();
						//						if(oController.isUiTable(oSmartTable.getTable())){
						//						oSmartTable.getTable().clearSelection();
						//						}else{
						//						oSmartTable.getTable().removeSelections(true);
						//						}
						var messageExists = oController.checkResponseForMessages(oData, response);
						if (messageExists) {
							setTimeout(function () {
								oController.showMessagePopover(oController.messageButtonId);
							}, 1000);
						}
					},
					error: function (oData, response) {
						setTimeout(function () {
							oController.showMessagePopover(oController.messageButtonId);
						}, 1000);
						sap.ui.core.BusyIndicator.hide();
					}
				});
			}
		},

		onNavigationLinkClick: function (oEvent) {
			var oController = this;
			var oSource = oEvent.getSource();
			var path = oSource.getBindingContext().getPath();
			var entitySet = path.substr(1, path.indexOf('(') - 1);
			var oObject = oSource.getBindingContext().getObject();

			oController.callNavigationAction(oObject.row_id, entitySet, oSource.data("FieldName").toUpperCase());
		},

		onTableNavigationLinkClick: function (oEvent) {
			var oController = this;
			var oLink = oEvent.getSource();
			var customData = oLink.data();
			var oObject = oLink.getBindingContext().getObject();
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var oSmartTable = oLink.getParent(), oEntity, oRow_Id;
			if (customData.TableEntity) {
				oEntity = customData.TableEntity;
				oRow_Id = customData.row_id
			} else {
				while (true) {
					if (oController.isSmartTable(oSmartTable))
						break;
					else
						oSmartTable = oSmartTable.getParent();
				}
				oEntity = oSmartTable.getEntitySet();
				oRow_Id = oObject.row_id
			}
			var oTableEnitity = oMetaModel.getODataEntitySet(oEntity);
			var oTableEnitityType = oMetaModel.getODataEntityType(oTableEnitity.entityType);
			if (customData.QuickviewEnitity && customData.QuickviewEnitity != "") {
				var QuickviewEnitity = oMetaModel.getODataEntitySet(customData.QuickviewEnitity);
				var QuickviewEnitityType = oMetaModel.getODataEntityType(QuickviewEnitity.entityType);

				var oSmartForm = new sap.ui.comp.smartform.SmartForm({
					entityType: QuickviewEnitityType.name,
					editable: false
				});
				var oSmartFormGroup = new sap.ui.comp.smartform.Group();

				_.each(QuickviewEnitityType["com.sap.vocabularies.UI.v1.Identification"], function (oField) {
					var groupElementProperty = oMetaModel.getODataProperty(QuickviewEnitityType, oField.Value.Path), elementLabel;
					if (groupElementProperty["com.sap.vocabularies.Common.v1.Label"] &&
						groupElementProperty["com.sap.vocabularies.Common.v1.Label"].String) {
						elementLabel = groupElementProperty["com.sap.vocabularies.Common.v1.Label"].String;
					} else if (groupElementProperty["sap:label"]) {
						elementLabel = groupElementProperty["sap:label"];
					}
					else {
						elementLabel = "";
					}
					var oGroupElement = new sap.ui.comp.smartform.GroupElement({
						elements: [
							new sap.ui.comp.smartfield.SmartField({
								value: "{" + oField.Value.Path + "}",
								textLabel: elementLabel,
								wrapping: false
							})
						]
					});
					oSmartFormGroup.addGroupElement(oGroupElement);
				});
				oSmartForm.addGroup(oSmartFormGroup);
				var headerInfo = QuickviewEnitityType["com.sap.vocabularies.UI.v1.HeaderInfo"];
				if (!headerInfo.Description) {
					headerInfo.Description = headerInfo.Title;
				}
				var headerContent = new sap.m.VBox({
					items: new sap.m.HBox({
						items: [new sap.m.HBox({ items: new sap.m.Avatar({ src: "sap-icon://customer" }) }).addStyleClass("sapUiTinyMargin"),
						new sap.m.VBox({
							items: [new sap.m.ObjectIdentifier({
								title: "{" + headerInfo.Title.Value.Path + "}",
								text: "{" + headerInfo.Description.Value.Path + "}",
								titleActive: true,
								titlePress: [oController.onQuickviewTitleClic, oController],
								customData: [new sap.ui.core.CustomData({ key: "oLink", value: oLink })]
							})]
						}).addStyleClass("sapUiTinyMargin")
						]
					})
				});
				var quickViewPopover = new sap.m.Popover({
					customHeader: headerContent,
					content: oSmartForm,
					resizable: true,
					placement: "Auto"
				});
				var property;
				for (var i = 0; i < oLink.getBindingInfo("text").parts.length; i++) {
					property = _.find(oTableEnitityType.property, { name: oLink.getBindingInfo("text").parts[i].path });
					if (property) {
						break;
					}
				}
				quickViewPopover.setModel(oModel);
				quickViewPopover.bindElement({
					path: "/" + customData.QuickviewEnitity + "(row_id='" + oRow_Id + "')",
					parameters: {
						"custom": {
							"entst": oEntity,
							"fldnm": oLink.data("FieldName")
						}

					}
				});
				setTimeout(function () {
					quickViewPopover.openBy(oLink);
				}, 600);
			} else {
				if (customData.HREF) {
					if (customData.ICON) {
						window.open(oObject[customData.HREF] + "&view=true", '_blank');
					}
				} else if (oRow_Id) {
					oController.callNavigationAction(oRow_Id, oEntity, oLink.data("FieldName").toUpperCase());
				} else {
					oController.callNavigationAction(oObject.row_id, oEntity, oLink.data("FieldName").toUpperCase());
				}
			}
		},
		callNavigationAction: function (row_id, entitySet, fieldname) {
			var oController = this;

			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();

			var functionImport = oMetaModel.getODataFunctionImport('NAVIGATE');
			if (!functionImport)
				return;

			var urlParameters = {};
			urlParameters["_row_id"] = row_id;
			urlParameters['entst'] = entitySet;
			urlParameters['fldnm'] = fieldname;


			//			if(sap.ushell.Container && sap.ushell.Container.getService){
			sap.ui.core.BusyIndicator.show(0);

			oModel.callFunction("/" + functionImport.name, {
				method: "POST",
				batchGroupId: "changes",
				urlParameters: urlParameters
			});
			oModel.submitChanges({
				batchGroupId: "changes",
				success: function (oData, response) {
					oController.showMessagePopover(oController.messageButtonId);
					var navurl = "", genurl = "";
					if (oData && oData.__batchResponses && oData.__batchResponses.length > 0) {
						for (var i = 0; i < oData.__batchResponses.length; i++) {
							if (oData.__batchResponses[i].__changeResponses && oData.__batchResponses[i].__changeResponses.length) {
								for (var j = 0; j < oData.__batchResponses[i].__changeResponses.length; j++) {
									if (oData.__batchResponses[i].__changeResponses[j].data) {
										navurl = oData.__batchResponses[i].__changeResponses[j].data.navurl;
										// Navigation issue in fiori launchpad
										genurl = oData.__batchResponses[i].__changeResponses[j].data.genurl;
										// Navigation issue in fiori launchpad
										break;
									}
								}
							}
							if (navurl != "")
								break;
						}
						if (navurl != "" || genurl != "") { // Navigation issue in fiori launchpad
							if (navurl[0] !== "#") {
								navurl = "#" + navurl;
							}
							// Navigation issue in fiori launchpad
							// if (genurl[0] !== "#") {
							// 	genurl = "#" + genurl;
							// }
							// Navigation issue in fiori launchpad
							//							sap.m.URLHelper.redirect(window.location.href.split('#')[0].split('/sap')[0] + navurl, true);
							// Navigation issue in fiori launchpad --Start
							if (sap.ushell && sap.ushell.Container && sap.ushell.Container.getService && sap.ushell.Container.getService("CrossApplicationNavigation")) {
								sap.m.URLHelper.redirect(window.location.href.split('#')[0] + navurl, true);
							}
							else {
								sap.m.URLHelper.redirect(window.location.origin + genurl, true);
							}
							// Navigation issue in fiori launchpad --End
							//							var semObj = navurl.slice(1).split("&/")[0].split("-")[0];
							//							var action = navurl.slice(1).split("&/")[0].split("-")[1];
							//							var paramsArray = navurl.slice(1).split("&/")[1].split(":");
							//							var params = {};
							//							for(var i=0; i<paramsArray.length; i++){
							//								params[paramsArray[i].split("-")[0]] = paramsArray[i].split("-")[1];
							//							}
							//							var href_For_nav =  sap.ushell.Container.getService("CrossApplicationNavigation").hrefForExternal({
							//							  target : { semanticObject : semObj, action : action },
							//							  params : params
							//							});
							//							sap.m.URLHelper.redirect(window.location.href.split('#')[0] + href_For_nav, true);
						}
						//						sap.ushell.Container.getService("CrossApplicationNavigation").toExternal( {
						//						target : { shellHash : navurl } } );
					}
					sap.ui.core.BusyIndicator.hide();
				},
				error: function (oData, response) {
					if (oData.responseText) {
						var messageDetails = JSON.parse(oData.responseText);
						if (messageDetails.error.innererror.errordetails.length > 0) {
							oController.prepareMessageDialog(messageDetails.error.innererror.errordetails, oController);
						}
					}
					sap.ui.core.BusyIndicator.hide();
				}
			});
			//			}
		},

		//		Bulk Edit
		onDetailBulkEdit: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();

			oController.removeTransientMessages();

			var errorMessages = oController.checkErrorMessageExist(oModel);
			if (errorMessages) {
				oController.showMessagePopover(oController.messageButtonId);
				return;
			}

			var oMetaModel = oModel.getMetaModel();
			var oTable = oEvent.getSource().getParent().getParent();
			var oSmartTable = oTable.getParent();
			var controlId = oSmartTable.getId();
			var entitySet = oSmartTable.getEntitySet();
			var entityType = entitySet + "Type";
			var oEntitySet = oMetaModel.getODataEntitySet(entitySet);
			var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);

			var tableKey = oSmartTable.getId();
			var tableColumns = oTable.getColumns();
			var selectedContexts, showApplyAll, selectedIndices, selectAll;

			var oView = oController.getView();
			var oViewContext = oView.getBindingContext();
			var sTableBindingPath = "", sBindingPath = "";
			var oEntityType, oEntitySet, oNavigationEnd, oMetaModel;
			//VHD#740535->Error as Workspace encountered internal server error on cal run post - Start
			var count;
			if (oSmartTable.getTable() instanceof sap.m.Table) {
				count = oSmartTable.getTable().getMaxItemsCount();
			} else if (oSmartTable.getTable() instanceof sap.ui.table.Table) {
				count = oSmartTable.getTable().getBinding("rows").getLength();
			}
			//VHD#740535->Error as Workspace encountered internal server error on cal run post - End
			if (oViewContext) {
				// Detail screen
				sTableBindingPath = oController.getTableBindingInfo(oSmartTable).path;

				// create binding path
				sTableBindingPath = "/" + sTableBindingPath;
				sBindingPath = oViewContext.getPath() + sTableBindingPath;
			} else {
				// on list, support only one entityset mapped to the root
				// component
				sBindingPath = "/" + entitySet;
			}

			if (oTable.getSelectedContexts) {
				selectedContexts = oTable.getSelectedContexts();
				if (oTable.getVisibleItems().length == oTable.getSelectedItems().length &&
					oTable.getVisibleItems().length >= oTable.getGrowingThreshold()) {
					selectAll = true;
				}
			} else {
				// VHD#740535->Error as Workspace encountered internal server error on cal run post
				if (count == oTable.getSelectedIndices().length &&
					count >= oTable.getVisibleRowCount()) {
					selectAll = true;
				}
				if (selectAll) {
					selectedContexts = oTable._getRowContexts();
				} else {
					selectedIndices = oTable.getSelectedIndices();
					selectedContexts = [];
					_.each(selectedIndices, function (index) {
						selectedContexts.push(oTable.getContextByIndex(index));
					});
				}
			}
			if (selectAll && oController.columnPosition == 'beginColumn') {
				showApplyAll = true;
			} else {
				showApplyAll = false;
			}
			var columnkeys = [];
			var aNavigationColGroups = [];
			_.each(tableColumns, function (column) {
				var key = column.data("p13nData").columnKey;
				if (key == 'edtst')
					return;
				if (key.indexOf('/') == -1) {
					var object = _.findWhere(oEntityType.property, { name: key });

					if (object['com.sap.vocabularies.UI.v1.ReadOnly']
						&& object['com.sap.vocabularies.UI.v1.ReadOnly'].Bool
						&& object['com.sap.vocabularies.UI.v1.ReadOnly'].Bool == "true") {
						return;
					}
					if (object['com.sap.vocabularies.Common.v1.FieldControl']
						&& object['com.sap.vocabularies.Common.v1.FieldControl'].EnumMember
						&& object['com.sap.vocabularies.Common.v1.FieldControl'].EnumMember == "com.sap.vocabularies.Common.v1.FieldControlType/ReadOnly") {
						return;
					}

					if (!_.find(oEntityType.key.propertyRef, { "name": key })) {
						columnkeys.push(key);
					}
				} else {
					var aNavigationProperty = key.split('/');
					var sNavigationProperty = aNavigationProperty[0];

					var sProperty = aNavigationProperty[1];
					var oNavEntitySet = oMetaModel.getODataEntitySet(oMetaModel.getODataAssociationSetEnd(oEntityType, sNavigationProperty).entitySet);
					var oNavEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataAssociationEnd(oEntityType, sNavigationProperty).type)

					var object = _.findWhere(oNavEntityType.property, { name: sProperty });

					if (object['com.sap.vocabularies.UI.v1.ReadOnly']
						&& object['com.sap.vocabularies.UI.v1.ReadOnly'].Bool
						&& object['com.sap.vocabularies.UI.v1.ReadOnly'].Bool == "true") {
						return;
					}
					if (object['com.sap.vocabularies.Common.v1.FieldControl']
						&& object['com.sap.vocabularies.Common.v1.FieldControl'].EnumMember
						&& object['com.sap.vocabularies.Common.v1.FieldControl'].EnumMember == "com.sap.vocabularies.Common.v1.FieldControlType/ReadOnly") {
						return;
					}

					var smartFormGroup = new sap.ui.comp.smartform.Group({
						label: object['com.sap.vocabularies.Common.v1.Label'].String,
						groupElements: [
							new sap.ui.comp.smartform.GroupElement({
								modelContextChange: [oController.onModelContextChange, oController],
								elements: [new sap.ui.comp.smartmultiinput.SmartMultiInput({
									value: "{" + sProperty + "}",
									entitySet: oNavEntitySet.name,
									supportRanges: false,
									mandatory: false,
									textLabel: "{i18n>ADD}",
									customData: new sap.ui.core.CustomData({
										"key": "propertyName",
										"value": oNavEntitySet.name.toLowerCase() + "_" + sProperty + "_add"
									})
								})]
							}),
							new sap.ui.comp.smartform.GroupElement({
								modelContextChange: [oController.onModelContextChange, oController],
								elements: [new sap.ui.comp.smartmultiinput.SmartMultiInput({
									value: "{" + sProperty + "}",
									entitySet: oNavEntitySet.name,
									mandatory: false,
									supportRanges: false,
									textLabel: "{i18n>REMOVE}",
									customData: new sap.ui.core.CustomData({
										"key": "propertyName",
										"value": oNavEntitySet.name.toLowerCase() + "_" + sProperty + "_remove"
									})
								})]
							})
						]
					});

					aNavigationColGroups.push(smartFormGroup);
				}
			});

			if (selectedContexts.length > 0) {
				var groupElements = [];
				_.each(columnkeys, function (group) {
					var groupElement = new sap.ui.comp.smartform.GroupElement({
						elements: [new sap.ui.comp.smartmultiedit.Field({
							propertyName: group,
						})]
					});
					groupElements.push(groupElement);
				});

				var multiEditSmartForm = new sap.ui.comp.smartform.SmartForm({
					editable: true,
					groups: [new sap.ui.comp.smartform.Group({
						groupElements: groupElements
					})]
				});
				var navigationSmartForm = null;
				if (aNavigationColGroups.length > 0) {
					navigationSmartForm = new sap.ui.comp.smartform.SmartForm({
						editable: true,
						groups: aNavigationColGroups
					});
				}

				var smartmultiEditContainer = new sap.ui.comp.smartmultiedit.Container({
					entitySet: entitySet,
					id: "multiEditContainer",
					layout: [multiEditSmartForm]
				});

				var multiEditDialog = new sap.m.Dialog({
					title: "{i18n>EDITMULTIPLE}",
					stretchOnPhone: true,
					contentWidth: "30rem",
					horizontalScrolling: false,
					content: [smartmultiEditContainer],
					buttons: [new sap.m.Button({
						text: "{i18n>APPLY}",
						type: "Emphasized",
						press: function (oEvent) {
							oController.onBulkEditSave(oEvent, oController, entitySet, selectAll, false);
						}
					}),
					new sap.m.Button({
						text: "{i18n>APPLYINBACKGROUND}",
						visible: showApplyAll,
						press: function (oEvent) {
							oController.onBulkEditSave(oEvent, oController, entitySet, selectAll, true);
						}
					}),
					new sap.m.Button({
						text: "{i18n>CLOSE}",
						press: function (oEvent) {
							var oDialog = oEvent.getSource().getParent();
							if (oTable.removeSelections) {
								oTable.removeSelections();
								oTable.destroyInfoToolbar();
								var bulkEditButtonId = oSmartTable.getCustomToolbar().getId() + "::BulkeditButton";
								var bulkeditButton = sap.ui.getCore().getElementById(bulkEditButtonId);
								bulkeditButton.setEnabled(false);
							} else {
								oTable.clearSelection();
							}
							oDialog.destroyContent();
							oDialog.close();
						}
					})]
				}).addStyleClass("sapUiPopupWithPadding");

				if (navigationSmartForm != null) {
					multiEditDialog.addContent(navigationSmartForm);
				}

				multiEditDialog.addCustomData(new sap.ui.core.CustomData({ "key": "parentControlId", "value": controlId }));

				multiEditDialog.bindElement(sBindingPath);

				multiEditDialog.getContent()[0].setContexts(selectedContexts);

				jQuery.sap.syncStyleClass(oController.getOwnerComponent().getContentDensityClass(), oController.getView(), multiEditDialog);
				oController.getView().addDependent(multiEditDialog);
				multiEditDialog.open();
				sap.ui.core.BusyIndicator.hide();
			}
		},

		onBulkEditSave: function (oEvent, oController, entitySet, selectAll, isApplyBackground) {
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var oDialog = oEvent.getSource().getParent();
			var oSmartTableId = oDialog.getCustomData()[0].getValue();
			var oSmartTable = sap.ui.getCore().getElementById(oSmartTableId);
			var oTable = oSmartTable.getTable();
			var oMultiEditContainer = oDialog.getContent()[0];
			var aUpdatedContexts, oContext, oUpdatedData, oObject, oUpdatedDataCopy, rowIDs = [];

			var oNavSmartForm = null;
			if (oDialog.getContent()[1]) {
				oNavSmartForm = oDialog.getContent()[1];
			}

			oMultiEditContainer.getAllUpdatedContexts(true).then(function (result) {
				aUpdatedContexts = result;
				for (var i = 0; i < aUpdatedContexts.length; i++) {
					oContext = aUpdatedContexts[i].context;
					oObject = oContext.getObject();

					var rowId = oObject.row_id;
					rowIDs.push(rowId);
				}
				var urlParameters = {};
				var functionImport = oMetaModel.getODataFunctionImport(entitySet + "_BulkEditApply");
				if (selectAll) {
					urlParameters["_selal"] = true;
				} else {
					urlParameters["_row_id"] = rowIDs.toString();
				}
				if (isApplyBackground) {
					urlParameters["_prcbg"] = 'X';
				}

				_.each(oMultiEditContainer.getFields(), function (oField) {
					if (!oField.isKeepExistingSelected()) {
						var oObject = oField.getRawValue(); // Use this in case
						// if there is no
						// context
						if (oField.isBlankSelected()) {
							switch (oField.getDataType()) {
								case "Edm.String":
									urlParameters[oField.getPropertyName()] = "";
									break;
								case "Edm.Boolean":
									urlParameters[oField.getPropertyName()] = false;
									break;
								case "Edm.Byte":
								case "Edm.Decimal":
								case "Edm.Double":
								case "Edm.Single":
								case "Edm.Int16":
								case "Edm.Int32":
								case "Edm.Int64":
								case "Edm.SByte":
									urlParameters[oField.getPropertyName()] = 0;
									var sUomPropertyName = oField.getUnitOfMeasurePropertyName();
									if (oField.isComposite()) {
										urlParameters[sUomPropertyName] = "";
									}
									break;
								case "Edm.DateTime":
									urlParameters[oField.getPropertyName()] = new Date(0);
									break;
								default:
									urlParameters[oField.getPropertyName()] = "";
									break;
							}
						} else {
							urlParameters[oField.getPropertyName()] = oObject[oField.getPropertyName()];

							if (urlParameters[oField.getPropertyName()] == null) {
								switch (oField.getDataType()) {
									case "Edm.String":
										urlParameters[oField.getPropertyName()] = "";
										break;
									case "Edm.Boolean":
										urlParameters[oField.getPropertyName()] = false;
										break;
									case "Edm.Byte":
									case "Edm.Decimal":
									case "Edm.Double":
									case "Edm.Single":
									case "Edm.Int16":
									case "Edm.Int32":
									case "Edm.Int64":
									case "Edm.SByte":
										urlParameters[oField.getPropertyName()] = 0;
										var sUomPropertyName = oField.getUnitOfMeasurePropertyName();
										if (oField.isComposite()) {
											urlParameters[sUomPropertyName] = "";
										}
										break;
									case "Edm.DateTime":
										urlParameters[oField.getPropertyName()] = new Date(0);
										break;
									default:
										urlParameters[oField.getPropertyName()] = "";
										break;
								}
							}

							var sUomPropertyName = oField.getUnitOfMeasurePropertyName();
							if (oField.isComposite()) {
								urlParameters[sUomPropertyName] = oObject[sUomPropertyName];
								if (urlParameters[sUomPropertyName] == null) {
									urlParameters[sUomPropertyName] = "";
								}
							}

						}
					}
				});

				if (oNavSmartForm) {
					_.each(oNavSmartForm.getGroups(), function (oGroup) {
						_.each(oGroup.getGroupElements(), function (oGroupElement) {
							_.each(oGroupElement.getElements(), function (oField) {
								var value = "";
								_.each(oField.getTokens(), function (oToken) {
									if (value != "") {
										value = value + ","
									}
									value = value + oToken.getKey();
								});
								urlParameters[oField.data("propertyName")] = value;
							});
						});
					});
				}

				oController.removeTransientMessages();

				oModel.callFunction("/" + entitySet + "_BulkEditApply", {
					method: "POST",
					batchGroupId: "changes",
					urlParameters: urlParameters,
				});
				oModel.submitChanges({
					batchGroupId: "changes",
					success: function (oData, response) {
						oController.showMessagePopover(oController.messageButtonId);
						oDialog.destroyContent();
						oDialog.close();
						oModel.refresh(true);
						if (isApplyBackground) {
							var msg = JSON.parse(response.headers["sap-message"]).message;
							history.go(-1);
							MessageToast.show(msg);
						} else {
							if (oTable.removeSelections) {
								oTable.removeSelections();
								oTable.destroyInfoToolbar();
								var bulkEditButtonId = oSmartTable.getCustomToolbar().getId() + "::BulkeditButton";
								var bulkeditButton = sap.ui.getCore().getElementById(bulkEditButtonId);
								bulkeditButton.setEnabled(false);
							} else {
								oTable.clearSelection();
							}
						}
						var messageExists = oController.checkResponseForMessages(oData, response);
						if (messageExists) {
							setTimeout(function () {
								oController.showMessagePopover(oController.messageButtonId);
							}, 1000);
						}
					},
					error: function (oData, response) {
						setTimeout(function () {
							oController.showMessagePopover(oController.messageButtonId);
						}, 1000);
						//						sap.ui.core.BusyIndicator.hide();
					}
				});
			});
		},

		noBackPlease: function () { // this function adds a dummy hash to the
			// URL and is used to show confirmation when
			// back is clicked
			var hashChanger = sap.ui.core.routing.HashChanger.getInstance();
			if (hashChanger && hashChanger["registerNavigationFilter"]) {
				return;
			}
			var oController = this;
			var viewModel = oController.getOwnerComponent().getModel("viewModel");
			if (window.location.hash.lastIndexOf("#!") != window.location.hash.length - 2) {
				viewModel.setProperty("/preventHashChange", true);
				viewModel.setProperty("/skipPageRefresh", true);
				window.location.href += "#!";
			}
		},

		removenoBackHash: function () { // this function removes the dummy hash
			// present at the end of URL
			var hashChanger = sap.ui.core.routing.HashChanger.getInstance();
			if (hashChanger && hashChanger["registerNavigationFilter"]) {
				return;
			}
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			if (window.location.hash.indexOf("#!") == window.location.hash.length - 2) {
				viewModel.setProperty("/preventHashChange", true);
				viewModel.setProperty("/skipPageRefresh", true);
				//				window.location.hash =
				//				window.location.hash.substr(0,window.location.hash.length - 2);
				history.go(-1);
			}
		},

		onModelContextChange: function (oEvent) {
			var oSource = oEvent.getSource();
			var oLabel = oSource.getLabelControl();
			oLabel.addStyleClass('vistexNonMandatory');
		},

		onMultiInputInnerControlCreated: function (oEvent) {
			var oController = this;
			var oModel = this.getView().getModel();
			var oViewModel = oController.getView().getModel("viewModel");
			var oSource = oEvent.getSource();
			var oInput = oSource.getInnerControls()[0];
			if (oInput instanceof sap.m.MultiComboBox) {
				oInput.attachSelectionFinish(function (oEvent) {
					if (oModel.hasPendingChanges(true)) {
						sap.ui.core.BusyIndicator.show(0);
						oViewModel.setProperty("/modelChanged", true);
						// confirmation popup changes nav from launchpad
						if (parent && parent.commonUtils && parent.commonUtils.dataChanged) {
							parent.commonUtils.dataChanged = true;
						}
						// confirmation popup changes nav from launchpad
						oModel.submitChanges({
							batchGroupId: "changes",
							success: function (data, resonse) {
								oController.showMessagePopover(oController.messageButtonId);
								sap.ui.core.BusyIndicator.hide();
								oModel.refresh();
							},
							error: function (data, response) {
								oController.showMessagePopover(oController.messageButtonId);
								sap.ui.core.BusyIndicator.hide();
							}
						});
					}
				});
			}
		},

		onSliderValueChange: function (oEvent) {
			var oController = this;
			var oViewModel = oController.getView().getModel("viewModel");
			oViewModel.setProperty("/modelChanged", true);
			// confirmation popup changes nav from launchpad
			if (parent && parent.commonUtils && parent.commonUtils.dataChanged) {
				parent.commonUtils.dataChanged = true;
			}
			// confirmation popup changes nav from launchpad
			var oModel = oController.getView().getModel();
			oModel.submitChanges({
				batchGroupId: "changes",
				success: function (oData, response) {
					oController.showMessagePopover(oController.messageButtonId);
					sap.ui.core.BusyIndicator.hide();
					oModel.refresh();
				},
				error: function (data, response) {
					oController.showMessagePopover(oController.messageButtonId);
					sap.ui.core.BusyIndicator.hide();
				}
			});
		},

		checkResponseForMessages: function (oData, oResponse) {
			var messageExist = false;
			if (oData.__batchResponses) {
				_.each(oData.__batchResponses, function (batchResponse) {
					if (batchResponse.__changeResponses) {
						_.each(batchResponse.__changeResponses, function (changeResponse) {
							if (changeResponse.headers && changeResponse.headers['sap-message']) {
								var message = changeResponse.headers['sap-message'];
								if (message != "") {
									//									var jsonObject = JSON.parse(message);
									//									if(jsonObject.severity && jsonObject.severity == "error"){
									messageExist = true;
									return;
									//									}
								}
							}
						});
						if (messageExist)
							return;
					} else if (batchResponse.response && batchResponse.response.body) {
						var jsonObject = JSON.parse(batchResponse.response.body);
						if (jsonObject.error) {
							messageExist = true;
							return;
						}
					}
				});
			}
			if (!messageExist) {
				if (oResponse.headers && oResponse.headers["sap-message"]) {
					messageExist = true;
				}
			}
			return messageExist;
		},
		handleSideContentHide: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oSource = oEvent.getSource();
			var oDynamicSideContent = oSource.getParent();
			while (true) {
				if (oDynamicSideContent.setShowSideContent)
					break;
				else
					oDynamicSideContent = oDynamicSideContent.getParent();
			}
			oController.onClosingDscSideContent(oDynamicSideContent);
		},

		getDynamicSideContent: function (oControl) {
			while (true) {
				if (oControl.setShowSideContent)
					break;
				else
					oControl = oControl.getParent();
			}
			return oControl;
		},

		getResponsiveSplitter: function (oControl) {
			var oController = this;
			while (true) {
				if (oController.isControlOfType(oControl, "sap/ui/layout/ResponsiveSplitter"))
					break;
				else
					oControl = oControl.getParent();
			}
			return {
				content: oControl,
				getMainContent: function () {
					return oControl.getRootPaneContainer().getPanes()[0].getContent().getContent()[0].getContent();
				},
				getSideContent: function () {
					return oControl.getRootPaneContainer().getPanes()[1].getContent().getContent();
				},
				setShowSideContent: function (bValue) {

					if (bValue) {

						oControl.getRootPaneContainer().getPanes()[0].setLayoutData(new sap.ui.layout.SplitterLayoutData({ size: "70%" }));
						oControl.getRootPaneContainer().getPanes()[1].getContent().setVisible(true);
						//hiding the splitter bar
						// oControl.removeStyleClass("hideSplitterBar");
						oControl.getRootPaneContainer().getParent().$().removeClass("hideSplitterBar");
						//oControl.getRootPaneContainer().getParent().$().find(".sapUiLoSplitterBar").removeClass("vistex-display-none");
						//hiding the splitter bar
					} else {
						oControl.getRootPaneContainer().getPanes()[0].setLayoutData(new sap.ui.layout.SplitterLayoutData({ size: "100%" }));
						oControl.getRootPaneContainer().getPanes()[1].getContent().setVisible(false);
						//hiding the splitter bar
						// oControl.addStyleClass("hideSplitterBar");
						oControl.getRootPaneContainer().getParent().$().addClass("hideSplitterBar");
						//oControl.getRootPaneContainer().getParent().$().find(".sapUiLoSplitterBar").addClass("vistex-display-none");
						//hiding the splitter bar
					}
				},
				getShowSideContent: function () {
					return oControl.getRootPaneContainer().getPanes()[1].getContent().getVisible();
				}
			};
		},

		onClosingDscSideContent: function (DynamicSideContent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var currentRoute = viewModel.getProperty("/currentRoute");
			if (currentRoute == "Detail") {
				viewModel.setProperty("/DetailshowHideDsc", false);
			} else if (currentRoute == "DetailDetail") {
				viewModel.setProperty("/DetailDetailshowHideDsc", false);
			}
			if (DynamicSideContent.getMainContent) {
				if (DynamicSideContent.getMainContent()[1]) {
					var mainContentTable = DynamicSideContent.getMainContent()[1].getTable();
					if (DynamicSideContent.getMainContent()[1].getTable().getRows) {
						DynamicSideContent.getMainContent()[1].getTable().clearSelection();
					} else {
						DynamicSideContent.getMainContent()[1].getTable().removeSelections();
					}
				} else {
					var mainContentTable = DynamicSideContent.getMainContent()[0].getTable();
					if (DynamicSideContent.getMainContent()[0].getTable().getRows) {
						DynamicSideContent.getMainContent()[0].getTable().clearSelection();
						// 188496 - batch request is cancelled on cancel action
						oController.skipRefreshSmartTable = true;
						// 188496 - batch request is cancelled on cancel action
					} else {
						DynamicSideContent.getMainContent()[0].getTable().removeSelections();
					}
				}
				var DSCId = DynamicSideContent.content.getId();
				var sideContentTable = oController.getView().byId(DSCId + "::Table");
				if (!sideContentTable) {
					var sideContentTable = sap.ui.getCore().byId(DSCId + "::Table");
				}
				if (sideContentTable)
					sideContentTable.unbindElement();
			} else {
				return;
			}
			//			if(viewModel.getProperty("/layout") == "MidColumnFullScreen"){
			//			oController.onExpand();
			//			}
			//			viewModel.setProperty("/modelChanged",false);
			var entitySet = mainContentTable.getParent().getEntitySet();
			if (DynamicSideContent.getShowSideContent())
				DynamicSideContent.setShowSideContent(false);
			viewModel.setProperty("/" + entitySet + "showingSideContent", false);
			viewModel.setProperty("/" + entitySet + "showDscApply", false);
			//				Manual Correction Changes - start
			viewModel.setProperty("/addCorrectionLines" + entitySet, false);
			viewModel.setProperty(
				"/" + entitySet + "showDscCorrectionLines",
				false
			);
			//				Manual Correction Changes - end
			viewModel.setProperty("/DSCSegmentedButtonSelectedKey", "");
		},

		// matchSectionPrepare: function (matchEntities, itemTabBar) {
		// 	var oController = this;
		// 	var oModel = oController.getView().getModel();
		// 	var oMetaModel = oModel.getMetaModel();
		// 	var oMatchPathMenu = new sap.m.Menu();
		// 	var oToolsMenu = new sap.m.Menu();
		// 	var oMatchPaths = [];
		// 	itemTabBar.getItems()[2].removeAllContent();
		// 	var oEntitySet, oEntityType, matchResultSelectEnabled;
		// 	var viewModel = oController.getView().getModel("viewModel");

		// 	viewModel.setProperty("/matchDetails", {});

		// 	var mainTableSelectedPath = viewModel.getProperty("/mainTableSelectedPath");
		// 	var mainTableSelectedRowData = oModel.getProperty(mainTableSelectedPath);
		// 	if (mainTableSelectedRowData.edtst !== "1") {
		// 		matchResultSelectEnabled = false;
		// 	} else {
		// 		matchResultSelectEnabled = true;
		// 	}

		// 	viewModel.setProperty("/matchDetails/enabled", matchResultSelectEnabled);

		// 	for (var i = 0; i < matchEntities.length; i++) {
		// 		oEntitySet = oMetaModel.getODataEntitySet(matchEntities[i]);
		// 		if (oEntitySet && oEntitySet.entityType) {
		// 			oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
		// 		}
		// 		if (oEntityType && oEntityType['com.sap.vocabularies.UI.v1.HeaderInfo']) {
		// 			oMatchPathMenu.addItem(new sap.m.MenuItem({
		// 				text: oEntityType['com.sap.vocabularies.UI.v1.HeaderInfo'].TypeName.String,
		// 				press: oController.matchPathSelect.bind(oController)
		// 			}).data({
		// 				name: matchEntities[i],
		// 				entityType: oEntitySet.entityType,
		// 				tabBarId: itemTabBar.getId(),
		// 				source: "mPath"
		// 			}));
		// 			oMatchPaths.push({
		// 				name: matchEntities[i],
		// 				text: oEntityType['com.sap.vocabularies.UI.v1.HeaderInfo'].TypeName.String,
		// 				entityType: oEntitySet.entityType,
		// 				tabBarId: itemTabBar.getId()
		// 			});
		// 		}
		// 	}

		// 	if (oMatchPaths.length > 0) {
		// 		viewModel.setProperty("/matchDetails/matchPaths", oMatchPaths);
		// 	}
		// 	//#164828 -> Approval Integration via Action code(GTM sync ) --Start     

		// 	if (viewModel.getProperty("/matchResultActionPerformed")) {
		// 		viewModel.setProperty("/matchResultActionPerformed", false);
		// 		var mParameters = viewModel.getProperty(
		// 			"/currentSegmentedButtonParams"
		// 		);
		// 		var selectedItem = itemTabBar
		// 			.getItems()[2]
		// 			.getItems()
		// 			.find(function (item) {
		// 				return item.getText() == mParameters.selectedItem.getText();
		// 			});
		// 		itemTabBar._getIconTabHeader().setSelectedItem(selectedItem);
		// 	}
		// 	//#164828 -> Approval Integration via Action code(GTM sync ) --End     

		// 	var oControl = new sap.m.VBox().addStyleClass("sapUiSmallMarginTop");

		// 	oEntitySet = oMetaModel.getODataEntitySet(matchEntities[0]);
		// 	if (oEntitySet && oEntitySet.entityType) {
		// 		var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
		// 	}
		// 	var thldpProp = oEntityType.property.find(function (prop) {
		// 		return prop.name === "thldp"
		// 	});
		// 	var oMenuButton;
		// 	if (thldpProp) {
		// 		oToolsMenu.addItem(new sap.m.MenuItem({
		// 			text: {
		// 				parts: [{ path: "viewModel>/matchDetails/hdrProp/thldp" }, { path: "i18n>CONFIDENCE" }],
		// 				formatter: function (thldp, text) {
		// 					return text + ": " + thldp + "%"
		// 				}
		// 			},
		// 			press: oController.onMatchTresholdChange.bind(oController)
		// 		}));
		// 		oToolsMenu.addItem(new sap.m.MenuItem({
		// 			icon: "sap-icon://sys-find",
		// 			text: { path: "i18n>FIND" },
		// 			press: oController.openMatchToolsDialog.bind(oController)
		// 		}));
		// 		//				oMenuButton = new sap.m.MenuButton({
		// 		//				text:{path:"i18n>TOOLS"},
		// 		//				menu: oToolsMenu,
		// 		//				type: sap.m.ButtonType.Transparent,
		// 		//				});
		// 		oMenuButton = new sap.m.Button({
		// 			text: "{i18n>TOOLS}",
		// 			type: sap.m.ButtonType.Transparent,
		// 			press: oController.onMatchTresholdChange.bind(oController)
		// 		});
		// 	} else {
		// 		oController.adjustmentFlow = true;
		// 		oMenuButton = new sap.m.Button({
		// 			icon: "sap-icon://sys-find",
		// 			tooltip: { path: "i18n>FIND" },
		// 			type: sap.m.ButtonType.Transparent,
		// 			press: oController.openMatchToolsDialog.bind(oController)
		// 		});
		// 	}


		// 	var oToolbar = new sap.m.Toolbar({
		// 		content: [
		// 			new sap.m.HBox({
		// 				alignItems: "Center",
		// 				items: [
		// 					new sap.m.Label({
		// 						text: "{i18n>MATCHFOR}:",
		// 						//								layoutData: new sap.m.OverflowToolbarLayoutData({
		// 						//								priority: "NeverOverflow"
		// 						//								})
		// 					}),
		// 					new sap.m.MenuButton({
		// 						menu: oMatchPathMenu,
		// 						type: sap.m.ButtonType.Transparent,
		// 						//								width:"80%"
		// 					}),
		// 				],
		// 				//							width:"38%",
		// 				//							layoutData: new sap.m.OverflowToolbarLayoutData({
		// 				//							priority: "NeverOverflow"
		// 				//							})
		// 			}),

		// 			new sap.m.HBox({
		// 				alignItems: "Center",
		// 				items: [
		// 					new sap.m.Label({
		// 						text: "{i18n>MATCHBY}:",
		// 						visible: false,
		// 						//								layoutData: new sap.m.OverflowToolbarLayoutData({
		// 						//								priority: "NeverOverflow"
		// 						//								})
		// 					}),
		// 					new sap.m.MenuButton({
		// 						menu: new sap.m.Menu(),
		// 						type: sap.m.ButtonType.Transparent,
		// 						visible: false,
		// 						//								width:"80%"
		// 					}),
		// 				],
		// 				//							width:"38%",
		// 				//							layoutData: new sap.m.OverflowToolbarLayoutData({
		// 				//							priority: "NeverOverflow"
		// 				//							})
		// 			}),
		// 			//					new sap.m.Button({
		// 			//					// text: "Confidence: ≥ 20%",
		// 			//					text: {parts:[{path:
		// 			//					"viewModel>/matchDetails/hdrProp/thldp"},{path:"i18n>CONFIDENCE"}],
		// 			//					formatter: function(thldp,text){
		// 			//					return text + ": " + thldp + "%"
		// 			//					}
		// 			//					},
		// 			//					type: sap.m.ButtonType.Transparent,
		// 			//					press: oController.onMatchTresholdChange.bind(oController)
		// 			//					}),
		// 			new sap.m.ToolbarSpacer(),
		// 			oMenuButton
		// 			//					new sap.m.Button({
		// 			//					icon: "sap-icon://compare",
		// 			//					text: {path:"i18n>TOOLS"},
		// 			//					type: sap.m.ButtonType.Transparent,
		// 			//					press: oController.openMatchToolsDialog.bind(oController)
		// 			//					})
		// 		]
		// 	});

		// 	oControl.addItem(oToolbar);

		// 	itemTabBar.getItems()[2].addContent(oControl);

		// 	//			oMatchPathMenu.getItems()[0].firePress();

		// },
		//#164828 -> Approval Integration via Action code(GTM sync ) --Start     


		// prepareMatchToolbar: function (iconTab) {
		// 	var oController = this;
		// 	var viewModel = oController.getView().getModel("viewModel");
		// 	var matchEntities = viewModel.getProperty("/matchEntities");
		// 	var itemTabBar = sap.ui.getCore().byId(oController.DSCID + "::IconTab");
		// 	oController.matchSectionContext = {};
		// 	var oModel = oController.getView().getModel();
		// 	var oMetaModel = oModel.getMetaModel();
		// 	var oMatchPathMenu = new sap.m.Menu();
		// 	var oToolsMenu = new sap.m.Menu();
		// 	var oMatchPaths = [];
		// 	itemTabBar.getItems()[2].removeAllContent();
		// 	var oEntitySet, oEntityType, matchResultSelectEnabled;
		// 	var suggestionsTab = itemTabBar.getItems().find(function (item) {
		// 		return item.getKey() == "match";
		// 	});
		// 	//			var oControl = new sap.m.VBox().addStyleClass("sapUiSmallMarginTop");
		// 	var oControl = new sap.m.VBox(),
		// 		matchLabel;
		// 	iconTab.removeAllContent();
		// 	oEntitySet = oMetaModel.getODataEntitySet(iconTab.data("name"));
		// 	if (oEntitySet && oEntitySet.entityType) {
		// 		var oEntityType = oMetaModel.getODataEntityType(
		// 			oEntitySet.entityType
		// 		);
		// 	}
		// 	var matchEntity = oEntityType.navigationProperty.find(function (obj) {
		// 		var mEntityType = oMetaModel.getODataEntityType(
		// 			oMetaModel.getODataAssociationEnd(oEntityType, obj.name).type
		// 		);
		// 		if (mEntityType && mEntityType["vui.bodc.workspace.Match"]) {
		// 			return mEntityType;
		// 		}
		// 	});
		// 	if (matchEntity) {
		// 		matchEntity = oMetaModel.getODataEntityType(
		// 			oMetaModel.getODataAssociationEnd(oEntityType, matchEntity.name)
		// 				.type
		// 		);
		// 		if (
		// 			oMetaModel.getODataEntitySet(
		// 				matchEntity.name.split("Type")[0] + "__MANUAL_MATCH"
		// 			)
		// 		) {
		// 			var manualMatchEntity = oMetaModel.getODataEntityType(
		// 				oMetaModel.getODataEntitySet(
		// 					matchEntity.name.split("Type")[0] + "__MANUAL_MATCH"
		// 				).entityType
		// 			);
		// 			if (
		// 				manualMatchEntity &&
		// 				manualMatchEntity["com.sap.vocabularies.UI.v1.HeaderInfo"] &&
		// 				manualMatchEntity["com.sap.vocabularies.UI.v1.HeaderInfo"]
		// 					.Description &&
		// 				manualMatchEntity["com.sap.vocabularies.UI.v1.HeaderInfo"]
		// 					.Description.Value
		// 			) {
		// 				var labelField = oMetaModel.getODataProperty(
		// 					manualMatchEntity,
		// 					manualMatchEntity["com.sap.vocabularies.UI.v1.HeaderInfo"]
		// 						.Description.Value.Path
		// 				);
		// 				matchLabel =
		// 					labelField["com.sap.vocabularies.Common.v1.Label"].String;
		// 			}
		// 		}
		// 	}
		// 	var thldpProp = oEntityType.property.find(function (prop) {
		// 		return prop.name === "thldp";
		// 	});
		// 	var hBox = new sap.m.HBox(),
		// 		oMenuButton;
		// 	if (thldpProp) {
		// 		oToolsMenu.addItem(
		// 			new sap.m.MenuItem({
		// 				text: {
		// 					parts: [
		// 						{ path: "viewModel>/matchDetails/hdrProp/thldp" },
		// 						{ path: "i18n>CONFIDENCE" },
		// 					],
		// 					formatter: function (thldp, text) {
		// 						return text + ": " + thldp + "%";
		// 					},
		// 				},
		// 				press: oController.onMatchTresholdChange.bind(oController),
		// 			})
		// 		);
		// 		hBox.addItem(oToolsMenu);
		// 		oMenuButton = new sap.m.Button({
		// 			icon: "sap-icon://sys-find",
		// 			tooltip: { path: "i18n>FIND" },
		// 			type: sap.m.ButtonType.Transparent,
		// 			press: oController.onMatchFieldValueSearch.bind(oController),
		// 		}).data({
		// 			selectedPath: oController.DSCSourcePath,
		// 			parentEntity: oController.sidePanelDSC.entitySet,
		// 			matchEntity: matchEntity
		// 				? matchEntity.name.split("Type")[0] + "__MANUAL_MATCH"
		// 				: "",
		// 			matchSteps: oEntityType
		// 				? oEntityType["vui.bodc.Workspace.MatchSteps"]
		// 				: "",
		// 			matchSourceField: matchEntity
		// 				? matchEntity["vui.bodc.workspace.MatchSourceFields"]
		// 				: "",
		// 			//					F4Entity: field_prop["com.sap.vocabularies.Common.v1.ValueList"].CollectionPath.String,
		// 			//					f4DescrField: field_prop["com.sap.vocabularies.Common.v1.Text"].Path.split("/")[1],
		// 			//					fname: contextObject.field,
		// 			label: matchLabel,
		// 			//					headerField: field_prop["vui.bodc_workspace.MatchHeaderFieldGroup"],
		// 			//					sourceInputId: inputField.getId()
		// 		});
		// 		hBox.addItem(oMenuButton);
		// 	} else {
		// 		oController.adjustmentFlow = true;
		// 		oMenuButton = new sap.m.Button({
		// 			icon: "sap-icon://sys-find",
		// 			tooltip: { path: "i18n>FIND" },
		// 			type: sap.m.ButtonType.Transparent,
		// 			//					press: oController.openMatchToolsDialog.bind(oController)
		// 			press: oController.onMatchFieldValueSearch.bind(oController),
		// 		}).data({
		// 			selectedPath: oController.DSCSourcePath,
		// 			parentEntity: oController.sidePanelDSC.entitySet,
		// 			matchEntity: matchEntity
		// 				? matchEntity.name.split("Type")[0] + "__MANUAL_MATCH"
		// 				: "",
		// 			matchSteps: oEntityType
		// 				? oEntityType["vui.bodc.Workspace.MatchSteps"]
		// 				: "",
		// 			matchSourceField: matchEntity
		// 				? matchEntity["vui.bodc.workspace.MatchSourceFields"]
		// 				: "",
		// 			//					F4Entity: field_prop["com.sap.vocabularies.Common.v1.ValueList"].CollectionPath.String,
		// 			//					f4DescrField: field_prop["com.sap.vocabularies.Common.v1.Text"].Path.split("/")[1],
		// 			//					fname: contextObject.field,
		// 			label: matchLabel,
		// 			//					headerField: field_prop["vui.bodc_workspace.MatchHeaderFieldGroup"],
		// 			//					sourceInputId: inputField.getId()
		// 		});
		// 		hBox.addItem(oMenuButton);
		// 	}

		// 	var oToolbar = new sap.m.Toolbar({
		// 		content: [
		// 			//** new dsc changes - 16-Mar-2022 **start
		// 			//					new sap.m.HBox({
		// 			//						alignItems: "Center",
		// 			//						items: [
		// 			//							new sap.m.Label({
		// 			//								text: "{i18n>MATCHFOR}:",
		// 			////								visible: oController.matchSectionContext.matchPathPopup.getContent()[0].getItems().length > 1,
		// 			//								//								layoutData: new sap.m.OverflowToolbarLayoutData({
		// 			//								//								priority: "NeverOverflow"
		// 			//								//								})
		// 			//							}),
		// 			//							//							new sap.m.MenuButton({
		// 			//							//								menu: oMatchPathMenu,
		// 			//							//								type: sap.m.ButtonType.Transparent
		// 			//							//							}),
		// 			//							new sap.m.Button({
		// 			////								icon: oController.matchSectionContext.matchPathPopup.getContent()[0].getItems().length > 1 ? "sap-icon://slim-arrow-down" : "",
		// 			////								visible: oController.matchSectionContext.matchPathPopup.getContent()[0].getItems().length > 1,
		// 			//								icon: "sap-icon://slim-arrow-down",
		// 			//								iconFirst: false,
		// 			//								type: sap.m.ButtonType.Transparent,
		// 			//								press: function (oEvent) {
		// 			//									oController.matchSectionContext.matchPathPopup.openBy(oEvent.getSource());
		// 			//								}
		// 			//							})
		// 			//							],
		// 			//							//							width:"38%",
		// 			//							//							layoutData: new sap.m.OverflowToolbarLayoutData({
		// 			//							//							priority: "NeverOverflow"
		// 			//							//							})
		// 			//					}),
		// 			//** new dsc changes - 16-Mar-2022 **end

		// 			new sap.m.HBox({
		// 				alignItems: "Center",
		// 				items: [
		// 					new sap.m.Label({
		// 						text: "{i18n>MATCHBY}:",
		// 						visible: false,
		// 						//								layoutData: new sap.m.OverflowToolbarLayoutData({
		// 						//								priority: "NeverOverflow"
		// 						//								})
		// 					}),
		// 					//							new sap.m.MenuButton({
		// 					//								menu: new sap.m.Menu(),
		// 					//								type: sap.m.ButtonType.Transparent,
		// 					//								visible: false,
		// 					////								width:"80%"
		// 					//							}),
		// 					new sap.m.Button({
		// 						icon: "sap-icon://slim-arrow-down",
		// 						iconFirst: false,
		// 						type: sap.m.ButtonType.Transparent,
		// 						press: function (oEvent) {
		// 							oController.matchSectionContext.matchGroupPopup.openBy(
		// 								oEvent.getSource()
		// 							);
		// 						},
		// 						visible: false,
		// 					}),
		// 				],
		// 				//							width:"38%",
		// 				//							layoutData: new sap.m.OverflowToolbarLayoutData({
		// 				//							priority: "NeverOverflow"
		// 				//							})
		// 			}),
		// 			//					new sap.m.Button({
		// 			////					text: "Confidence: ≥ 20%",
		// 			//					text: {parts:[{path: "viewModel>/matchDetails/hdrProp/thldp"},{path:"i18n>CONFIDENCE"}],
		// 			//					formatter: function(thldp,text){
		// 			//					return text + ": " + thldp + "%"
		// 			//					}
		// 			//					},
		// 			//					type: sap.m.ButtonType.Transparent,
		// 			//					press: oController.onMatchTresholdChange.bind(oController)
		// 			//					}),
		// 			new sap.m.ToolbarSpacer(),
		// 			hBox,
		// 			//					new sap.m.Button({
		// 			//					icon: "sap-icon://compare",
		// 			//					text: {path:"i18n>TOOLS"},
		// 			//					type: sap.m.ButtonType.Transparent,
		// 			//					press: oController.openMatchToolsDialog.bind(oController)
		// 			//					})
		// 		],
		// 	});

		// 	oControl.addItem(oToolbar);

		// 	//			itemTabBar.getItems()[2].addContent(oControl);
		// 	iconTab.addContent(oControl);

		// 	//			oMatchPathMenu.getItems()[0].firePress();
		// 	//			Adjustment changes to select the suggestion tab again after table refresh
		// 	//			if(viewModel.getProperty("/selectedSegmenetedButton")){
		// 	//					var selectedSegmenetedButton = sap.ui.getCore().getElementById(viewModel.getProperty("/selectedSegmenetedButton"));
		// 	//					selectedSegmenetedButton.firePress();
		// 	//					if(sap.ui.getCore().getElementById(viewModel.getProperty("/selectedSegmenetedButton").split("-button")[0])){
		// 	//						sap.ui.getCore().getElementById(viewModel.getProperty("/selectedSegmenetedButton").split("-button")[0]).firePress();
		// 	//						var segmentedButton = sap.ui.getCore().getElementById(viewModel.getProperty("/selectedSegmenetedButton").split("-button")[0]).getParent();
		// 	//						segmentedButton.setSelectedKey(sap.ui.getCore().getElementById(viewModel.getProperty("/selectedSegmenetedButton").split("-button")[0]).getKey());
		// 	//					}
		// 	//			}
		// 	//				},200);
		// },
		//#164828 -> Approval Integration via Action code(GTM sync ) --End   

		// matchPathSelect: function (oEvent) {
		// 	var oController = this;
		// 	//** #164828 -> Approval Integration via Action code(GTM sync ) **start
		// 	if (oEvent.getId() == "press") {
		// 		var oSource = oEvent.getSource();
		// 	} else {
		// 		var oSource = oEvent;
		// 		oController.selectedMatchTab = oSource;
		// 		oController.prepareMatchToolbar(oSource);
		// 	}
		// 	//** #164828 -> Approval Integration via Action code(GTM sync ) **end
		// 	var oMatchPathData = oSource.data();

		// 	var oModel = oController.getView().getModel();
		// 	var oMetaModel = oModel.getMetaModel();

		// 	var itemTabBar = sap.ui.getCore().getElementById(oMatchPathData.tabBarId);
		// 	var viewModel = oController.getView().getModel("viewModel");

		// 	var previousHeaderEntity = viewModel.getProperty("/matchDetails/headerEntity");
		// 	var previousmatchGroupKey = viewModel.getProperty("/matchDetails/matchGroupKey");

		// 	var bundle = oController.getView().getModel("i18n").getResourceBundle();

		// 	var oEntitySet, oEntityType, oTargetEntity;

		// 	oEntityType = oMetaModel.getODataEntityType(oMatchPathData.entityType);

		// 	if (oEntityType["vui.bodc.MatchGroup"] && oMatchPathData.source == "mPath") {
		// 		oSource.getParent().getParent().getParent().getParent().getContent()[1].getItems()[0].setVisible(true);
		// 		oSource.getParent().getParent().getParent().getParent().getContent()[1].getItems()[1].setVisible(true);
		// 		oSource.getParent().getParent().setText(oSource.getText());

		// 		var oMatchGroups = oEntityType["vui.bodc.MatchGroup"][0].MatchGroup;
		// 		var oMatchGroupMenu = oSource.getParent().getParent().getParent().getParent().getContent()[1].getItems()[1].getMenu();
		// 		oMatchGroupMenu.removeAllItems();
		// 		for (var i = 0; i < oMatchGroups.length; i++) {
		// 			oMatchGroupMenu.addItem(new sap.m.MenuItem({
		// 				text: oMatchGroups[i].String.split("__")[1],
		// 				press: oController.matchPathSelect.bind(oController)
		// 			}).data({
		// 				name: oMatchPathData.name,
		// 				entityType: oMatchPathData.entityType,
		// 				tabBarId: oMatchPathData.tabBarId,
		// 				mGroupKey: oMatchGroups[i].String.split("__")[0],
		// 				source: "mGroup"
		// 			}));
		// 		}
		// 		oMatchGroupMenu.getItems()[0].firePress();
		// 		return;
		// 	} else if (oMatchPathData.source == "mPath") {
		// 		oSource.getParent().getParent().getParent().getParent().getContent()[1].getItems()[0].setVisible(false);
		// 		oSource.getParent().getParent().getParent().getParent().getContent()[1].getItems()[1].setVisible(false);
		// 		oSource.getParent().getParent().getParent().getParent().getContent()[1].getItems()[1].getMenu().removeAllItems();
		// 	}

		// 	if (previousHeaderEntity != oMatchPathData.entityType || oMatchPathData.source == "mGroup") {
		// 		if (oMatchPathData.source == "mGroup") {
		// 			if (previousmatchGroupKey == oMatchPathData.mGroupKey) {
		// 				return;
		// 			} else {
		// 				viewModel.setProperty("/matchDetails/matchGroupKey", oMatchPathData.mGroupKey);
		// 			}
		// 		} else {
		// 			viewModel.setProperty("/matchDetails/matchGroupKey", "");
		// 		}
		// 		var oMenuButton = oSource.getParent().getParent();
		// 		oMenuButton.setText(oSource.getText());
		// 		viewModel.setProperty("/matchDetails/headerEntity", oMatchPathData.entityType);
		// 		viewModel.setProperty("/matchDetails/headerEntityName", oMatchPathData.name);
		// 		var urlParameters = {};

		// 		if (oMatchPathData.source == "mGroup") {
		// 			urlParameters["mgrp"] = oMatchPathData.mGroupKey;
		// 		}

		// 		oModel.read("/" + oMatchPathData.name, {
		// 			urlParameters: urlParameters,
		// 			success: function (oData, response) {

		// 				if (!oData.results) return;

		// 				//						itemTabBar.getItems()[2].setVisible(true);
		// 				//						var hdrProp = {
		// 				//						mpath: oData.results[0].mpath,
		// 				//						thldp: parseInt(oData.results[0].thldp)
		// 				//						};
		// 				var hdrProp;
		// 				if (oData.results[0].mpath) {
		// 					hdrProp = {
		// 						mpath: oData.results[0].mpath,
		// 						thldp: parseInt(oData.results[0].thldp)
		// 					};
		// 				} else if (oData.results[0].pmprc) {
		// 					hdrProp = {
		// 						mpath: oData.results[0].pmprc
		// 					};
		// 				}
		// 				viewModel.setProperty("/matchDetails/hdrProp", hdrProp);
		// 				viewModel.setProperty("/matchDetails/hdrDetails", oData.results[0]);

		// 				if (oEntityType.navigationProperty && oEntityType.navigationProperty.length > 0) {
		// 					for (var i = 0; i < oEntityType.navigationProperty.length; i++) {
		// 						oTargetEntity = oMetaModel.getODataEntityType(oMetaModel.getODataAssociationEnd(oEntityType, oEntityType.navigationProperty[i].name).type);
		// 						if (oTargetEntity && oTargetEntity["vui.bodc.workspace.Match"]) {
		// 							var oColumns = [], oTableEntity = oTargetEntity;
		// 							var oLineItems = oTableEntity["vui.bodc.ResponsiveLineItem"];
		// 							var columnListItemType = "Inactive";
		// 							if (oTableEntity["vui.bodc.workspace.MatchSourceFieldss"]) {
		// 								var tableData = [];
		// 								_.each(oTableEntity["vui.bodc.workspace.MatchSourceFieldss"], function (item) {
		// 									var sourceField = item.PropertyPath.split("/")[1];
		// 									var targetField = item.PropertyPath.split("/")[3];
		// 									var cellProperties = _.find(oTableEntity.property, { name: targetField });
		// 									if (cellProperties) {
		// 										tableData.push({ "field": cellProperties["com.sap.vocabularies.Common.v1.Label"].String, "source": sourceField, "target": targetField });
		// 									}
		// 								});
		// 								viewModel.setProperty("/matchItemsData" + oTableEntity.name, tableData);
		// 								columnListItemType = "Navigation";
		// 							}
		// 							var oTable = new sap.m.Table({
		// 								itemPress: [oController.onMatchItemPress, oController],
		// 								autoPopinMode: false,
		// 								columns: [
		// 									new sap.m.Column({
		// 										visible: true,
		// 										//												width: "70%",
		// 									}),
		// 									//											new sap.m.Column({
		// 									//											visible: true,
		// 									//											}),
		// 									//											new sap.m.Column({
		// 									//											visible: true,
		// 									//											width: "40px",
		// 									//											}),
		// 									//											new sap.m.Column({
		// 									//											visible: true,
		// 									//											demandPopin: true,
		// 									//											popinDisplay: "Block",
		// 									//											minScreenWidth: sap.m.ScreenSize.Phone
		// 									//											})
		// 								]
		// 							});
		// 							oTable.data("entity", oTableEntity.name.split("Type")[0]);
		// 							//									for(var j=0; j<oLineItems.length; j++){
		// 							//									var oLabel = oLineItems[j].Label, oWidth;
		// 							//									if(!oLabel){
		// 							//									var oProp = oTableEntity.property.find(function(prop){
		// 							//									return prop.name === oLineItems[j].Value.Path
		// 							//									});
		// 							//									oLabel = oProp["com.sap.vocabularies.Common.v1.Label"].String;
		// 							//									}else{
		// 							//									oLabel = oLabel.String;
		// 							//									}

		// 							//									if(oLineItems[j].RecordType == "com.sap.vocabularies.UI.v1.CollectionField"){
		// 							//									oWidth = "";
		// 							//									}else if(oLineItems[j].RecordType ==
		// 							//									"com.sap.vocabularies.UI.v1.DataFieldForAction"){
		// 							//									oWidth = "40px";
		// 							//									oLabel = "";
		// 							//									}else if(oLineItems[j].Value.Path == "mtpct"){
		// 							//									oWidth = "74px";
		// 							//									}else{
		// 							//									oWidth = "";
		// 							//									}

		// 							//									oTable.addColumn(new sap.m.Column({
		// 							//									header: new sap.m.Text({
		// 							//									text: oLabel
		// 							//									}),
		// 							//									visible: true,
		// 							//									width: oWidth
		// 							//									}));
		// 							//									}

		// 							oTable.bindAggregation("items", "viewModel>/matchDetails/matchResults", function (sId, oContext) {
		// 								var contextObject = oContext.getObject();
		// 								var oCells = [], oContent;
		// 								//										for(var j=0; j<oLineItems.length; j++){
		// 								//										if(oLineItems[j].RecordType == "com.sap.vocabularies.UI.v1.CollectionField"){
		// 								//										oContent = new sap.m.VBox();
		// 								//										var oFields = oLineItems[j].Fields;
		// 								//										for(var k=0; k<oFields.length; k++){
		// 								//										oContent.addItem(new sap.m.Text({
		// 								//										text: "{viewModel>" + oFields[k].Value.Path + "}"
		// 								//										}));
		// 								//										}

		// 								//										}else if(oLineItems[j].RecordType ==
		// 								//										"com.sap.vocabularies.UI.v1.DataFieldForAction"){
		// 								//										var oButtonType;
		// 								//										if(contextObject.mqlfr){
		// 								//										oButtonType = sap.m.ButtonType.Emphasized;
		// 								//										}else{
		// 								//										oButtonType = sap.m.ButtonType.Default;
		// 								//										}

		// 								//										oContent = new sap.m.Button({
		// 								//										icon: "sap-icon://accept",
		// 								//										type: oButtonType,
		// 								//										enabled: "{viewModel>/matchDetails/enabled}",
		// 								//										press: oController.onMatchResultAction.bind(oController)
		// 								//										}).data("Action",oLineItems[j].Action.String);
		// 								//										}else{
		// 								//										oContent = new sap.suite.ui.microchart.RadialMicroChart({
		// 								//										size: sap.m.Size.S,
		// 								//										percentage: parseFloat(contextObject.mtpct)
		// 								//										})
		// 								//										}
		// 								//										oCells.push(oContent);
		// 								//										}
		// 								var oVBox = new sap.m.VBox();
		// 								var oHBox = new sap.m.HBox({
		// 									width: "100%",
		// 									alignItems: "Center"
		// 								});
		// 								var title = "", subtitle = "", quickViewField, TitleField;
		// 								var collectionField = oLineItems.find(function (obj) { return obj.RecordType == "com.sap.vocabularies.UI.v1.CollectionField" });
		// 								if (collectionField && collectionField.Fields) {
		// 									_.each(collectionField.Fields, function (field) {
		// 										if (field.Quickview_Enitity) {
		// 											quickViewField = field;
		// 										} else {
		// 											TitleField = field;
		// 										}
		// 									});
		// 								}
		// 								if (collectionField && quickViewField) {
		// 									var oList = new sap.m.Link({
		// 										text: "{viewModel>" + quickViewField.Value.Path + "}",
		// 										press: [oController.onTableNavigationLinkClick, oController],
		// 									});
		// 									oList.data("FieldName", quickViewField.Value.Path);
		// 									oList.data("TableEntity", oTable.data("entity"));
		// 									oList.data("row_id", contextObject.row_id);
		// 									if (quickViewField.Quickview_Enitity) {
		// 										oList.data("QuickviewEnitity", quickViewField.Quickview_Enitity.String);
		// 									}
		// 									if (quickViewField.HREF) {
		// 										oList.data("HREF", quickViewField.HREF.Path);
		// 									}
		// 									oContent = new sap.m.VBox({// design
		// 										items: [new sap.m.Label({
		// 											text: "{viewModel>" + TitleField.Value.Path + "}",
		// 											design: "Bold"
		// 										}),
		// 											oList
		// 										]
		// 									});

		// 								} else {
		// 									var titleControlType = 0;
		// 									if (oTableEntity["com.sap.vocabularies.UI.v1.HeaderInfo"] && oTableEntity["com.sap.vocabularies.UI.v1.HeaderInfo"].Title) {
		// 										var nLineItem = oTableEntity["vui.bodc.NonResponsiveLineItem"].find(function (obj) { return obj.Value && obj.Value.Path == oTableEntity["com.sap.vocabularies.UI.v1.HeaderInfo"].Title.Value.Path });
		// 										if (nLineItem && nLineItem.RecordType == 'com.sap.vocabularies.UI.v1.DataFieldWithIntentBasedNavigation') {
		// 											title = new sap.m.Link({
		// 												text: "{viewModel>" + oTableEntity["com.sap.vocabularies.UI.v1.HeaderInfo"].Title.Value.Path + "}",
		// 												press: [oController.onTableNavigationLinkClick, oController],
		// 											});
		// 											title.data("FieldName", oTableEntity["com.sap.vocabularies.UI.v1.HeaderInfo"].Title.Value.Path);
		// 											title.data("TableEntity", oTable.data("entity"));
		// 											title.data("row_id", contextObject.row_id);
		// 											titleControlType = 1;
		// 										} else {
		// 											title = "{viewModel>" + oTableEntity["com.sap.vocabularies.UI.v1.HeaderInfo"].Title.Value.Path + "}";
		// 										}
		// 									}

		// 									if (oTableEntity["com.sap.vocabularies.UI.v1.HeaderInfo"] && oTableEntity["com.sap.vocabularies.UI.v1.HeaderInfo"].Description) {
		// 										var nLineItem = oTableEntity["vui.bodc.NonResponsiveLineItem"].find(function (obj) { return obj.Value && obj.Value.Path == oTableEntity["com.sap.vocabularies.UI.v1.HeaderInfo"].Description.Value.Path });
		// 										if (nLineItem && nLineItem.RecordType == 'com.sap.vocabularies.UI.v1.DataFieldWithIntentBasedNavigation') {
		// 											subtitle = new sap.m.Link({
		// 												text: "{viewModel>" + oTableEntity["com.sap.vocabularies.UI.v1.HeaderInfo"].Description.Value.Path + "}",
		// 												press: [oController.onTableNavigationLinkClick, oController],
		// 											});
		// 											subtitle.data("FieldName", oTableEntity["com.sap.vocabularies.UI.v1.HeaderInfo"].Description.Value.Path);
		// 											subtitle.data("TableEntity", oTable.data("entity"));
		// 											subtitle.data("row_id", contextObject.row_id);
		// 											if (titleControlType == 1) {
		// 												titleControlType = 3;
		// 											} else {
		// 												titleControlType = 2;
		// 											}
		// 										} else {
		// 											subtitle = "{viewModel>" + oTableEntity["com.sap.vocabularies.UI.v1.HeaderInfo"].Description.Value.Path + "}";
		// 										}
		// 									}
		// 									if (titleControlType == 0) {
		// 										oContent = new sap.m.ObjectIdentifier({
		// 											title: title,
		// 											text: subtitle,
		// 											titleActive: false,
		// 										}).addStyleClass("matchTitleObjectIdentifier");
		// 									} else if (titleControlType == 1) {
		// 										oContent = new sap.m.VBox({// design
		// 											items: [title,
		// 												new sap.m.Text({
		// 													text: subtitle
		// 												})
		// 											]
		// 										});
		// 									} else if (titleControlType == 2) {
		// 										oContent = new sap.m.VBox({// design
		// 											items: [new sap.m.Label({
		// 												text: title,
		// 												design: "Bold"
		// 											}),
		// 												subtitle
		// 											]
		// 										});
		// 									} else if (titleControlType == 3) {
		// 										oContent = new sap.m.VBox({// design
		// 											items: [title,
		// 												subtitle
		// 											]
		// 										});
		// 									}
		// 								}
		// 								//										oCells.push(oContent);
		// 								var mtpctField = oLineItems.find(function (obj) { return obj.Value && obj.Value.Path == "mtpct" });
		// 								if (mtpctField) {
		// 									// Radial Microchart
		// 									oHBox.addItem(new sap.m.HBox({
		// 										items: [oContent],
		// 										width: "70%"
		// 									}));

		// 									//											oContent = new sap.suite.ui.microchart.RadialMicroChart({
		// 									//											size: sap.m.Size.XS,
		// 									//											percentage: parseFloat(contextObject.mtpct)
		// 									//											});
		// 									oContent = new sap.m.RatingIndicator({
		// 										iconSize: "12px",
		// 										maxValue: 5,
		// 										editable: false,
		// 										value: { path: "viewModel>mtpct", formatter: zvui.work.controller.AnnotationHelper.getRatingValue }
		// 									}).addStyleClass("sapUiSmallMarginEnd");
		// 									oHBox.addItem(new sap.m.HBox({
		// 										items: [oContent],
		// 									}));
		// 								} else {
		// 									oHBox.addItem(new sap.m.HBox({
		// 										items: [oContent],
		// 										width: "90%"
		// 									}));
		// 								}
		// 								//										Button
		// 								var oButtonType;
		// 								if (contextObject.mqlfr) {
		// 									oButtonType = sap.m.ButtonType.Emphasized;
		// 								} else {
		// 									oButtonType = sap.m.ButtonType.Default;
		// 								}
		// 								var sIcon;
		// 								if (contextObject.mqlfr) {
		// 									sIcon = "sap-icon://accept";
		// 								} else {
		// 									sIcon = "sap-icon://status-completed";
		// 								}

		// 								var buttonLineItem = oLineItems.find(function (obj) { return obj.RecordType == "com.sap.vocabularies.UI.v1.DataFieldForAction" });
		// 								oContent = new sap.m.Button({
		// 									icon: sIcon,
		// 									type: oButtonType,
		// 									enabled: "{viewModel>/matchDetails/enabled}",
		// 									press: oController.onMatchResultAction.bind(oController),
		// 								}).data("Action", buttonLineItem.Action.String);

		// 								oHBox.addItem(new sap.m.HBox({
		// 									items: [oContent],
		// 									width: "40px"
		// 								}));
		// 								oVBox.addItem(oHBox);

		// 								var oAddressProp = oTableEntity.property.find(function (prop) {
		// 									return prop.name === "adrln"
		// 								});
		// 								if (oAddressProp) {
		// 									//											oVBox.addItem(new sap.m.Label({
		// 									//											text: oAddressProp["com.sap.vocabularies.Common.v1.Label"].String + ":",
		// 									//											design: sap.m.LabelDesign.Bold
		// 									//											}));

		// 									oHBox = new sap.m.HBox({
		// 										width: "100%"
		// 									}).addStyleClass("addressHBox sapUiTinyMarginTop");

		// 									contextObject.adrln = contextObject.adrln.replace(new RegExp("/n", "g"), "\n");
		// 									//											oContent = new sap.m.TextArea({
		// 									//											value: "{viewModel>adrln}",
		// 									//											width: "100%",
		// 									//											rows: contextObject.adrln.split("\n").length,
		// 									//											editable: false,
		// 									//											wrapping: sap.ui.core.Wrapping.Off
		// 									//											});
		// 									oContent = new sap.m.Text({
		// 										text: contextObject.adrln
		// 									});
		// 									oHBox.addItem(oContent);

		// 									oVBox.addItem(oHBox);
		// 								}
		// 								if (oTableEntity["com.sap.vocabularies.UI.v1.Identification"]) {
		// 									var oLeftItems = oTableEntity["com.sap.vocabularies.UI.v1.Identification"].filter(function (obj) { return !obj.Alignment || obj.Alignment.String == "L" || obj.Alignment.String == "" });
		// 									var oRightItems = oTableEntity["com.sap.vocabularies.UI.v1.Identification"].filter(function (obj) { return obj.Alignment && obj.Alignment.String == "R" });
		// 									var oForm = new sap.m.HBox().addStyleClass("sapUiTinyMarginTop");
		// 									if (oLeftItems.length > 0) {
		// 										var oItemsVBox = new sap.m.VBox();
		// 										for (var i = 0; i < oLeftItems.length; i++) {
		// 											var oItemHBox = new sap.m.VBox({
		// 												wrappig: true
		// 											});
		// 											var oFieldProp = oTableEntity.property.find(function (prop) {
		// 												return prop.name === oLeftItems[i].Value.Path
		// 											});
		// 											var sPath;
		// 											if (oFieldProp.type == "Edm.DateTime") {
		// 												sPath = "{path: 'viewModel>" + oLeftItems[i].Value.Path + "', formatter: 'zvui.work.controller.AnnotationHelper.getChangeDateFormat'}";
		// 											} else if (oFieldProp["com.sap.vocabularies.Common.v1.Text"]) {
		// 												switch (oFieldProp["com.sap.vocabularies.Common.v1.Text"]["com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember) {
		// 													case "com.sap.vocabularies.UI.v1.TextArrangementType/TextLast":
		// 														sPath = "{viewModel>" + oLeftItems[i].Value.Path + "}" + " {viewModel>" + oFieldProp["com.sap.vocabularies.Common.v1.Text"].Path + "}";
		// 														break;
		// 													case "com.sap.vocabularies.UI.v1.TextArrangementType/TextSeparate":
		// 														sPath = "{viewModel>" + oLeftItems[i].Value.Path + "}";
		// 														break;
		// 													case "com.sap.vocabularies.UI.v1.TextArrangementType/TextOnly":
		// 														sPath = "{viewModel>" + oFieldProp["com.sap.vocabularies.Common.v1.Text"].Path + "}";
		// 														break;
		// 													default:
		// 														sPath = "{viewModel>" + oFieldProp["com.sap.vocabularies.Common.v1.Text"].Path + "} (" + "{viewModel>" + oLeftItems[i].Value.Path + "})";
		// 												}
		// 											} else {
		// 												sPath = "{viewModel>" + oLeftItems[i].Value.Path + "}";
		// 											}
		// 											oItemHBox.addItem(new sap.m.Label({
		// 												text: oFieldProp["com.sap.vocabularies.Common.v1.Label"].String + ": ",
		// 												design: sap.m.LabelDesign.Bold
		// 											}).addStyleClass("sapUiTinyMarginEnd"));
		// 											oItemHBox.addItem(new sap.m.Text({
		// 												text: sPath,
		// 											}));
		// 											oItemsVBox.addItem(oItemHBox);
		// 										}
		// 										if (oRightItems.length > 0) {
		// 											oForm.addItem(new sap.m.HBox({ items: [oItemsVBox], width: "50%" }));
		// 										} else {
		// 											oForm.addItem(new sap.m.HBox({ items: [oItemsVBox] }));
		// 										}
		// 									}
		// 									if (oRightItems.length > 0) {
		// 										var oItemsVBox = new sap.m.VBox();
		// 										for (var i = 0; i < oRightItems.length; i++) {
		// 											var oItemHBox = new sap.m.VBox({
		// 												wrappig: true
		// 											});
		// 											var oFieldProp = oTableEntity.property.find(function (prop) {
		// 												return prop.name === oRightItems[i].Value.Path
		// 											});
		// 											oItemHBox.addItem(new sap.m.Label({
		// 												text: oFieldProp["com.sap.vocabularies.Common.v1.Label"].String + ": ",
		// 												design: sap.m.LabelDesign.Bold
		// 											}).addStyleClass("sapUiTinyMarginEnd"));
		// 											var sPath;
		// 											if (oFieldProp.type == "Edm.DateTime") {
		// 												sPath = "{path: 'viewModel>" + oRightItems[i].Value.Path + "', formatter: 'zvui.work.controller.AnnotationHelper.getChangeDateFormat'}";
		// 											} else if (oFieldProp["com.sap.vocabularies.Common.v1.Text"]) {
		// 												switch (oFieldProp["com.sap.vocabularies.Common.v1.Text"]["com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember) {
		// 													case "com.sap.vocabularies.UI.v1.TextArrangementType/TextLast":
		// 														sPath = "{viewModel>" + oRightItems[i].Value.Path + "}" + " {viewModel>" + oFieldProp["com.sap.vocabularies.Common.v1.Text"].Path + "}";
		// 														break;
		// 													case "com.sap.vocabularies.UI.v1.TextArrangementType/TextSeparate":
		// 														sPath = "{viewModel>" + oRightItems[i].Value.Path + "}";
		// 														break;
		// 													case "com.sap.vocabularies.UI.v1.TextArrangementType/TextOnly":
		// 														sPath = "{viewModel>" + oFieldProp["com.sap.vocabularies.Common.v1.Text"].Path + "}";
		// 														break;
		// 													default:
		// 														sPath = "{viewModel>" + oFieldProp["com.sap.vocabularies.Common.v1.Text"].Path + "} (" + "{viewModel>" + oRightItems[i].Value.Path + "})";
		// 												}
		// 											} else {
		// 												sPath = "{viewModel>" + oRightItems[i].Value.Path + "}";
		// 											}

		// 											oItemHBox.addItem(new sap.m.Text({
		// 												text: sPath,
		// 											}));
		// 											oItemsVBox.addItem(oItemHBox);
		// 										}
		// 										if (oLeftItems.length > 0) {
		// 											oForm.addItem(new sap.m.HBox({ items: [oItemsVBox], width: "50%" }));
		// 										} else {
		// 											oForm.addItem(new sap.m.HBox({ items: [oItemsVBox] }));
		// 										}
		// 									}

		// 									if (oLeftItems.length > 0 || oRightItems.length > 0) {
		// 										oVBox.addItem(oForm);
		// 									}
		// 								}
		// 								oCells.push(oVBox);

		// 								return new sap.m.ColumnListItem({
		// 									cells: oCells,
		// 									type: columnListItemType
		// 								});
		// 							});

		// 							if (itemTabBar.getItems()[2].getContent().length == 1) {
		// 								itemTabBar.getItems()[2].addContent(new sap.m.VBox({
		// 									items: [
		// 										oTable
		// 									]
		// 								}));
		// 							} else {
		// 								itemTabBar.getItems()[2].getContent()[1].removeAllItems();
		// 								itemTabBar.getItems()[2].getContent()[1].addItem(oTable);
		// 							}
		// 							viewModel.setProperty("/matchDetails/resultEntityName", oTableEntity.name.split("Type")[0]);

		// 							oModel.read("/" + oTableEntity.name.split("Type")[0], {
		// 								urlParameters: oController.readQueryPrepare(oTableEntity.name.split("Type")[0]),
		// 								success: function (oData, response) {
		// 									viewModel.setProperty("/matchDetails/matchResults", oData.results);
		// 								}
		// 							});
		// 						}
		// 					}
		// 				}
		// 			}
		// 		});
		// 	}

		// },
		matchSectionPrepare: function (matchEntities, itemTabBar) {
			var oController = this;
			oController.matchSectionContext = {};
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var oMatchPathMenu = new sap.m.Menu();
			var oToolsMenu = new sap.m.Menu();
			var oMatchPaths = [];
			itemTabBar.getItems()[2].removeAllContent();
			var oEntitySet, oEntityType, matchResultSelectEnabled;
			var viewModel = oController.getView().getModel("viewModel");
			var suggestionsTab = itemTabBar.getItems().find(function (item) {
				return item.getKey() == "match";
			});
			//			QA#8903 - Multi select in Match Dialog not working
			if (oController._oMatchDialog && oController._oMatchDialog.isOpen()) {
			} else {
				viewModel.setProperty("/matchDetails", {});
			}
			//
			var mainTableSelectedPath = viewModel.getProperty(
				"/mainTableSelectedPath"
			);
			var mainTableSelectedRowData = oModel.getProperty(
				mainTableSelectedPath
			);
			if (mainTableSelectedRowData.edtst !== "1") {
				matchResultSelectEnabled = false;
			} else {
				matchResultSelectEnabled = true;
			}

			viewModel.setProperty(
				"/matchDetails/enabled",
				matchResultSelectEnabled
			);
			var oListItems = [];
			suggestionsTab.removeAllItems();
			for (var i = 0; i < matchEntities.length; i++) {
				oEntitySet = oMetaModel.getODataEntitySet(matchEntities[i]);
				if (oEntitySet && oEntitySet.entityType) {
					oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
				}
				if (
					oEntityType &&
					oEntityType["com.sap.vocabularies.UI.v1.HeaderInfo"]
				) {
					//					oMatchPathMenu.addItem(new sap.m.MenuItem({
					//						text: oEntityType['com.sap.vocabularies.UI.v1.HeaderInfo'].TypeName.String,
					//						press: oController.matchPathSelect.bind(oController)
					//					}).data({
					//						name: matchEntities[i],
					//						entityType: oEntitySet.entityType,
					//						tabBarId: itemTabBar.getId(),
					//						source: "mPath"
					//					}));
					var item = new sap.m.IconTabFilter({
						text: oEntityType["com.sap.vocabularies.UI.v1.HeaderInfo"]
							.TypeName.String,
						key: "match",
						//						type: "Active",
						//						highlight: {
						//							parts: [{ value: matchEntities[i] }, { path: "viewModel>/matchDetails/headerEntity" }],
						//							formatter: function (key, selectedKey) {
						//								if (key == selectedKey) {
						//									return "Success";
						//								}
						//								return "None";
						//							}
						//						},
						//						press: oController.matchPathSelect.bind(oController)
					});
					item.data({
						name: matchEntities[i],
						entityType: oEntitySet.entityType,
						tabBarId: itemTabBar.getId(),
						source: "mPath",
					});
					oListItems.push(item);
					if (matchEntities.length == 1) {
						//						suggestionsTab.addContent(item);
						suggestionsTab.data({
							name: matchEntities[i],
							entityType: oEntitySet.entityType,
							tabBarId: itemTabBar.getId(),
							source: "mPath",
						});
					} else {
						suggestionsTab.addItem(item);
					}

					oMatchPaths.push({
						name: matchEntities[i],
						text: oEntityType["com.sap.vocabularies.UI.v1.HeaderInfo"]
							.TypeName.String,
						entityType: oEntitySet.entityType,
						tabBarId: itemTabBar.getId(),
					});
				}
			}

			if (oMatchPaths.length > 0) {
				viewModel.setProperty("/matchDetails/matchPaths", oMatchPaths);
			}

			if (viewModel.getProperty("/matchResultActionPerformed")) {
				viewModel.setProperty("/matchResultActionPerformed", false);
				var mParameters = viewModel.getProperty(
					"/currentSegmentedButtonParams"
				);
				var selectedItem = itemTabBar
					.getItems()[2]
					.getItems()
					.find(function (item) {
						return item.getText() == mParameters.selectedItem.getText();
					});
				itemTabBar._getIconTabHeader().setSelectedItem(selectedItem);
			}
			//** new dsc changes - 16-Mar-2022 **start
			//			oController.matchSectionContext.matchPathPopup = new sap.m.Popover({
			//				showHeader: false,
			//				showArrow: false,
			//				placement: sap.m.PlacementType.Bottom,
			//				content: [
			//					new sap.m.List({
			//						showSeparators: "None",
			//
			////						items: oListItems
			//					})
			//					]
			//			});
			//			oController.getView().addDependent(oController.matchSectionContext.matchPathPopup);
			//			//			oController.matchSectionContext.matchGroupPopup.openBy(oSource);
			//** new dsc changes - 16-Mar-2022 **end
		},
		prepareMatchToolbar: function (iconTab) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var matchEntities = viewModel.getProperty("/matchEntities");
			var itemTabBar = sap.ui.getCore().byId(oController.DSCID + "::IconTab");
			oController.matchSectionContext = {};
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var oMatchPathMenu = new sap.m.Menu();
			var oToolsMenu = new sap.m.Menu();
			var oMatchPaths = [];
			itemTabBar.getItems()[2].removeAllContent();
			var oEntitySet, oEntityType, matchResultSelectEnabled;
			var suggestionsTab = itemTabBar.getItems().find(function (item) {
				return item.getKey() == "match";
			});
			//			var oControl = new sap.m.VBox().addStyleClass("sapUiSmallMarginTop");
			var oControl = new sap.m.VBox(),
				matchLabel;
			iconTab.removeAllContent();
			for (var i = 0; i < matchEntities.length; i++) {
				oEntitySet = oMetaModel.getODataEntitySet(matchEntities[i]);
				if (oEntitySet && oEntitySet.entityType) {
					oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
				}
				if (oEntityType && oEntityType['com.sap.vocabularies.UI.v1.HeaderInfo']) {
					oMatchPathMenu.addItem(new sap.m.MenuItem({
						text: oEntityType['com.sap.vocabularies.UI.v1.HeaderInfo'].TypeName.String,
						press: oController.matchPathSelect.bind(oController)
					}).data({
						name: matchEntities[i],
						entityType: oEntitySet.entityType,
						tabBarId: itemTabBar.getId(),
						source: "mPath"
					}));
					oMatchPaths.push({
						name: matchEntities[i],
						text: oEntityType['com.sap.vocabularies.UI.v1.HeaderInfo'].TypeName.String,
						entityType: oEntitySet.entityType,
						tabBarId: itemTabBar.getId()
					});
				}
			}
			oEntitySet = oMetaModel.getODataEntitySet(iconTab.data("name"));
			if (oEntitySet && oEntitySet.entityType) {
				var oEntityType = oMetaModel.getODataEntityType(
					oEntitySet.entityType
				);
			}
			var matchEntity = oEntityType.navigationProperty.find(function (obj) {
				var mEntityType = oMetaModel.getODataEntityType(
					oMetaModel.getODataAssociationEnd(oEntityType, obj.name).type
				);
				if (mEntityType && mEntityType["vui.bodc.workspace.Match"]) {
					return mEntityType;
				}
			});
			if (matchEntity) {
				matchEntity = oMetaModel.getODataEntityType(
					oMetaModel.getODataAssociationEnd(oEntityType, matchEntity.name)
						.type
				);
				if (
					oMetaModel.getODataEntitySet(
						matchEntity.name.split("Type")[0] + "__MANUAL_MATCH"
					)
				) {
					var manualMatchEntity = oMetaModel.getODataEntityType(
						oMetaModel.getODataEntitySet(
							matchEntity.name.split("Type")[0] + "__MANUAL_MATCH"
						).entityType
					);
					if (
						manualMatchEntity &&
						manualMatchEntity["com.sap.vocabularies.UI.v1.HeaderInfo"] &&
						manualMatchEntity["com.sap.vocabularies.UI.v1.HeaderInfo"]
							.Description &&
						manualMatchEntity["com.sap.vocabularies.UI.v1.HeaderInfo"]
							.Description.Value
					) {
						var labelField = oMetaModel.getODataProperty(
							manualMatchEntity,
							manualMatchEntity["com.sap.vocabularies.UI.v1.HeaderInfo"]
								.Description.Value.Path
						);
						matchLabel =
							labelField["com.sap.vocabularies.Common.v1.Label"].String;
					}
				}
			}
			var thldpProp = oEntityType.property.find(function (prop) {
				return prop.name === "thldp";
			});
			var hBox = new sap.m.HBox(),
				oMenuButton;
			if (thldpProp) {
				oToolsMenu.addItem(
					new sap.m.MenuItem({
						text: {
							parts: [
								{ path: "viewModel>/matchDetails/hdrProp/thldp" },
								{ path: "i18n>CONFIDENCE" },
							],
							formatter: function (thldp, text) {
								return text + ": " + thldp + "%";
							},
						},
						press: oController.onMatchTresholdChange.bind(oController),
					})
				);
				hBox.addItem(oToolsMenu);
				oMenuButton = new sap.m.Button({
					icon: "sap-icon://sys-find",
					tooltip: { path: "i18n>FIND" },
					type: sap.m.ButtonType.Transparent,
					press: oController.onMatchFieldValueSearch.bind(oController),
				}).data({
					selectedPath: oController.DSCSourcePath,
					parentEntity: oController.sidePanelDSC.entitySet,
					matchEntity: matchEntity
						? matchEntity.name.split("Type")[0] + "__MANUAL_MATCH"
						: "",
					matchSteps: oEntityType
						? oEntityType["vui.bodc.Workspace.MatchSteps"]
						: "",
					matchSourceField: matchEntity
						? matchEntity["vui.bodc.workspace.MatchSourceFieldss"]
						: "",
					//					F4Entity: field_prop["com.sap.vocabularies.Common.v1.ValueList"].CollectionPath.String,
					//					f4DescrField: field_prop["com.sap.vocabularies.Common.v1.Text"].Path.split("/")[1],
					//					fname: contextObject.field,
					label: matchLabel,
					//					headerField: field_prop["vui.bodc_workspace.MatchHeaderFieldGroup"],
					//					sourceInputId: inputField.getId()
				});
				hBox.addItem(oMenuButton);
			} else {
				oController.adjustmentFlow = true;
				oMenuButton = new sap.m.Button({
					icon: "sap-icon://sys-find",
					tooltip: { path: "i18n>FIND" },
					type: sap.m.ButtonType.Transparent,
					//					press: oController.openMatchToolsDialog.bind(oController)
					press: oController.onMatchFieldValueSearch.bind(oController),
				}).data({
					selectedPath: oController.DSCSourcePath,
					parentEntity: oController.sidePanelDSC.entitySet,
					matchEntity: matchEntity
						? matchEntity.name.split("Type")[0] + "__MANUAL_MATCH"
						: "",
					matchSteps: oEntityType
						? oEntityType["vui.bodc.Workspace.MatchSteps"]
						: "",
					matchSourceField: matchEntity
						? matchEntity["vui.bodc.workspace.MatchSourceFieldss"]
						: "",
					//					F4Entity: field_prop["com.sap.vocabularies.Common.v1.ValueList"].CollectionPath.String,
					//					f4DescrField: field_prop["com.sap.vocabularies.Common.v1.Text"].Path.split("/")[1],
					//					fname: contextObject.field,
					label: matchLabel,
					//					headerField: field_prop["vui.bodc_workspace.MatchHeaderFieldGroup"],
					//					sourceInputId: inputField.getId()
				});
				hBox.addItem(oMenuButton);
			}

			var oToolbar = new sap.m.Toolbar({
				content: [
					//** new dsc changes - 16-Mar-2022 **start
					//					new sap.m.HBox({
					//						alignItems: "Center",
					//						items: [
					//							new sap.m.Label({
					//								text: "{i18n>MATCHFOR}:",
					////								visible: oController.matchSectionContext.matchPathPopup.getContent()[0].getItems().length > 1,
					//								//								layoutData: new sap.m.OverflowToolbarLayoutData({
					//								//								priority: "NeverOverflow"
					//								//								})
					//							}),
					//							//							new sap.m.MenuButton({
					//							//								menu: oMatchPathMenu,
					//							//								type: sap.m.ButtonType.Transparent
					//							//							}),
					//							new sap.m.Button({
					////								icon: oController.matchSectionContext.matchPathPopup.getContent()[0].getItems().length > 1 ? "sap-icon://slim-arrow-down" : "",
					////								visible: oController.matchSectionContext.matchPathPopup.getContent()[0].getItems().length > 1,
					//								icon: "sap-icon://slim-arrow-down",
					//								iconFirst: false,
					//								type: sap.m.ButtonType.Transparent,
					//								press: function (oEvent) {
					//									oController.matchSectionContext.matchPathPopup.openBy(oEvent.getSource());
					//								}
					//							})
					//							],
					//							//							width:"38%",
					//							//							layoutData: new sap.m.OverflowToolbarLayoutData({
					//							//							priority: "NeverOverflow"
					//							//							})
					//					}),
					//** new dsc changes - 16-Mar-2022 **end

					new sap.m.HBox({
						alignItems: "Center",
						items: [
							new sap.m.Label({
								text: "{i18n>MATCHFOR}:",
								//								layoutData: new sap.m.OverflowToolbarLayoutData({
								//								priority: "NeverOverflow"
								//								})
							}),
							new sap.m.MenuButton({
								menu: oMatchPathMenu,
								type: sap.m.ButtonType.Transparent,
								//								width:"80%"
							}),
						],
						//							width:"38%",
						//							layoutData: new sap.m.OverflowToolbarLayoutData({
						//							priority: "NeverOverflow"
						//							})
					}),
					new sap.m.HBox({
						alignItems: "Center",
						items: [
							new sap.m.Label({
								text: "{i18n>MATCHBY}:",
								visible: false,
								//								layoutData: new sap.m.OverflowToolbarLayoutData({
								//								priority: "NeverOverflow"
								//								})
							}),
							new sap.m.MenuButton({
								menu: new sap.m.Menu(),
								type: sap.m.ButtonType.Transparent,
								visible: false,
								//								width:"80%"
							}),
						],
						//							width:"38%",
						//							layoutData: new sap.m.OverflowToolbarLayoutData({
						//							priority: "NeverOverflow"
						//							})
					}),
					//					new sap.m.Button({
					////					text: "Confidence: ≥ 20%",
					//					text: {parts:[{path: "viewModel>/matchDetails/hdrProp/thldp"},{path:"i18n>CONFIDENCE"}],
					//					formatter: function(thldp,text){
					//					return text + ": " + thldp + "%"
					//					}
					//					},
					//					type: sap.m.ButtonType.Transparent,
					//					press: oController.onMatchTresholdChange.bind(oController)
					//					}),
					new sap.m.ToolbarSpacer(),
					hBox,
					//					new sap.m.Button({
					//					icon: "sap-icon://compare",
					//					text: {path:"i18n>TOOLS"},
					//					type: sap.m.ButtonType.Transparent,
					//					press: oController.openMatchToolsDialog.bind(oController)
					//					})
				],
			});

			oControl.addItem(oToolbar);

			//			itemTabBar.getItems()[2].addContent(oControl);
			iconTab.addContent(oControl);

			//			oMatchPathMenu.getItems()[0].firePress();
			//			Adjustment changes to select the suggestion tab again after table refresh
			//			if(viewModel.getProperty("/selectedSegmenetedButton")){
			//					var selectedSegmenetedButton = sap.ui.getCore().getElementById(viewModel.getProperty("/selectedSegmenetedButton"));
			//					selectedSegmenetedButton.firePress();
			//					if(sap.ui.getCore().getElementById(viewModel.getProperty("/selectedSegmenetedButton").split("-button")[0])){
			//						sap.ui.getCore().getElementById(viewModel.getProperty("/selectedSegmenetedButton").split("-button")[0]).firePress();
			//						var segmentedButton = sap.ui.getCore().getElementById(viewModel.getProperty("/selectedSegmenetedButton").split("-button")[0]).getParent();
			//						segmentedButton.setSelectedKey(sap.ui.getCore().getElementById(viewModel.getProperty("/selectedSegmenetedButton").split("-button")[0]).getKey());
			//					}
			//			}
			//				},200);
		},
		matchPathSelect: function (oEvent) {
			var oController = this;
			//** new dsc changes - 16-Mar-2022 **start
			if (oEvent.getId() == "press") {
				var oSource = oEvent.getSource();
			} else {
				var oSource = oEvent;
				oController.selectedMatchTab = oSource;
				oController.prepareMatchToolbar(oSource);
			}
			//** new dsc changes - 16-Mar-2022 **end

			//	QA#11739->On Apply Multiple Lines search Result is getting changed in Payments Workspace in Manual Match --Start
			if (oController._oMatchDialog && oController._oMatchDialog.isOpen()) {
				return;
			}
			//	QA#11739->On Apply Multiple Lines search Result is getting changed in Payments Workspace in Manual Match --End 

			var oMatchPathData = oSource.data();

			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();

			var itemTabBar = sap.ui
				.getCore()
				.getElementById(oMatchPathData.tabBarId);
			var viewModel = oController.getView().getModel("viewModel");

			var previousHeaderEntity = viewModel.getProperty(
				"/matchDetails/headerEntity"
			);
			var previousmatchGroupKey = viewModel.getProperty(
				"/matchDetails/matchGroupKey"
			);

			var bundle = oController.getView().getModel("i18n").getResourceBundle();

			var oEntitySet, oEntityType, oTargetEntity;

			oEntityType = oMetaModel.getODataEntityType(oMatchPathData.entityType);
			//			var oToolbar = sap.ui.getCore().getElementById(oMatchPathData.tabBarId).getItems()[2].getContent()[0].getItems()[0];
			var oToolbar = oController.selectedMatchTab
				.getContent()[0]
				.getItems()[0];
			if (
				oEntityType["vui.bodc.Workspace.MatchSteps"] &&
				oMatchPathData.source == "mPath"
			) {
				//				oSource.getParent().getParent().getParent().getParent().getContent()[1].getItems()[0].setVisible(true);
				//				oSource.getParent().getParent().getParent().getParent().getContent()[1].getItems()[1].setVisible(true);
				//				oSource.getParent().getParent().setText(oSource.getText());
				//				oSource.getParent().getParent().setTooltip(oSource.getText());
				//				if(oSource.getText().length > 15){
				//                    oSource.getParent().getParent().setWidth("8rem");
				//				}else{
				//					oSource.getParent().getParent().setWidth("");
				//				}
				//** new dsc changes - 16-Mar-2022 **start
				//				oToolbar.getContent()[0].getItems()[0].setVisible(true);
				oToolbar.getContent()[0].getItems()[1].setVisible(true);
				//				oToolbar.getContent()[1].getItems()[0].setVisible(true);
				//				oToolbar.getContent()[1].getItems()[1].setVisible(true);
				//				oToolbar.getContent()[0].getItems()[1].setText(oSource.getTitle());
				//				oToolbar.getContent()[0].getItems()[1].setTooltip(oSource.getTitle());
				//				if (oSource.getTitle().length > 12) {
				//					oToolbar.getContent()[0].getItems()[1].setWidth("7rem");
				//				} else {
				//					oToolbar.getContent()[0].getItems()[1].setWidth("");
				//				}
				//** new dsc changes - 16-Mar-2022 **end

				var oMatchGoupKeys = [];
				// var oMatchGroups = oEntityType["vui.bodc.MatchGroup"][0].MatchGroup;
				var oMatchSteps = oEntityType["vui.bodc.Workspace.MatchSteps"];
				//				var oMatchGroupMenu = oSource.getParent().getParent().getParent().getParent().getContent()[1].getItems()[1].getMenu();
				//				oMatchGroupMenu.removeAllItems();
				//				for(var i=0; i<oMatchGroups.length; i++){
				//					oMatchGroupMenu.addItem(new sap.m.MenuItem({
				//						text: oMatchGroups[i].String.split("__")[1],
				//						press: oController.matchPathSelect.bind(oController)
				//					}).data({
				//						name: oMatchPathData.name,
				//						entityType: oMatchPathData.entityType,
				//						tabBarId: oMatchPathData.tabBarId,
				//						mGroupKey: oMatchGroups[i].String.split("__")[0],
				//						source: "mGroup"
				//					}));
				//					oMatchGoupKeys.push(oMatchGroups[i].String.split("__")[0]);
				//				}
				var oListItems = [];
				for (var i = 0; i < oMatchSteps.length; i++) {
					var item = new sap.m.StandardListItem({
						title: oMatchSteps[i].String.split("--")[1],
						type: "Active",
						highlight: {
							parts: [
								{ value: oMatchSteps[i].String.split("--")[0] },
								{ path: "viewModel>/matchDetails/matchGroupKey" },
							],
							formatter: function (key, selectedKey) {
								if (key == selectedKey) {
									return "Success";
								}
								return "None";
							},
						},
						press: oController.matchPathSelect.bind(oController),
					}).data({
						name: oMatchPathData.name,
						entityType: oMatchPathData.entityType,
						tabBarId: oMatchPathData.tabBarId,
						mGroupKey: oMatchSteps[i].String.split("--")[0],
						source: "mGroup",
					});
					oListItems.push(item);
					oMatchGoupKeys.push(oMatchSteps[i].String.split("--")[0]);
				}

				if (oMatchGoupKeys.length > 0) {
					viewModel.setProperty(
						"/matchDetails/matchGoupKeys",
						oMatchGoupKeys
					);
				}

				oController.matchSectionContext.matchGroupPopup = new sap.m.Popover({
					showHeader: false,
					showArrow: false,
					placement: sap.m.PlacementType.Bottom,
					content: [
						new sap.m.List({
							showSeparators: "None",
							items: oListItems,
						}),
					],
				});
				oController
					.getView()
					.addDependent(oController.matchSectionContext.matchGroupPopup);
				oListItems[0].firePress();
				return;
			}

			else if (oMatchPathData.source == "mPath") {
				//				oSource.getParent().getParent().getParent().getParent().getContent()[1].getItems()[0].setVisible(false);
				//				oSource.getParent().getParent().getParent().getParent().getContent()[1].getItems()[1].setVisible(false);
				//				oSource.getParent().getParent().getParent().getParent().getContent()[1].getItems()[1].getMenu().removeAllItems();
				//** new dsc changes - 16-Mar-2022 **start
				//				oToolbar.getContent()[1].getItems()[0].setVisible(false);
				//				oToolbar.getContent()[1].getItems()[1].setVisible(false);
				//** new dsc changes - 16-Mar-2022 **end
				// oToolbar.getContent()[0].getItems()[0].setVisible(true);


				oToolbar.getContent()[0].getItems()[1].setVisible(true);
				var text = oToolbar.getContent()[0].getItems()[1].getMenu().getItems()[0].getText();
				oToolbar.getContent()[0].getItems()[1].setText(text);
				if (viewModel.getProperty("/matchDetails/matchGoupKeys")) {
					viewModel.setProperty("/matchDetails/matchGoupKeys", undefined);
				}
			}
			//			QA#8903 - Match tab switching not working
			//			if (previousHeaderEntity != oMatchPathData.entityType || oMatchPathData.source == "mGroup") {
			//
			if (oMatchPathData.source == "mGroup") {
				if (previousmatchGroupKey == oMatchPathData.mGroupKey) {
					// return;
				} else {
					viewModel.setProperty(
						"/matchDetails/matchGroupKey",
						oMatchPathData.mGroupKey
					);
				}
			} else {
				viewModel.setProperty("/matchDetails/matchGroupKey", "");
			}
			viewModel.setProperty("/matchDetails/matchResults", []);
			var oMenuButton, text;
			if (oMatchPathData.source == "mGroup") {
				//** new dsc changes - 16-Mar-2022 **start
				oMenuButton = oToolbar.getContent()[0].getItems()[1];
				//** new dsc changes - 16-Mar-2022 **start
				text = oSource.getTitle();
			} else {
				//					oMenuButton = oToolbar.getContent()[0].getItems()[1];
				//					text = oSource.getTitle();
			}
			if (oMenuButton) {
				oMenuButton.setText(text);
				oMenuButton.setTooltip(text);
			}
			//				if (text.length > 12) {
			//					oMenuButton.setWidth("7rem");
			//				} else {
			//					oMenuButton.setWidth("");
			//				}
			viewModel.setProperty(
				"/matchDetails/headerEntity",
				oMatchPathData.entityType
			);
			viewModel.setProperty(
				"/matchDetails/headerEntityName",
				oMatchPathData.name
			);
			var urlParameters = {};

			if (oMatchPathData.source == "mGroup") {
				urlParameters["mgrp"] = oMatchPathData.mGroupKey;
			}

			oModel.read("/" + oMatchPathData.name, {
				urlParameters: urlParameters,
				success: function (oData, response) {
					if (!oData.results) return;

					//						itemTabBar.getItems()[2].setVisible(true);
					//						var hdrProp = {
					//								mpath: oData.results[0].mpath,
					//								thldp: parseInt(oData.results[0].thldp)
					//						};
					var hdrProp;
					if (oData.results[0].mpath) {
						hdrProp = {
							mpath: oData.results[0].mpath,
							thldp: parseInt(oData.results[0].thldp),
						};
					} else if (oData.results[0].pmprc) {
						hdrProp = {
							mpath: oData.results[0].pmprc,
						};
					}
					viewModel.setProperty("/matchDetails/hdrProp", hdrProp);
					viewModel.setProperty("/matchDetails/hdrDetails", oData.results[0]);

					if (
						oEntityType.navigationProperty &&
						oEntityType.navigationProperty.length > 0
					) {
						for (var i = 0; i < oEntityType.navigationProperty.length; i++) {
							oTargetEntity = oMetaModel.getODataEntityType(
								oMetaModel.getODataAssociationEnd(
									oEntityType,
									oEntityType.navigationProperty[i].name
								).type
							);
							if (
								oTargetEntity &&
								oTargetEntity["vui.bodc.workspace.Match"]
							) {
								var oColumns = [],
									oTableEntity = oTargetEntity;
								var oLineItems = oTableEntity["vui.bodc.ResponsiveLineItem"];
								var columnListItemType = "Inactive";
								var matchGroupKey = viewModel.getProperty(
									"/matchDetails/matchGroupKey"
								);
								var sourcefieldAnnotation;
								if (matchGroupKey && matchGroupKey !== "ALL") {
									//										sourcefieldAnnotation = "vui.bodc.workspace.MatchSourceFieldss." + matchGroupKey;
									sourcefieldAnnotation =
										"vui.bodc.workspace.MatchSourceFieldss";
								} else {
									sourcefieldAnnotation =
										"vui.bodc.workspace.MatchSourceFieldss";
								}
								if (oTableEntity[sourcefieldAnnotation]) {
									var tableData = [];
									_.each(
										oTableEntity[sourcefieldAnnotation],
										function (item) {
											var sourceField = item.PropertyPath.split("/")[1];
											var targetField = item.PropertyPath.split("/")[3];
											var cellProperties = _.find(oTableEntity.property, {
												name: targetField,
											});
											if (cellProperties) {
												tableData.push({
													field:
														cellProperties[
															"com.sap.vocabularies.Common.v1.Label"
														].String,
													source: sourceField,
													target: targetField,
												});
											}
										}
									);
									viewModel.setProperty(
										"/matchItemsData" + oTableEntity.name,
										tableData
									);
									columnListItemType = "Navigation";
								}
								var oTable = new sap.m.Table({
									itemPress: [oController.onMatchItemPress, oController],
									autoPopinMode: false,
									columns: [
										new sap.m.Column({
											visible: true,
											//												width: "70%",
										}),
										//											new sap.m.Column({
										//											visible: true,
										//											}),
										//											new sap.m.Column({
										//											visible: true,
										//											width: "40px",
										//											}),
										//											new sap.m.Column({
										//											visible: true,
										//											demandPopin: true,
										//											popinDisplay: "Block",
										//											minScreenWidth: sap.m.ScreenSize.Phone
										//											})
									],
								});
								oTable.data("entity", oTableEntity.name.split("Type")[0]);
								//									for(var j=0; j<oLineItems.length; j++){
								//									var oLabel = oLineItems[j].Label, oWidth;
								//									if(!oLabel){
								//									var oProp = oTableEntity.property.find(function(prop){
								//									return prop.name === oLineItems[j].Value.Path
								//									});
								//									oLabel = oProp["com.sap.vocabularies.Common.v1.Label"].String;
								//									}else{
								//									oLabel = oLabel.String;
								//									}

								//									if(oLineItems[j].RecordType == "com.sap.vocabularies.UI.v1.CollectionField"){
								//									oWidth = "";
								//									}else if(oLineItems[j].RecordType == "com.sap.vocabularies.UI.v1.DataFieldForAction"){
								//									oWidth = "40px";
								//									oLabel = "";
								//									}else if(oLineItems[j].Value.Path == "mtpct"){
								//									oWidth = "74px";
								//									}else{
								//									oWidth = "";
								//									}

								//									oTable.addColumn(new sap.m.Column({
								//									header: new sap.m.Text({
								//									text: oLabel
								//									}),
								//									visible: true,
								//									width: oWidth
								//									}));
								//									}

								oTable.bindAggregation(
									"items",
									"viewModel>/matchDetails/matchResults",
									function (sId, oContext) {
										var contextObject = oContext.getObject();
										var oCells = [],
											oContent;
										//										for(var j=0; j<oLineItems.length; j++){
										//										if(oLineItems[j].RecordType == "com.sap.vocabularies.UI.v1.CollectionField"){
										//										oContent = new sap.m.VBox();
										//										var oFields = oLineItems[j].Fields;
										//										for(var k=0; k<oFields.length; k++){
										//										oContent.addItem(new sap.m.Text({
										//										text: "{viewModel>" + oFields[k].Value.Path + "}"
										//										}));
										//										}

										//										}else if(oLineItems[j].RecordType == "com.sap.vocabularies.UI.v1.DataFieldForAction"){
										//										var oButtonType;
										//										if(contextObject.mqlfr){
										//										oButtonType = sap.m.ButtonType.Emphasized;
										//										}else{
										//										oButtonType = sap.m.ButtonType.Default;
										//										}

										//										oContent = new sap.m.Button({
										//										icon: "sap-icon://accept",
										//										type: oButtonType,
										//										enabled: "{viewModel>/matchDetails/enabled}",
										//										press: oController.onMatchResultAction.bind(oController)
										//										}).data("Action",oLineItems[j].Action.String);
										//										}else{
										//										oContent = new sap.suite.ui.microchart.RadialMicroChart({
										//										size: sap.m.Size.S,
										//										percentage: parseFloat(contextObject.mtpct)
										//										})
										//										}
										//										oCells.push(oContent);
										//										}
										var oVBox = new sap.m.VBox();
										var oHBox = new sap.m.HBox({
											width: "100%",
											alignItems: "Center",
										});
										var title = "",
											subtitle = "",
											quickViewField,
											TitleField;
										var collectionField = oLineItems.find(function (obj) {
											return (
												obj.RecordType ==
												"com.sap.vocabularies.UI.v1.CollectionField"
											);
										});
										if (collectionField && collectionField.Fields) {
											_.each(collectionField.Fields, function (field) {
												if (field.Quickview_Enitity) {
													quickViewField = field;
												} else {
													TitleField = field;
												}
											});
										}
										if (collectionField && quickViewField) {
											var oList = new sap.m.Link({
												text: "{viewModel>" + quickViewField.Value.Path + "}",
												press: [
													oController.onTableNavigationLinkClick,
													oController,
												],
												wrapping: true,
											});
											oList.data("FieldName", quickViewField.Value.Path);
											oList.data("TableEntity", oTable.data("entity"));
											oList.data("row_id", contextObject.row_id);
											if (quickViewField.Quickview_Enitity) {
												oList.data(
													"QuickviewEnitity",
													quickViewField.Quickview_Enitity.String
												);
											}
											if (quickViewField.HREF) {
												oList.data("HREF", quickViewField.HREF.Path);
											}
											var linkBox = new sap.m.VBox({});
											if (
												TitleField &&
												TitleField.Value &&
												TitleField.Value.Path
											) {
												linkBox.addItem(
													new sap.m.Label({
														text: TitleField
															? "{viewModel>" + TitleField.Value.Path + "}"
															: "",
														design: "Bold",
													})
												);
											}
											linkBox.addItem(oList);
											if (
												oTableEntity[
												"com.sap.vocabularies.UI.v1.HeaderInfo"
												] &&
												oTableEntity["com.sap.vocabularies.UI.v1.HeaderInfo"]
													.Description &&
												oTableEntity["com.sap.vocabularies.UI.v1.HeaderInfo"]
													.Description.Value.Path != quickViewField.Value.Path
											) {
												linkBox.addItem(
													new sap.m.Text({
														text:
															"{viewModel>" +
															oTableEntity[
																"com.sap.vocabularies.UI.v1.HeaderInfo"
															].Description.Value.Path +
															"}",
													})
												);
											}

											oContent = linkBox;
										} else {
											if (
												oTableEntity[
												"com.sap.vocabularies.UI.v1.HeaderInfo"
												] &&
												oTableEntity["com.sap.vocabularies.UI.v1.HeaderInfo"]
													.Title
											) {
												title =
													"{viewModel>" +
													oTableEntity[
														"com.sap.vocabularies.UI.v1.HeaderInfo"
													].Title.Value.Path +
													"}";
											}

											if (
												oTableEntity[
												"com.sap.vocabularies.UI.v1.HeaderInfo"
												] &&
												oTableEntity["com.sap.vocabularies.UI.v1.HeaderInfo"]
													.Description
											) {
												subtitle =
													"{viewModel>" +
													oTableEntity[
														"com.sap.vocabularies.UI.v1.HeaderInfo"
													].Description.Value.Path +
													"}";
											}
											oContent = new sap.m.ObjectIdentifier({
												title: title,
												text: subtitle,
												titleActive: false,
											}).addStyleClass("matchTitleObjectIdentifier");
										}
										//										oCells.push(oContent);
										var mtpctField = oLineItems.find(function (obj) {
											return obj.Value && obj.Value.Path == "mtpct";
										});
										if (mtpctField) {
											//										Radial Microchart
											oHBox.addItem(
												new sap.m.HBox({
													items: [oContent],
													width: "70%",
												})
											);

											//											oContent = new sap.suite.ui.microchart.RadialMicroChart({
											//												size: sap.m.Size.XS,
											//												percentage: parseFloat(contextObject.mtpct)
											//											});
											oContent = new sap.m.RatingIndicator({
												iconSize: "12px",
												maxValue: 5,
												editable: false,
												value: { path: "viewModel>mtpct", formatter: zvui.work.controller.AnnotationHelper.getRatingValue }
												//value: "{viewModel>mtpct}",
											}).addStyleClass("sapUiSmallMarginEnd");
											oHBox.addItem(
												new sap.m.HBox({
													items: [oContent],
												})
											);
										} else {
											oHBox.addItem(
												new sap.m.HBox({
													items: [oContent],
													width: "90%",
												})
											);
										}
										//										Button
										var oButtonType;
										if (contextObject.mqlfr) {
											oButtonType = sap.m.ButtonType.Emphasized;
										} else {
											oButtonType = sap.m.ButtonType.Default;
										}
										var sIcon;
										if (contextObject.mqlfr) {
											sIcon = "sap-icon://accept";
										} else {
											sIcon = "sap-icon://status-completed";
										}

										var buttonLineItem = oLineItems.find(function (obj) {
											return (
												obj.RecordType ==
												"com.sap.vocabularies.UI.v1.DataFieldForAction"
											);
										});
										oContent = new sap.m.Button({
											icon: sIcon,
											type: oButtonType,
											enabled: "{viewModel>/matchDetails/enabled}",
											press:
												oController.onMatchResultAction.bind(oController),
										}).data("Action", buttonLineItem.Action.String);

										oHBox.addItem(
											new sap.m.HBox({
												items: [oContent],
												width: "40px",
											})
										);
										oVBox.addItem(oHBox);

										var oAddressProp = oTableEntity.property.find(function (
											prop
										) {
											return prop.name === "adrln";
										});
										if (oAddressProp) {
											//											oVBox.addItem(new sap.m.Label({
											//											text: oAddressProp["com.sap.vocabularies.Common.v1.Label"].String + ":",
											//											design: sap.m.LabelDesign.Bold
											//											}));

											oHBox = new sap.m.HBox({
												width: "100%",
											}).addStyleClass("addressHBox sapUiTinyMarginTop");

											contextObject.adrln = contextObject.adrln.replace(
												new RegExp("/n", "g"),
												"\n"
											);
											//											oContent = new sap.m.TextArea({
											//											value: "{viewModel>adrln}",
											//											width: "100%",
											//											rows: contextObject.adrln.split("\n").length,
											//											editable: false,
											//											wrapping: sap.ui.core.Wrapping.Off
											//											});
											oContent = new sap.m.Text({
												text: contextObject.adrln,
											});
											oHBox.addItem(oContent);

											oVBox.addItem(oHBox);
										}
										if (
											oTableEntity[
											"com.sap.vocabularies.UI.v1.Identification"
											]
										) {
											var oLeftItems = oTableEntity[
												"com.sap.vocabularies.UI.v1.Identification"
											].filter(function (obj) {
												return (
													!obj.Alignment ||
													obj.Alignment.String == "L" ||
													obj.Alignment.String == ""
												);
											});
											var oRightItems = oTableEntity[
												"com.sap.vocabularies.UI.v1.Identification"
											].filter(function (obj) {
												return obj.Alignment && obj.Alignment.String == "R";
											});
											var oForm = new sap.m.HBox().addStyleClass(
												"sapUiTinyMarginTop"
											);
											if (oLeftItems.length > 0) {
												var oItemsVBox = new sap.m.VBox();
												for (var i = 0; i < oLeftItems.length; i++) {
													var oItemHBox = new sap.m.VBox({
														wrappig: true,
													});
													var oFieldProp = oTableEntity.property.find(
														function (prop) {
															return prop.name === oLeftItems[i].Value.Path;
														}
													);
													var sPath;
													if (oFieldProp.type == "Edm.DateTime") {
														sPath =
															"{path: 'viewModel>" +
															oLeftItems[i].Value.Path +
															"', formatter: 'zvui.work.controller.AnnotationHelper.getChangeDateFormat'}";
													} else if (
														oFieldProp["com.sap.vocabularies.Common.v1.Text"]
													) {
														switch (
														oFieldProp[
															"com.sap.vocabularies.Common.v1.Text"
														]["com.sap.vocabularies.UI.v1.TextArrangement"]
															.EnumMember
														) {
															case "com.sap.vocabularies.UI.v1.TextArrangementType/TextLast":
																sPath =
																	"{viewModel>" +
																	oLeftItems[i].Value.Path +
																	"}" +
																	" {viewModel>" +
																	oFieldProp[
																		"com.sap.vocabularies.Common.v1.Text"
																	].Path +
																	"}";
																break;
															case "com.sap.vocabularies.UI.v1.TextArrangementType/TextSeparate":
																sPath =
																	"{viewModel>" +
																	oLeftItems[i].Value.Path +
																	"}";
																break;
															case "com.sap.vocabularies.UI.v1.TextArrangementType/TextOnly":
																sPath =
																	"{viewModel>" +
																	oFieldProp[
																		"com.sap.vocabularies.Common.v1.Text"
																	].Path +
																	"}";
																break;
															default:
																sPath =
																	"{viewModel>" +
																	oFieldProp[
																		"com.sap.vocabularies.Common.v1.Text"
																	].Path +
																	"} (" +
																	"{viewModel>" +
																	oLeftItems[i].Value.Path +
																	"})";
														}
													} else {
														sPath =
															"{viewModel>" + oLeftItems[i].Value.Path + "}";
													}
													oItemHBox.addItem(
														new sap.m.Label({
															text:
																oFieldProp[
																	"com.sap.vocabularies.Common.v1.Label"
																].String + ": ",
															design: sap.m.LabelDesign.Bold,
														}).addStyleClass("sapUiTinyMarginEnd")
													);
													oItemHBox.addItem(
														new sap.m.Text({
															text: sPath,
														})
													);
													oItemsVBox.addItem(oItemHBox);
												}
												if (oRightItems.length > 0) {
													oForm.addItem(
														new sap.m.HBox({
															items: [oItemsVBox],
															width: "50%",
														})
													);
												} else {
													oForm.addItem(
														new sap.m.HBox({ items: [oItemsVBox] })
													);
												}
											}
											if (oRightItems.length > 0) {
												var oItemsVBox = new sap.m.VBox();
												for (var i = 0; i < oRightItems.length; i++) {
													var oItemHBox = new sap.m.VBox({
														wrappig: true,
													});
													var oFieldProp = oTableEntity.property.find(
														function (prop) {
															return prop.name === oRightItems[i].Value.Path;
														}
													);
													oItemHBox.addItem(
														new sap.m.Label({
															text:
																oFieldProp[
																	"com.sap.vocabularies.Common.v1.Label"
																].String + ": ",
															design: sap.m.LabelDesign.Bold,
														}).addStyleClass("sapUiTinyMarginEnd")
													);
													var sPath;
													if (oFieldProp.type == "Edm.DateTime") {
														sPath =
															"{path: 'viewModel>" +
															oRightItems[i].Value.Path +
															"', formatter: 'zvui.work.controller.AnnotationHelper.getChangeDateFormat'}";
													} else if (
														oFieldProp["com.sap.vocabularies.Common.v1.Text"]
													) {
														switch (
														oFieldProp[
															"com.sap.vocabularies.Common.v1.Text"
														]["com.sap.vocabularies.UI.v1.TextArrangement"]
															.EnumMember
														) {
															case "com.sap.vocabularies.UI.v1.TextArrangementType/TextLast":
																sPath =
																	"{viewModel>" +
																	oRightItems[i].Value.Path +
																	"}" +
																	" {viewModel>" +
																	oFieldProp[
																		"com.sap.vocabularies.Common.v1.Text"
																	].Path +
																	"}";
																break;
															case "com.sap.vocabularies.UI.v1.TextArrangementType/TextSeparate":
																sPath =
																	"{viewModel>" +
																	oRightItems[i].Value.Path +
																	"}";
																break;
															case "com.sap.vocabularies.UI.v1.TextArrangementType/TextOnly":
																sPath =
																	"{viewModel>" +
																	oFieldProp[
																		"com.sap.vocabularies.Common.v1.Text"
																	].Path +
																	"}";
																break;
															default:
																sPath =
																	"{viewModel>" +
																	oFieldProp[
																		"com.sap.vocabularies.Common.v1.Text"
																	].Path +
																	"} (" +
																	"{viewModel>" +
																	oRightItems[i].Value.Path +
																	"})";
														}
													} else {
														sPath =
															"{viewModel>" + oRightItems[i].Value.Path + "}";
													}

													oItemHBox.addItem(
														new sap.m.Text({
															text: sPath,
														})
													);
													oItemsVBox.addItem(oItemHBox);
												}
												if (oLeftItems.length > 0) {
													oForm.addItem(
														new sap.m.HBox({
															items: [oItemsVBox],
															width: "50%",
														})
													);
												} else {
													oForm.addItem(
														new sap.m.HBox({ items: [oItemsVBox] })
													);
												}
											}

											if (oLeftItems.length > 0 || oRightItems.length > 0) {
												oVBox.addItem(oForm);
											}
										}
										oCells.push(oVBox);

										return new sap.m.ColumnListItem({
											cells: oCells,
											type: columnListItemType,
										});
									}
								);
								//									if (itemTabBar.getItems()[2].getContent().length == 1) {
								//										itemTabBar.getItems()[2].addContent(new sap.m.VBox({
								//											items: [
								//												oTable
								//												]
								//										}));
								//									} else {
								//										itemTabBar.getItems()[2].getContent()[1].removeAllItems();
								//										itemTabBar.getItems()[2].getContent()[1].addItem(oTable);
								//									}
								var scrollContainer = new sap.m.ScrollContainer({
									width: "100%",
									height: "90%",
									horizontal: false,
									vertical: true,
									content: [oTable],
								});
								if (oController.selectedMatchTab.getContent().length == 1) {
									//										oController.selectedMatchTab.addContent(new sap.m.VBox({
									//											items: [
									//												oTable
									//												]
									//										}));
									oController.selectedMatchTab.addContent(scrollContainer);
								} else {
									//										oController.selectedMatchTab.getContent()[1].removeAllItems();
									//										oController.selectedMatchTab.getContent()[1].addItem(oTable);
									oController.selectedMatchTab
										.getContent()[1]
										.removeAllContent();
									oController.selectedMatchTab
										.getContent()[1]
										.addContent(oTable);
								}
								viewModel.setProperty(
									"/matchDetails/resultEntityName",
									oTableEntity.name.split("Type")[0]
								);

								oModel.read("/" + oTableEntity.name.split("Type")[0], {
									urlParameters: oController.readQueryPrepare(
										oTableEntity.name.split("Type")[0]
									),
									success: function (oData, response) {
										viewModel.setProperty(
											"/matchDetails/matchResults",
											oData.results
										);
									},
								});
							}
						}
					}
				},
			});
			//			}
		},
		onMatchTresholdChange: function (oEvent) {
			var oController = this;
			var oSource = oEvent.getSource();
			var viewModel = oController.getView().getModel("viewModel");
			var fromMatchTool = viewModel.getProperty("/matchDetails/fromMatchTool");
			var oPopover;
			if (fromMatchTool) {
				oPopover = new sap.m.Popover({
					title: "{i18n>CONFIDENCETHRESHOLD}",
					placement: sap.m.PlacementType.Bottom,
					contentWidth: "300px",
					contentHeight: "80px",
					content: [
						new sap.m.Slider({
							value: "{viewModel>/matchDetails/matchTool/hdrProp/thldp}",
							width: "80%",
							min: 0,
							max: 100,
							showAdvancedTooltip: true,
							showHandleTooltip: false
						}).addStyleClass("sapUiSmallMargin")
					]
				});
			} else {
				var thldp = viewModel.getProperty("/matchDetails/hdrProp/thldp");
				if (thldp) {
					thldp = parseInt(thldp);
				}
				var oListItems = [];
				for (var i = 4; i > 0; i--) {
					var value, highlight;
					if (i == 4) {
						value = 80 + "";
						highlight = thldp >= 80 ? "Success" : "None";
					} else if (i == 3) {
						value = 60 + "";
						highlight = thldp < 80 && thldp >= 60 ? "Success" : "None";
					} else if (i == 2) {
						value = 40 + "";
						highlight = thldp < 60 && thldp >= 40 ? "Success" : "None";
					} else if (i == 1) {
						value = 20 + "";
						highlight = thldp < 40 && thldp >= 20 ? "Success" : "None";
					}
					var item = new sap.m.CustomListItem({
						type: "Active",
						highlight: highlight,
						content: new sap.m.HBox({
							justifyContent: "Center",
							alignItems: "Center",
							items: [
								new sap.m.RatingIndicator({
									iconSize: "12px",
									maxValue: 5,
									editable: false,
									value: i
								}).addStyleClass("sapUiTinyMarginEnd"),
								new sap.m.Text({ text: "{i18n>AND_UP}" })
							]
						})
					}).data("value", value);
					oListItems.push(item);
				}

				var item = new sap.m.StandardListItem({
					icon: "sap-icon://sys-find",
					title: "{i18n>FIND}",
					type: "Active",
					press: function (oEvent) {
						oEvent.getSource().getParent().getParent().close();
						oController.openMatchToolsDialog();
					}
				});

				oListItems.push(item);

				oPopover = new sap.m.Popover({
					title: "{i18n>CONFIDENCE}",
					placement: sap.m.PlacementType.Bottom,
					contentWidth: "200px",
					//					contentHeight: "120px",
					content: [
						//						new sap.m.Slider({
						//						value: "{viewModel>/matchDetails/hdrProp/thldp}",
						//						width: "80%",
						//						min: 0,
						//						max: 100,
						//						showAdvancedTooltip: true,
						//						showHandleTooltip: false
						//						}).addStyleClass("sapUiSmallMargin")
						new sap.m.List({
							showSeparators: "None",
							items: oListItems,
							itemPress: function (oEvent) {
								var value = oEvent.getParameter("listItem").data("value");
								if (value) {
									viewModel.setProperty("/matchDetails/hdrProp/thldp", value);
									oEvent.getSource().getParent().close();
								}
							},
						})
					]
				});
			}
			oPopover.data("source", oEvent.getSource());
			oPopover.attachBeforeClose(oController.onMatchTresholdPopoverClose.bind(oController));
			oController.getView().addDependent(oPopover);
			var oSource = oEvent.getSource();
			oPopover.openBy(oSource);
		},
		onMatchTresholdPopoverClose: function (oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var viewModel = oController.getView().getModel("viewModel");
			var fromMatchTool = viewModel.getProperty("/matchDetails/fromMatchTool");
			var hdrProp, hdrDetails, headerEntityName, resultEntityName, oTable;
			var urlParameters = {};
			if (fromMatchTool) {
				hdrProp = viewModel.getProperty("/matchDetails/matchTool/hdrProp");
				hdrDetails = viewModel.getProperty("/matchDetails/matchTool/hdrDetails");
				headerEntityName = viewModel.getProperty("/matchDetails/matchTool/headerEntityName");
				oTable = oEvent.getSource().data().source.getParent().getParent().getTable();
			} else {
				hdrProp = viewModel.getProperty("/matchDetails/hdrProp");
				hdrDetails = viewModel.getProperty("/matchDetails/hdrDetails");
				headerEntityName = viewModel.getProperty("/matchDetails/headerEntityName");
				resultEntityName = viewModel.getProperty("/matchDetails/resultEntityName");
				if (viewModel.getProperty("/matchDetails/matchGroupKey")) {
					urlParameters["mgrp"] = viewModel.getProperty("/matchDetails/matchGroupKey")
				}
			}
			if (parseInt(hdrProp.thldp) != parseInt(hdrDetails.thldp)) {
				hdrDetails.thldp = hdrProp.thldp.toString();
				oModel.update("/" + headerEntityName + "(row_id='" + hdrDetails.row_id + "',mpath='" + hdrDetails.mpath + "')", hdrDetails, {
					method: "PUT",
					urlParameters: urlParameters,
					success: function (data) {
						if (fromMatchTool) {
							oTable.getBinding("items").refresh();
						} else {
							oModel.read("/" + resultEntityName, {
								success: function (oData, response) {
									viewModel.setProperty("/matchDetails/matchResults", oData.results);
								}
							});
						}
					},
					error: function (e) {
						//						alert("error");
					}
				});

			}
		},
		onMatchResultAction: function (oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var oSourceData = oEvent.getSource().data();
			var oItemSource = oEvent.getSource();
			var oDataPath, oTable;
			if (oSourceData.fromMatchDetails) {
				oDataPath = oSourceData.sPath;
			} else {
				while (!(oItemSource instanceof sap.m.ColumnListItem)) {
					oItemSource = oItemSource.getParent();
				}
				oDataPath = oItemSource.getBindingContextPath();
			}

			var viewModel = oController.getView().getModel("viewModel");
			var fromMatchTool = viewModel.getProperty("/matchDetails/fromMatchTool");
			var matchToolFromHeader = viewModel.getProperty("/matchToolFromHeader");
			var functionImport = oMetaModel.getODataFunctionImport(oSourceData.Action);
			var mainTableBindingInfo = viewModel.getProperty("/mainTableBindingInfo");
			var resultEntityName, entitySet, entityType;
			var urlParameters = {};

			if (fromMatchTool) {
				if (oModel.getProperty(oDataPath + "/mqlfr") !== "") {
					return;
				}
				oTable = oEvent.getSource().getParent().getParent();
				entitySet = oMetaModel.getODataEntitySet(oTable.getParent().getEntitySet());
				entityType = oMetaModel.getODataEntityType(entitySet.entityType);
				for (var i = 0; i < functionImport.parameter.length; i++) {
					if (functionImport.parameter[i].name === "_row_id") {
						urlParameters[functionImport.parameter[i].name] = oModel.getProperty(oDataPath + "/row_id");
					} else {
						urlParameters[functionImport.parameter[i].name] = oModel.getProperty(oDataPath + functionImport.parameter[i].name);
					}
				}
				if (entityType["vui.bodc.workspace.ManualMatch"]) {
					urlParameters["manualMatch"] = "X";
				}

			} else {
				resultEntityName = viewModel.getProperty("/matchDetails/resultEntityName");

				if (viewModel.getProperty(oDataPath + "/mqlfr") !== "") {
					return;
				}

				for (var i = 0; i < functionImport.parameter.length; i++) {
					if (functionImport.parameter[i].name === "_row_id") {
						urlParameters[functionImport.parameter[i].name] = viewModel.getProperty(oDataPath + "/row_id");
					} else {
						urlParameters[functionImport.parameter[i].name] = viewModel.getProperty(oDataPath + functionImport.parameter[i].name);
					}
				}
			}
			viewModel.setProperty("/modelChanged", true);
			// confirmation popup changes nav from launchpad
			if (parent && parent.commonUtils && parent.commonUtils.dataChanged) {
				parent.commonUtils.dataChanged = true;
			}
			// confirmation popup changes nav from launchpad
			//			sap.ui.core.BusyIndicator.show(0);

			oModel.callFunction("/" + oSourceData.Action, {
				method: "POST",
				batchGroupId: "changes",
				urlParameters: urlParameters,
			});

			oModel.submitChanges({
				batchGroupId: "changes",
				success: function (oData, response) {
					oController.showMessagePopover(oController.messageButtonId);
					//					**** Patch 11 - For Header update call is required as sometimes snapping
					//					header value will also get change by changing any item data
					if (viewModel.getProperty("/currentRoute") == 'DetailDetail') {
						var sPath;
						if (oController.getView().getContent()[0].getContent()[viewModel.getProperty("/currentDetailPageLevel")]) {
							sPath = oController.getView().getContent()[0].getContent()[viewModel.getProperty("/currentDetailPageLevel")].getBindingContext().getPath();
						} else {
							sPath = oController.getView().getContent()[0].getContent()[0].getBindingContext().getPath();
						}
						var entitySet = sPath.split("/")[sPath.split("/").length - 1].split("(")[0];
						oController.readPath(entitySet, sPath);
					}
					//					****
					if (fromMatchTool) {
						oTable.getBinding("items").refresh();
						//						oTable.getBindingInfo("items").parameters.select =
						//						oTable.getBindingInfo("items").parameters.select + ",mqlfr";
						//						oTable.getBindingInfo("items").binding.refresh();

					} else {
						oModel.read("/" + resultEntityName, {
							urlParameters: oController.readQueryPrepare(resultEntityName),
							success: function (oData, response) {
								viewModel.setProperty("/matchDetails/matchResults", oData.results);
							}
						});
					}
					//					mainTableBindingInfo.binding.refresh();
					if (matchToolFromHeader) {
						oController.refreshTableEntitiesData();
						//							Manual Correction Changes - start
					} else if (oController.adjustmentFlow && oController.mainTableIndicesForDsc) {
						viewModel.setProperty("/correction_line_table_indices", oController.mainTableIndicesForDsc);
						if (selectedSegmenetedButton) {
							viewModel.setProperty("/selectedSegmenetedButton", selectedSegmenetedButton);
						}
						viewModel.setProperty("/matchResultActionPerformed", true);
						mainTableBindingInfo.binding.refresh();
					} else if (oController.mainTableParametersForDsc) {
						var entitySet = mainTableBindingInfo.binding.getPath();
						entitySet = entitySet.split("to_")[1];
						var updatedRowidEntitySet = oMetaModel.getODataEntitySet("Updated_Rowid");
						if (updatedRowidEntitySet) {
							var sPath = "/Updated_Rowid";
							oModel.read(sPath, {
								urlParameters: oController.readQueryPrepare("Updated_Rowid"),
								success: function (oData, response) {
									var urlParameters = oController.mainTableParametersForDsc;
									if (oData && oData.results && oData.results[0] && oData.results[0].upd_rowid) {
										var rowids = oData.results[0].upd_rowid;
										urlParameters.row_id = rowids;
									} else {
										urlParameters.row_id = urlParameters._row_id;
									}
									var sPath;
									if (oController.DSCSourcePath) {
										sPath = oController.DSCSourcePath;
									} else {
										sPath = "/" + entitySet;
									}
									oModel.read(sPath, {
										urlParameters: _.extend(urlParameters, oController.readQueryPrepare(entitySet))
									});
								}
							});


							viewModel.setProperty(
								"/correction_line_table_indices",
								tableIndicesForDsc
							);
							//								Manual Correction Changes - end
							if (selectedSegmenetedButton) {
								viewModel.setProperty(
									"/selectedSegmenetedButton",
									selectedSegmenetedButton
								);
							}
							viewModel.setProperty("/matchResultActionPerformed", true);

						} else {
							var urlParameters = oController.mainTableParametersForDsc;
							urlParameters.row_id = urlParameters._row_id;
							var sPath;
							if (oController.DSCSourcePath) {
								sPath = oController.DSCSourcePath;
							} else {
								sPath = "/" + entitySet;
							}
							oModel.read(sPath, {
								urlParameters: _.extend(urlParameters, oController.readQueryPrepare(entitySet))
							});
						}
					} else {
						mainTableBindingInfo.binding.refresh();
					}
					//					sap.ui.core.BusyIndicator.hide();
				},
				error: function (oData, response) {
					oController.showMessagePopover(oController.messageButtonId);
					sap.ui.core.BusyIndicator.hide();
				}
			});
		},
		/*
		 * onManualMatchResultAction: function(oEvent){ var oController = this; var
		 * oModel = oController.getView().getModel(); var oMetaModel =
		 * oModel.getMetaModel(); var viewModel =
		 * oController.getView().getModel("viewModel"); var oSourceData =
		 * oEvent.getSource().data(); var oDataPath =
		 * oEvent.getSource().getParent().getBindingContextPath(); var functionImport =
		 * oMetaModel.getODataFunctionImport(oSourceData.Action); var
		 * mainTableBindingInfo = viewModel.getProperty("/mainTableBindingInfo"); var
		 * oTable = oEvent.getSource().getParent().getParent(); var urlParameters = {};
		 * 
		 * for(var i=0; i<functionImport.parameter.length; i++){
		 * if(functionImport.parameter[i].name === "_row_id"){
		 * urlParameters[functionImport.parameter[i].name] =
		 * oModel.getProperty(oDataPath + "/row_id"); }else{
		 * urlParameters[functionImport.parameter[i].name] =
		 * oModel.getProperty(oDataPath + functionImport.parameter[i].name); } }
		 * 
		 * oModel.callFunction("/" + oSourceData.Action, { method: "POST", batchGroupId:
		 * "changes", urlParameters: urlParameters, });
		 * 
		 * oModel.submitChanges({ batchGroupId: "changes", success :
		 * function(oData,response) { mainTableBindingInfo.binding.refresh();
		 * oTable.getBinding("items").refresh() }, error : function(oData,response){ }
		 * }); },
		 */
		// ***** functions related to visual filter bar and visual filter dialog
		// --- start

		onLineChartpress: function (oEvent) {
			var oController = this;
			oController.handleFilterBarItemsTokens(oEvent, "point");
		},

		onBarChartpress: function (oEvent) {
			var oController = this;
			oController.handleFilterBarItemsTokens(oEvent, "bar");
		},

		onDonutChartpress: function (oEvent) {
			var oController = this;
			oController.handleFilterBarItemsTokens(oEvent, "segment");
		},

		handleFilterBarItemsTokens: function (oEvent, microChartType) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var VFModel = oController.getView().getModel("VFModel");
			if (!VFModel) return;
			var oSource = oEvent.getSource();
			var filterId = oSource.data("filterId");
			var selectedPath = oEvent.getSource().getBindingContext("VFModel").getPath();
			var characteristic = VFModel.getProperty(selectedPath).characteristic;
			var toEntity = VFModel.getProperty(selectedPath).fltent;
			var filterItemName = toEntity + "." + characteristic;
			var filterItem = oController.getView().byId(filterId)._getFilterItemByName(filterItemName).getControl();
			var selectedItemPath = oEvent.getParameter(microChartType).getBindingContext("VFModel").getPath();
			var selectedData = VFModel.getProperty(selectedItemPath);
			var selectedNode = VFModel.getProperty(selectedPath), filter_value;
			var childs = selectedNode.chartContent.child, selectAll = true;

			for (var i = 0; i < childs["length"]; i++) {
				var found = undefined, excludeFound = undefined;
				if (childs[i]["secondaryLabel"] != "_OTH") {
					if (childs[i]["selected"]) {
						found = _.find(filterItem.getTokens(), function (token) {
							return token.getKey() == childs[i]["secondaryLabel"];
						});
						if (!found) {
							filterItem.addToken(new sap.m.Token({
								key: childs[i].secondaryLabel,
								text: childs[i].secondaryLabel
							}));
						}
						excludeFound = _.find(filterItem.getTokens(), function (token) {
							return token.getKey() == "!(=" + childs[i]["secondaryLabel"] + ")";
						});
						if (excludeFound) {
							filterItem.removeToken(excludeFound);
						}
					} else {
						found = _.find(filterItem.getTokens(), function (token) {
							return token.getKey() == childs[i]["secondaryLabel"];
						});
						if (found) {
							filterItem.removeToken(found);
						}
						if (childs[childs["length"] - 1]["selected"] && childs[childs["length"] - 1]["secondaryLabel"] == "_OTH") {
							excludeFound = _.find(filterItem.getTokens(), function (token) {
								return token.getKey() == "!(=" + childs[i]["secondaryLabel"] + ")";
							});
							if (!excludeFound) {
								filterItem.addToken(new sap.m.Token({
									key: "!(=" + childs[i].secondaryLabel + ")",
									text: "!(=" + childs[i].secondaryLabel + ")"
								}));
							}
						} else {
							excludeFound = _.find(filterItem.getTokens(), function (token) {
								return token.getKey() == "!(=" + childs[i]["secondaryLabel"] + ")";
							});
							if (excludeFound) {
								filterItem.removeToken(excludeFound);
							}
						}
					}
				}
				//				else{
				//				excludeFound = _.find(filterItem.getTokens(),function(token){
				//				return token.getKey() == "!(=" + childs[i]["secondaryLabel"] + ")";
				//				});
				//				if(excludeFound){
				//				filterItem.removeToken(excludeFound);
				//				}
				//				}

			}
			if (childs[childs["length"] - 1]["secondaryLabel"] == "_OTH") {
				for (var i = 0; i < childs["length"]; i++) {
					if (!childs[i]["selected"]) {
						selectAll = false;
						break;
					}
				}
			} else {
				selectAll = false;
			}
			if (childs[childs["length"] - 1]["selected"] && selectAll) {
				filterItem.removeAllTokens();
				filterItem.addToken(new sap.m.Token({
					key: "*",
					text: "*"
				}));
			} else {
				var selectAllToken = _.find(filterItem.getTokens(), function (token) {
					return token.getKey() == "*";
				});
				if (selectAllToken) {
					filterItem.removeToken(selectAllToken);
				}
			}

			if (oEvent.getParameter("selected")) {
				//				filterItem.addToken(new sap.m.Token({
				//				key: selectedData.secondaryLabel,
				//				text: selectedData.secondaryLabel
				//				}));
				if (selectedData["secondaryLabel"] == "_OTH") {
					for (var i = 0; i < childs["length"] - 1; i++) {
						if (!childs[i]["selected"]) {
							if (filter_value) {
								filter_value = filter_value + "and" + selectedNode["fltent"] + "." + selectedNode["characteristic"] + " NE " + childs[i]["secondaryLabel"];
							} else {
								filter_value = selectedNode["fltent"] + "." + selectedNode["characteristic"] + " NE " + childs[i]["secondaryLabel"];
							}
						}
					}
				} else {
					filter_value = selectedNode["fltent"] + "." + selectedNode["characteristic"] + " EQ " + selectedData["secondaryLabel"];
				}
			} else {
				//				var tokenId = "";
				//				for(var i = 0; i < filterItem.getTokens()["length"]; i++){
				//				if(filterItem.getTokens()[i].getKey() == selectedData.secondaryLabel){
				//				tokenId = filterItem.getTokens()[i].getId();
				//				break;
				//				}
				//				}
				//				filterItem.removeToken(tokenId);
				filter_value = "";
			}
			oController.byId(filterId).getVariantManagement().currentVariantSetModified(true);
			filterItem.fireTokenUpdate();
			var count = filterItem.getTokens()["length"], buttonText;
			if (count > 0) {
				buttonText = "(" + JSON.stringify(count) + ")";
			} else {
				buttonText = "";
			}
			VFModel.setProperty(selectedPath + "/count", buttonText);
			var filterData = VFModel.getProperty("/VFData");
			filterData = _.toArray(filterData);
			var url = "/CHART_DATA";
			var referenceData = [];
			for (var i = 0; i < filterData["length"]; i++) {

				if (filterData[i] != selectedNode && filterData[i]["fetched"]) {

					var urlParameters = {};
					urlParameters["wstyp"] = window.workspaceType;
					urlParameters["wspvw"] = window.workspaceView;
					urlParameters["charcs"] = filterData[i].characteristic;
					urlParameters["charcs_darea"] = filterData[i].fltent;
					urlParameters["keyfig"] = filterData[i]["measureBy"]["selected"];
					urlParameters["keyfig_darea"] = filterData[i].keyfigent;
					urlParameters["fltr_value"] = filter_value;
					urlParameters["sort_order"] = filterData[i]["sortOrder"];
					urlParameters["plttp"] = filterData[i]["defaultChart"];
					referenceData.push({ "charcs": filterData[i].characteristic, "index": i });
					oModel.read(url, {
						urlParameters: urlParameters,
						success: function (oData, response) {
							var chartData = [];
							var index;
							_.each(oData.results, function (object) {
								index = _.find(referenceData, { "charcs": object["charcs"].toLowerCase() })["index"];
								var chartContent = {}, alreadyExisted = undefined;
								chartContent = {
									"value": parseInt(object["orig_val"]),
									"label": object["label"],
									"secondaryLabel": object["value"],
									"displayedValue": object["disp_val"],
									"selected": false
								};
								alreadyExisted = _.find(filterData[index]["chartContent"]["child"], { "secondaryLabel": chartContent["secondaryLabel"] });
								if (alreadyExisted) {
									chartContent["selected"] = alreadyExisted["selected"];
								}
								chartData.push(chartContent);
							});
							if (chartData["length"] > 0) {
								//								VFDialogModel.setProperty(selectedPath +
								//								"/chartContent/chartType",filterData[i]["defaultChart"]);
								VFModel.setProperty("/VFData/" + index + "/chartContent/child", chartData);
								//								VFDialogModel.setProperty(selectedPath + "/fetched",true);
							}
						},
						error: function (oData, response) {

						}
					});
				}
			}
		},

		onChartSortPopup: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var VFModel = oController.getView().getModel("VFModel");
			if (!VFModel) return;
			var VFDialogModel = oController.getView().getModel("VFDialogModel");
			var oSource = oEvent.getSource();
			var filterId = oSource.getParent().getParent().getParent().getParent().getParent().getParent().getParent().data("filterId");
			var filterBar = oController.getView().byId(filterId);
			var filterEntity = filterBar.getEntitySet();
			var filterEntitySet = oMetaModel.getODataEntitySet(filterEntity);
			var filterEntityType = oMetaModel.getODataEntityType(filterEntitySet.entityType);
			var bundle = oController.getView().getModel("i18n").getResourceBundle();
			var selectedRow = oSource.getParent().getParent().getParent();
			var selectedRowPath = selectedRow.getBindingContext("VFDialogModel").getPath();
			var selectedRowData = VFDialogModel.getProperty(selectedRowPath);
			var sortPopover = new sap.m.Popover({
				title: bundle.getText("SORTPOPOVERTITLE"),
				placement: "PreferredBottomOrFlip"
			}).addStyleClass("sapUiPopupWithPadding");
			var oList = new sap.m.List({
				mode: "SingleSelectLeft",
				includeItemInSelection: true,
				items: [
					new sap.m.StandardListItem({
						title: bundle.getText("ASCENDING"),
						icon: "sap-icon://sort-ascending"
					}).data("id", "ASC"),
					new sap.m.StandardListItem({
						title: bundle.getText("DESCENDING"),
						icon: "sap-icon://sort-descending"
					}).data("id", "DESC")
				]
			});
			oList.data("button", oSource);
			oList.addStyleClass("sapUiSizeCompact");
			var selectItem = _.find(oList.getItems(), function (item) {
				return item.data("id") == selectedRowData["sortOrder"];
			});
			if (selectItem) {
				oList.setSelectedItem(selectItem, true);
			}
			sortPopover.addContent(oList);
			var filterData = VFModel.getProperty("/VFData");
			oList.attachSelectionChange(function (oEvent) {
				var button = oEvent.getSource().data("button");
				var id = oEvent.getParameter("listItem").data("id"), sortOrder;
				if (selectedRowData["chartContent"]["child"].length > 0) {
					if (id == "DESC") {
						button.setIcon("sap-icon://sort-descending");
						sortOrder = "desc";
					} else {
						button.setIcon("sap-icon://sort-ascending");
						sortOrder = "asc";
					}
					if (selectedRowData.measureBy.selected) {
						var toEntity = oMetaModel.getODataAssociationEnd(filterEntityType, selectedRowData.fltent);
						var toEntityType = oMetaModel.getODataEntityType(toEntity.type);
						var keyfigProperty = _.find(toEntityType.property, { name: selectedRowData.measureBy.selected });
						var unitsFilterItem = filterBar._getFilterItemByName(selectedRowData["fltent"] + "." + keyfigProperty["sap:unit"]);
						if (unitsFilterItem.getControl().getTokens()["length"] == 1) {
							var filter_value = selectedRowData["fltent"] + "." + selectedRowData["characteristic"] + " EQ " + unitsFilterItem.getControl().getTokens()[0].getKey();
							var url = "/CHART_DATA";
							var urlParameters = {};
							urlParameters["wstyp"] = window.workspaceType;
							urlParameters["wspvw"] = window.workspaceView;
							urlParameters["charcs"] = selectedRowData.characteristic;
							urlParameters["charcs_darea"] = selectedRowData.fltent;
							urlParameters["keyfig"] = selectedRowData.measureBy.selected;
							urlParameters["keyfig_darea"] = selectedRowData.keyfigent;
							urlParameters["sort_order"] = sortOrder;
							urlParameters["plttp"] = selectedRowData.defaultChart;
							urlParameters["fltr_value"] = filter_value;
							oModel.read(url, {
								urlParameters: urlParameters,
								success: function (oData, response) {
									var chartData = [];
									_.each(oData.results, function (object) {
										var chartContent = {}, alreadyExisted = undefined;
										chartContent = {
											"value": parseInt(object["orig_val"]),
											"label": object["label"],
											"secondaryLabel": object["value"],
											"displayedValue": object["disp_val"],
											"selected": false
										};
										alreadyExisted = _.find(selectedRowData["chartContent"]["child"], { "secondaryLabel": chartContent["secondaryLabel"] });
										if (alreadyExisted) {
											chartContent["selected"] = alreadyExisted["selected"];
										}
										chartData.push(chartContent);
									});
									if (chartData["length"] > 0) {
										//										VFDialogModel.setProperty(selectedPath +
										//										"/chartContent/chartType",filterData[i]["defaultChart"]);
										VFDialogModel.setProperty(selectedRowPath + "/chartContent/child", chartData);
										//										VFDialogModel.setProperty(selectedPath + "/fetched",true);
									}
								},
								error: function (oData, response) {

								}
							});
						}
					}
					button.getCustomData()[0].setValue(id);
				}
				sortPopover.close();
			});
			sortPopover.attachAfterClose(function (oEvent) {
				var selectedItem = oEvent.getSource().getContent()[0].getSelectedItem();
				if (selectedItem) {
					VFDialogModel.setProperty(selectedRowPath + "/sortOrder", selectedItem.data("id"));
				}
				oEvent.getSource().destroy();
			});
			sortPopover.openBy(oSource);
		},

		onChartTypePopup: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var oSource = oEvent.getSource();
			var filterId = oSource.getParent().getParent().getParent().getParent().getParent().getParent().getParent().data("filterId");
			var filterBar = oController.getView().byId(filterId);
			var filterEntity = filterBar.getEntitySet();
			var filterEntitySet = oMetaModel.getODataEntitySet(filterEntity);
			var filterEntityType = oMetaModel.getODataEntityType(filterEntitySet.entityType);
			var VFModel = oController.getView().getModel("VFModel");
			if (!VFModel) return;
			var VFDialogModel = oController.getView().getModel("VFDialogModel");
			var bundle = oController.getView().getModel("i18n").getResourceBundle();
			var sortPopover = new sap.m.Popover({
				title: bundle.getText("CHARTTYPEPOPOVERTITLE"),
				placement: "PreferredBottomOrFlip"
			}).addStyleClass("sapUiPopupWithPadding");
			var oList = new sap.m.List({
				mode: "SingleSelectLeft",
				includeItemInSelection: true,
				items: [
					new sap.m.StandardListItem({
						title: bundle.getText("LINECHART"),
						icon: "sap-icon://line-charts"
					}).data("id", "LINE"),
					new sap.m.StandardListItem({
						title: bundle.getText("BARCHART"),
						icon: "sap-icon://horizontal-bar-chart"
					}).data("id", "BAR"),
					new sap.m.StandardListItem({
						title: bundle.getText("DONUTCHART"),
						icon: "sap-icon://donut-chart"
					}).data("id", "DONUT")
				]
			});
			var selectedRow = oSource.getParent().getParent().getParent();
			var selectedRowPath = selectedRow.getBindingContext("VFDialogModel").getPath();
			var selectedRowData = VFDialogModel.getProperty(selectedRowPath);
			oList.data("button", oSource);
			oList.addStyleClass("sapUiSizeCompact");
			var selectItem = _.find(oList.getItems(), function (item) {
				return item.data("id") == selectedRowData["defaultChart"];
			});
			if (selectItem) {
				oList.setSelectedItem(selectItem, true);
			}
			sortPopover.addContent(oList);
			oList.attachSelectionChange(function (oEvent) {
				var button = oEvent.getSource().data("button");
				var id = oEvent.getParameter("listItem").data("id");
				//				if (id == "BAR") {
				//				button.setIcon("sap-icon://horizontal-bar-chart");
				//				} else if(id == "LINE") {
				//				button.setIcon("sap-icon://line-charts");
				//				}else if(id == "DONUT"){
				//				button.setIcon("sap-icon://donut-chart");
				//				}
				VFDialogModel.setProperty(selectedRowPath + "/defaultChart", id);
				var toEntity = oMetaModel.getODataAssociationEnd(filterEntityType, selectedRowData.fltent);
				var toEntityType = oMetaModel.getODataEntityType(toEntity.type);
				var keyfigProperty = _.find(toEntityType.property, { name: selectedRowData.measureBy.selected });
				var unitsFilterItem = filterBar._getFilterItemByName(selectedRowData["fltent"] + "." + keyfigProperty["sap:unit"]);
				if (unitsFilterItem.getControl().getTokens()["length"] == 1) {
					var filter_value = selectedRowData["fltent"] + "." + selectedRowData["characteristic"] + " EQ " + unitsFilterItem.getControl().getTokens()[0].getKey();
					var url = "/CHART_DATA";
					var urlParameters = {};
					urlParameters["wstyp"] = window.workspaceType;
					urlParameters["wspvw"] = window.workspaceView;
					urlParameters["charcs"] = selectedRowData.characteristic;
					urlParameters["charcs_darea"] = selectedRowData.fltent;
					urlParameters["keyfig"] = selectedRowData.measureBy.selected;
					urlParameters["keyfig_darea"] = selectedRowData.keyfigent;
					urlParameters["sort_order"] = selectedRowData.sortOrder;
					urlParameters["plttp"] = id;
					urlParameters["fltr_value"] = filter_value;
					oModel.read(url, {
						urlParameters: urlParameters,
						success: function (oData, response) {
							var chartData = [];
							_.each(oData.results, function (object) {
								var chartContent = {}, alreadyExisted = undefined;
								chartContent = {
									"value": parseInt(object["orig_val"]),
									"label": object["label"],
									"secondaryLabel": object["value"],
									"displayedValue": object["disp_val"],
									"selected": false
								};
								alreadyExisted = _.find(selectedRowData["chartContent"]["child"], { "secondaryLabel": chartContent["secondaryLabel"] });
								if (alreadyExisted) {
									chartContent["selected"] = alreadyExisted["selected"];
								}
								chartData.push(chartContent);
							});
							if (chartData["length"] > 0) {
								VFDialogModel.setProperty(selectedRowPath + "/chartContent/chartType", id);
								VFDialogModel.setProperty(selectedRowPath + "/chartContent/child", chartData);
								VFDialogModel.setProperty(selectedRowPath + "/fetched", true);
							}
						},
						error: function (oData, response) {

						}
					});
				}
				if (selectedRowData["fetched"]) {
					VFDialogModel.setProperty(selectedRowPath + "/chartContent/chartType", id);
				}
				//				button.getCustomData()[0].setValue(id);
				sortPopover.close();
			});
			sortPopover.attachAfterClose(function (oEvent) {
				oEvent.getSource().destroy();
			});
			sortPopover.openBy(oSource);
		},

		onChartMeasurePopup: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var VFDialogModel = oController.getView().getModel("VFDialogModel");
			var oSource = oEvent.getSource();
			var bundle = oController.getView().getModel("i18n").getResourceBundle();
			var bindingPath = oSource.getParent().getParent().getBindingContext("VFDialogModel").getPath();
			var selectedData = VFDialogModel.getProperty(bindingPath);
			var filterId = oSource.getParent().getParent().getParent().getParent().getParent().getParent().getParent().data("filterId");
			var filterBar = oController.getView().byId(filterId);
			var filterEntity = filterBar.getEntitySet();
			var filterEntitySet = oMetaModel.getODataEntitySet(filterEntity);
			var filterEntityType = oMetaModel.getODataEntityType(filterEntitySet.entityType);
			var sortPopover = new sap.m.Popover({
				title: bundle.getText("MEASUREBY"),
				placement: "PreferredBottomOrFlip"
			}).addStyleClass("sapUiPopupWithPadding");
			var oList = new sap.m.List({
				mode: "SingleSelectLeft",
				includeItemInSelection: true
			}).addStyleClass("sapUiSizeCompact");
			oList.setModel(VFDialogModel);
			var oItemTemplate = new sap.m.StandardListItem({ title: "{text}" }).data("id", "{key}");
			oList.bindItems(bindingPath + "/measureBy/data", oItemTemplate);
			oList.data("button", oSource);
			sortPopover.addContent(oList);
			var selectItem = _.find(oList.getItems(), function (item) {
				return item.data("id") == selectedData["measureBy"]["selected"];
			});
			if (selectItem) {
				oList.setSelectedItem(selectItem, true);
			}
			oList.attachSelectionChange(function (oEvent) {
				var button = oEvent.getSource().data("button");
				var id = oEvent.getParameter("listItem").data("id");
				var sPath = oEvent.getParameter("listItem").getBindingContextPath();
				var selectedRecord = VFDialogModel.getProperty(sPath);
				var viewPath = oController.getView().getBindingContext().getPath();
				var toEntity = oMetaModel.getODataAssociationEnd(filterEntityType, selectedData.fltent);
				var toEntityType = oMetaModel.getODataEntityType(toEntity.type);
				var keyfigProperty = _.find(toEntityType.property, { name: selectedRecord.key });
				var unitsFilterItem = filterBar._getFilterItemByName(selectedData["fltent"] + "." + keyfigProperty["sap:unit"]);
				if (unitsFilterItem.getControl().getTokens()["length"] == 1) {
					var filter_value = selectedData["fltent"] + "." + selectedData["characteristic"] + " EQ " + unitsFilterItem.getControl().getTokens()[0].getKey();
					var url = "/CHART_DATA";
					var urlParameters = {};
					urlParameters["wstyp"] = window.workspaceType;
					urlParameters["wspvw"] = window.workspaceView;
					urlParameters["charcs"] = selectedData.characteristic;
					urlParameters["charcs_darea"] = selectedData.fltent;
					urlParameters["keyfig"] = selectedRecord.key;
					urlParameters["keyfig_darea"] = selectedData.keyfigent;
					urlParameters["sort_order"] = selectedData.sortOrder;
					urlParameters["plttp"] = selectedData.defaultChart;
					urlParameters["fltr_value"] = filter_value;
					oModel.read(url, {
						urlParameters: urlParameters,
						success: function (oData, response) {
							var chartData = [];
							_.each(oData.results, function (object) {
								chartData.push({
									"value": parseInt(object["orig_val"]),
									"label": object["label"],
									"secondaryLabel": object["value"],
									"displayedValue": object["disp_val"],
									"selected": false
								});
							});
							if (chartData["length"] > 0) {
								VFDialogModel.setProperty(bindingPath + "/chartContent/chartType", selectedData["defaultChart"]);
								VFDialogModel.setProperty(bindingPath + "/chartContent/child", chartData);
								VFDialogModel.setProperty(bindingPath + "/fetched", true);
							}
						},
						error: function (oData, response) {

						}
					});
				} else {
					VFDialogModel.setProperty(bindingPath + "/chartContent/chartType", "None");
					VFDialogModel.setProperty(bindingPath + "/fetched", true);
					unitsFilterItem.getControl().getCustomData()[1].setValue(selectedRecord.key);
				}
				sortPopover.close();
			});
			sortPopover.attachAfterClose(function (oEvent) {
				var selectedItem = oEvent.getSource().getContent()[0].getSelectedItem();
				if (selectedItem) {
					var title = VFDialogModel.getProperty(bindingPath + "/toolbarTitle").split(" by")[0] + " by " + selectedItem.getTitle();
					VFDialogModel.setProperty(bindingPath + "/toolbarTitle", title);
					VFDialogModel.setProperty(bindingPath + "/measureBy/selected", selectedItem.data("id"));
				}
				oEvent.getSource().destroy();
			});
			sortPopover.openBy(oSource);
		},

		onVFValueHelpPress: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oSource = oEvent.getSource();
			var characteristic = oSource.data("Characteristic");
			var toEntity = oSource.data("toEntity");
			var filterItemName = toEntity + "." + characteristic;
			var filterId = oSource.data("filterId");
			var bundle = oController.getView().getModel("i18n").getResourceBundle();
			var filterItem = oController.getView().byId(filterId)._getFilterItemByName(filterItemName).getControl();
			filterItem.fireValueHelpRequest();
		},

		onVFDialogValueHelpPress: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oSource = oEvent.getSource();
			var oDialog = oSource.getParent().getParent().getParent().getParent().getParent().getParent().getParent();
			var characteristic = oSource.data("Characteristic");
			var toEntity = oSource.data("toEntity");
			var filterItemName = toEntity + "." + characteristic;
			var filterId = oDialog.data("filterId");
			var filterItem = oController.getView().byId(filterId)._getFilterItemByName(filterItemName).getControl();
			filterItem.fireValueHelpRequest();
		},

		onFilterBarVariantSave: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var oSource = oEvent.getSource();
			var VFModel = oController.getView().getModel("VFModel");
			if (!VFModel) return;
			// Smart variant is not saving
			if (!VFDialogModel) {
				var VFData = {};
				VFModel.setProperty("/VFData", VFData);
				return;
			}
			var VFDialogModel = oController.getView().getModel("VFDialogModel");
			var functionImport = oModel.getMetaModel().getODataFunctionImport("VAR_SAVE");
			var urlParameters = {};
			urlParameters["wstyp"] = window.workspaceType;
			urlParameters["wspvw"] = window.workspaceView;
			urlParameters["vname"] = oSource._getVariantText();
			urlParameters["sectn"] = "";
			urlParameters["sumry"] = "";
			urlParameters["public"] = oSource._getSelectedItem().getProperty("global");
			if (viewModel.getProperty("/showDetailClose") == false) {
				urlParameters["sumry"] = window.workspaceSummary;
				urlParameters["sectn"] = oSource.getEntitySet();
			}
			if (VFModel.getProperty("/VFDialogOpen")) {
				var VFData = $.extend(true, {}, VFDialogModel.getProperty("/VFData"));
				VFModel.setProperty("/VFData", VFData);
			} else {
				var VFData = $.extend(true, {}, VFModel.getProperty("/VFData"));
			}
			urlParameters["string"] = JSON.stringify(VFData);

			if (functionImport) {
				oModel.callFunction("/VAR_SAVE", {
					method: "POST",
					urlParameters: urlParameters,
					success: function (oData, response) {
						console.log("Variant saved");
					},
					error: function (oData, response) {
						setTimeout(function () {
							oController.showMessagePopover(oController.messageButtonId);
						}, 1000);
					}
				});
			}
		},

		onFilterBarVariantSelect: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var oSource = oEvent.getSource();
			var VFModel = oController.getView().getModel("VFModel");
			if (!VFModel) return;
			if (oEvent.getParameter("key") !== "*standard*") {
				var VFDialogModel = oController.getView().getModel("VFDialogModel");
				var functionImport = oModel.getMetaModel().getODataFunctionImport("VAR_READ");
				var urlParameters = {};
				// Variant selection is not working
				var vname;
				if (oSource && oSource._getVariantText) {
					vname = oSource._getVariantText();
				}
				else {
					vname = oSource.getPresentVariantText();
				}
				// Variant selection is not working
				urlParameters["wstyp"] = window.workspaceType;
				urlParameters["wspvw"] = window.workspaceView;
				urlParameters["vname"] = oSource._getVariantText();
				urlParameters["sectn"] = "";
				urlParameters["sumry"] = "";
				// Variant selection is not working
				if (oSource._getSelectedItem && oSource._getSelectedItem()) {
					urlParameters["public"] = oSource._getSelectedItem().getProperty("global");
				}
				else {
					if (oSource.getSelectionKey) {
						urlParameters["public"] = oSource.getItemByKey(oSource.getSelectionKey()).getProperty("global");
					}
				}
				// Variant selection is not working
				if (viewModel.getProperty("/showDetailClose") == false) {
					urlParameters["sumry"] = window.workspaceSummary;
					urlParameters["sectn"] = oSource.getEntitySet();
				}

				if (functionImport) {
					oModel.callFunction("/VAR_READ", {
						method: "POST",
						urlParameters: urlParameters,
						success: function (oData, response) {
							if (oData.vf_data) {
								var VFData = JSON.parse(decodeURIComponent(oData.vf_data));
								if (VFData) {
									VFModel.setProperty("/VFData", VFData);
								}
							}
							if (viewModel.getProperty("/navigationFilterData")) {
								oController.setFilterBarInitialData(oSource);
							}
							console.log("Variant Read Successful");
						},
						error: function (oData, response) {
							setTimeout(function () {
								oController.showMessagePopover(oController.messageButtonId);
							}, 1000);
						}
					});
				}
			} else {
				var content = oEvent.getSource();
				while (!content.getHeaderContent) {
					content = content.getParent();
				}
				if (content.getHeaderContent) {
					var oFilterBar = content.getHeaderContent()[0].getContent()[0].getItems()[0];
					VFModel.setProperty("/VFData", $.extend(true, {}, VFModel.getProperty("/standardVariantVFData")));
					if (viewModel.getProperty("/navigationFilterData")) {
						oController.setFilterBarInitialData(oFilterBar);
					}
					// Variant selection is not working
					else {
						oFilterBar.fireSearch();

					}
					// Variant selection is not working
				}
			}
		},

		onFilterChange: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var VFModel = oController.getView().getModel("VFModel");
			if (!VFModel) return;
			var VFDialogModel = oController.getView().getModel("VFDialogModel");
			var oSource = oEvent.getSource();
			var section = oController.getView().getContent()[0].getContent()[0]._oCurrentTabSection;
			var dynamicSideContent = oController.getResponsiveSplitter(section.getSubSections()[0].getBlocks()[0].getContent()[0]);
			//			oController.onClosingDscSideContent(dynamicSideContent);
			if (oEvent.getParameters().getParameter) {
				var characteristic = oEvent.getParameters().getParameter("filterChangeReason");
				var filterItem = oEvent.getParameters().getSource(), count, filterData, selectedNode, selectedNodeIndex, buttonText;
			}
			viewModel.setProperty("/resetAnalyticalHeader", true); // for
			// refreshing
			// count of
			// analytical
			// Table
			// after
			// search
			// if(oController.popoverSection)
			// {
			// 	oController.popoverSection.unbindElement();
			// }
			if (characteristic) {
				setTimeout(function (mEvent) {
					filterData = VFModel.getProperty("/VFData");
					filterData = _.toArray(filterData);
					selectedNode = _.find(filterData, { "characteristic": characteristic.split(".")[1] });
					if (selectedNode) {
						selectedNodeIndex = _.indexOf(filterData, selectedNode);
						var childData = selectedNode["chartContent"]["child"];
						var selectAllToken = _.find(filterItem.getTokens(), function (token) {
							return token.getKey() == "*"
						});
						if (childData["length"] > 0) {
							if (!selectAllToken) {
								for (var i = 0; i < childData["length"]; i++) {
									if (childData[i]["secondaryLabel"] != "_OTH") {
										VFModel.setProperty("/VFData/" + selectedNodeIndex + "/chartContent/child/" + i + "/selected", false);
										for (var y = 0; y < filterItem.getTokens()["length"]; y++) {
											if (filterItem.getTokens()[y].getKey() == childData[i]["secondaryLabel"]) {
												VFModel.setProperty("/VFData/" + selectedNodeIndex + "/chartContent/child/" + i + "/selected", true);
												break;
											}
										}
									}
								}
							} else {
								for (var i = 0; i < childData["length"] - 1; i++) {
									VFModel.setProperty("/VFData/" + selectedNodeIndex + "/chartContent/child/" + i + "/selected", true);
								}
							}
						}
					}


					count = filterItem.getTokens()["length"];
					if (viewModel.getProperty("/filterTokenAddTriggered")) {
						viewModel.setProperty("/filterTokenAddTriggered", false);
					} else {
						//						count--;
					}
					if (count > 0) {
						buttonText = "(" + JSON.stringify(count) + ")";
					} else {
						buttonText = "";
					}
					VFModel.setProperty("/VFData/" + selectedNodeIndex + "/count", buttonText);
					if (VFDialogModel) {
						VFDialogModel.setProperty("/VFData/" + selectedNodeIndex + "/count", buttonText);
					}
				});
			} else {
				viewModel.setProperty("/filterTokenAddTriggered", true);
			}
			var functionImport = oModel.getMetaModel().getODataFunctionImport("Filter_Values_Get");
			var urlParameters = {};

			var filterData = {};
			for (var key in oEvent.getSource().getFilterData()) {
				var objKey;
				if (key.split(".")[1]) {
					objKey = key.split(".")[1];
				} else {
					objKey = key.split(".")[0];
				}
				filterData[objKey] = oEvent.getSource().getFilterData()[key];
			}

			urlParameters["filters"] = JSON.stringify(filterData);
			urlParameters["entity"] = oEvent.getSource().getEntitySet();

			if (functionImport) {
				oModel.callFunction("/" + functionImport.name, {
					method: "POST",
					batchGroupId: "filterChanges",
					urlParameters: urlParameters,
					success: function (oData, response) {
					},
					error: function (oData, response) {
						setTimeout(function () {
							oController.showMessagePopover(oController.messageButtonId);
						}, 1000);
					}
				});

				oModel.submitChanges({
					batchGroupId: "filterChanges",
				});
			}
		},
		onAssignedFiltersChanged: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var VFModel = oController.getView().getModel("VFModel");
			var VFDialogModel = oController.getView().getModel("VFDialogModel");
			var oSource = oEvent.getSource();
		},

		onFilterModeSegmentedButtonChange: function (oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			var key = oEvent.getParameter("item").getKey();
			var entityName = oEvent.getSource().data("entityName");
			viewModel.setProperty("/" + entityName + "filterMode", key);
		},
		onAdaptFilterPress: function (oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			var VFModel = oController.getView().getModel("VFModel");
			if (!VFModel) return;
			var VFDialogModel = new JSONModel();
			var VFData = $.extend(true, {}, VFModel.getProperty("/VFData"));
			VFDialogModel.setProperty("/VFData", VFData);
			var ValueHelpDialog = sap.ui.xmlfragment("vui.workspace.fragment.AdaptFiltersDialog", oController);
			ValueHelpDialog.attachAfterClose(function (oEvent) {
				oEvent.getSource().destroyContent();
				VFModel.setProperty("/VFDialogOpen", false);
			});
			ValueHelpDialog.setModel(VFDialogModel);
			oController.getView().setModel(VFDialogModel, "VFDialogModel");
			oController.getView().addDependent(ValueHelpDialog);
			ValueHelpDialog.addCustomData(new sap.ui.core.CustomData({ key: "filterId", value: oEvent.getSource().data("filterId") }));
			VFModel.setProperty("/VFDialogOpen", true);
			ValueHelpDialog.open();
		},
		onVisualFilterGoPress: function (oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var viewModel = oController.getView().getModel("viewModel");
			var filterId = oEvent.getSource().data("filterId");
			var filterBar = oController.getView().byId(filterId);
			filterBar.fireSearch();
		},
		onVFDialogSearch: function (oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var viewModel = oController.getView().getModel("viewModel");
			var VFModel = oController.getView().getModel("VFModel");
			var VFDialogModel = oController.getView().getModel("VFDialogModel");
			var source = oEvent.getSource();
			var aFilters = [];
			var sQuery = oEvent.getSource().getValue();
			if (sQuery && sQuery.length > 0) {
				var filter = new sap.ui.model.Filter("toolbarTitle", sap.ui.model.FilterOperator.Contains, sQuery);
				aFilters.push(filter);
			}
			var oDialog = source.getParent().getParent();
			var oBindngs = oDialog.getContent()[0].getItems()[0].getItems()[0].getBinding("content");
			oBindngs.filter(aFilters, "Application");
		},
		onAdaptFilterDialogCancelPress: function (oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var viewModel = oController.getView().getModel("viewModel");
			var VFModel = oController.getView().getModel("VFModel");
			var VFDialogModel = oController.getView().getModel("VFDialogModel");
			var source = oEvent.getSource();
			source.getParent().close()
		},
		onAdaptFilterDialogRestorePress: function (oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var viewModel = oController.getView().getModel("viewModel");
			var VFModel = oController.getView().getModel("VFModel");
			if (!VFModel) return;
			var VFDialogModel = oController.getView().getModel("VFDialogModel");
			var VFData = $.extend(true, {}, VFModel.getProperty("/VFData"));
			VFDialogModel.setProperty("/VFData", VFData);
		},
		onAdaptFilterDialogSavePress: function (oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var viewModel = oController.getView().getModel("viewModel");
			var source = oEvent.getSource();
			var VFModel = oController.getView().getModel("VFModel");
			var VFDialogModel = oController.getView().getModel("VFDialogModel");
			var filterId = source.getParent().data("filterId");
			var filterBar = oController.getView().byId(filterId);
			filterBar.showFilterDialog();
			oController.getView().byId(filterId).getVariantManagement().currentVariantSetModified(true);
			setTimeout(function () {
				filterBar._oFilterDialog.close()
				filterBar.getVariantManagement()._openSaveAsDialog();
			});

		},

		onAdaptFilterDialogGoPress: function (oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var viewModel = oController.getView().getModel("viewModel");
			var source = oEvent.getSource();
			var VFModel = oController.getView().getModel("VFModel");
			var VFDialogModel = oController.getView().getModel("VFDialogModel");
			VFModel.setProperty("/VFData", VFDialogModel.getProperty("/VFData"));
			source.getParent().close()
		},
		onFilterInitialized: function (oEvent) {
			var oController = this;
			var oSource = oEvent.getSource();
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var filterEntity = oSource.getEntitySet();
			var oEntitytype = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(filterEntity).entityType);

			if (oSource.getFilterGroupItems && oSource.getFilterGroupItems().length > 0) {
				for (var i = 0; i < oSource.getFilterGroupItems().length; i++) {
					var oControl = oSource.getFilterGroupItems()[i].getControl();
					if (oControl && oControl.setAutocomplete) {
						oControl.setAutocomplete(false);
					}
					if (oControl && oControl.setValueLiveUpdate) {
						oControl.setValueLiveUpdate(true);
					}
					var filterItemEntity = oSource.getFilterGroupItems()[i].getEntitySetName();
					var filterItemEntitytype = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(filterItemEntity).entityType);
					var filterItemname = oSource.getFilterGroupItems()[i].getName().split(".")[1];
					var filterItemProperty = oMetaModel.getODataProperty(filterItemEntitytype, filterItemname);
					if (filterItemProperty && !filterItemProperty["com.sap.vocabularies.Common.v1.ValueList"] && (filterItemProperty.type !== "Edm.DateTime")) {
						if (oControl.setShowValueHelp) {
							oControl.setShowValueHelp(true);
						}
					} else {
						oControl.attachValueHelpRequest(oController.onFilterValueHelpRequest.bind(oController));
					}
					if (oControl.setValueLiveUpdate) {
						oControl.setValueLiveUpdate(false);
					}
				}
			}
			// if (filterEntity == "WorkspaceView_SR") {
			// 	viewModel.setProperty("/filterBarInitialized", true)
			// 	if (viewModel.getProperty("/visualFilterInitialized") == "1") {
			// 		oController.initializeVisualFilter(oSource);
			// 	}
			// } else {
			// 	oController.initializeVisualFilter(oSource);
			// }
		},
		onFilterValueHelpRequest: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			viewModel.setProperty("/ValueHelpRequestedFieldID", oEvent.getSource().getId());
		},
		initializeVisualFilter: function (oFilterBar) {
			var oController = this;

			var oModel = oController.getView().getModel();
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var oSource = oFilterBar;
			var VFModel = oController.getView().getModel("VFModel");
			if (!VFModel) return;
			var filterEntity = oSource.getEntitySet();
			var filterEntitySet = oMetaModel.getODataEntitySet(filterEntity);
			var filterEntityType = oMetaModel.getODataEntityType(filterEntitySet.entityType);

			var VFData = [];
			var chartProp_url = "/CHART_PROP";
			var urlParameters = {};
			urlParameters["fltr_enty"] = filterEntity;
			urlParameters["wstyp"] = window.workspaceType;
			urlParameters["lytid"] = window.layoutId;
			oModel.read(chartProp_url, {
				urlParameters: urlParameters,
				batchGroupId: "changes",
				success: function (oData, response) {
					oData.results;
					_.each(oData.results, function (chartproperty) {
						var VFDataEntry = {};
						var characteristicEntity = oMetaModel.getODataAssociationEnd(filterEntityType, chartproperty["flt_ent"]);
						var characteristicEntityType = oMetaModel.getODataEntityType(characteristicEntity.type);
						var properties = characteristicEntityType.property;
						var chartpropertyDetails = _.find(properties, { name: chartproperty["charcs"].toLowerCase() });
						var cardTitle;
						if (chartpropertyDetails["com.sap.vocabularies.Common.v1.Label"]) {
							cardTitle = chartpropertyDetails["com.sap.vocabularies.Common.v1.Label"].String;
						} else {
							cardTitle = chartpropertyDetails["sap:label"];
						}
						var keyFigureEntityName = filterEntityType["vui.bodc.SummaryFieldKeyfigure"].find(function (path) {
							return path.PropertyPath.indexOf(chartproperty["keyfigure"])
						})["PropertyPath"].split("/")[0];
						var toEntity = oMetaModel.getODataAssociationEnd(filterEntityType, keyFigureEntityName);
						var toEntityType = oMetaModel.getODataEntityType(toEntity.type);
						var keyfigProperty = _.find(toEntityType.property, { name: chartproperty["keyfigure"].toLowerCase() });
						var keyfigUnit = _.find(toEntityType.property, { name: keyfigProperty["sap:unit"] });
						var keyFigureLabel;
						if (keyfigProperty["com.sap.vocabularies.Common.v1.Label"]) {
							keyFigureLabel = keyfigProperty["com.sap.vocabularies.Common.v1.Label"].String;
						} else {
							keyFigureLabel = keyfigProperty["sap:label"];
						}
						VFDataEntry["visible"] = true;
						VFDataEntry["fetched"] = false;
						VFDataEntry["toolbarTitle"] = cardTitle + " by " + keyFigureLabel;
						if (chartproperty["plttp"] == "") {
							chartproperty["plttp"] = "BAR";
						}
						VFDataEntry["defaultChart"] = chartproperty["plttp"];
						VFDataEntry["count"] = "";
						VFDataEntry["sortOrder"] = chartproperty["sort_order"];
						VFDataEntry["fltent"] = chartproperty["flt_ent"];
						VFDataEntry["keyfigent"] = keyFigureEntityName;
						VFDataEntry["characteristic"] = chartproperty["charcs"].toLowerCase();
						VFDataEntry["deflt"] = chartproperty["deflt"];
						VFDataEntry["position"] = chartproperty["vfpos"];
						var cardText;
						if (keyfigUnit) {
							cardText = "Refine filter to set single " + keyfigUnit["sap:label"];
						} else {
							VFDataEntry["no_unit"] = chartproperty["no_unit"];
							cardText = "Refine filter";
						}
						VFDataEntry["chartContent"] = {
							//								"chartType": chartproperty["plttp"],
							"chartType": "None",
							"text": cardText,
							"child": []
						}
						VFDataEntry["measureBy"] = {
							"selected": chartproperty["keyfigure"].toLowerCase(),
							"unit": keyfigProperty["sap:unit"],
							"data": []
						};
						_.each(filterEntityType["vui.bodc.SummaryFieldKeyfigure"], function (keyFigure) {
							var keyFieldData = keyFigure.PropertyPath.split("/");
							var keyFieldEntity = oMetaModel.getODataAssociationEnd(filterEntityType, keyFieldData[0]);
							var keyFieldEntityType = oMetaModel.getODataEntityType(keyFieldEntity.type);
							var keyFieldProperties = keyFieldEntityType.property;
							var listkeyField = _.find(keyFieldProperties, { name: keyFieldData[1] });
							var keyFigureLabel;
							if (listkeyField["com.sap.vocabularies.Common.v1.Label"]) {
								keyFigureLabel = listkeyField["com.sap.vocabularies.Common.v1.Label"].String;
							} else {
								keyFigureLabel = listkeyField["sap:label"];
							}
							VFDataEntry["measureBy"]["data"].push({
								"text": keyFigureLabel,
								"key": keyFieldData[1]
							});
						});
						VFData.push(VFDataEntry);
					});
					VFData = _.sortBy(VFData, "position");
					VFData = _.toArray(VFData);
					VFModel.setProperty("/VFData", VFData);
					VFModel.setProperty("/standardVariantVFData", $.extend(true, {}, VFData));
					var uniqueKeyfigures = [];
					var referenceData = [];
					for (var i = 0; i < VFData["length"]; i++) {
						if (VFData[i]["deflt"] == "X") {
							var keyFigureEntityName = filterEntityType["vui.bodc.SummaryFieldKeyfigure"].find(function (path) {
								return path.PropertyPath.indexOf(VFData[i].measureBy.selected)
							})["PropertyPath"].split("/")[0];
							var toEntity = oMetaModel.getODataAssociationEnd(filterEntityType, keyFigureEntityName);
							var toEntityType = oMetaModel.getODataEntityType(toEntity.type);
							var keyfigProperty = _.find(toEntityType.property, { name: VFData[i].measureBy.selected });
							var unitsFilterItem = oSource._getFilterItemByName(keyFigureEntityName + "." + keyfigProperty["sap:unit"]);
							if (unitsFilterItem) {
								if (!unitsFilterItem.getControl().data("name")) {
									unitsFilterItem.getControl().addCustomData(new sap.ui.core.CustomData({ key: "name", value: unitsFilterItem.getName() }));
								}
								if (!unitsFilterItem.getControl().data("keyFig")) {
									unitsFilterItem.getControl().addCustomData(new sap.ui.core.CustomData({ key: "keyFig", value: VFData[i].measureBy.selected }));
								}
								var kfFound = uniqueKeyfigures.find(function (kf) { return kf == keyFigureEntityName + "." + keyfigProperty["sap:unit"] });
								if (!kfFound) {
									unitsFilterItem.getControl().attachChange(oController.getVFNewData, oController);
									uniqueKeyfigures.push(keyFigureEntityName + "." + keyfigProperty["sap:unit"]);
								}
							} else {
								if (VFData[i]["no_unit"]) {
									var url = "/CHART_DATA";
									var urlParameters = {};
									urlParameters["wstyp"] = window.workspaceType;
									urlParameters["wspvw"] = window.workspaceView;
									urlParameters["charcs"] = VFData[i].characteristic;
									urlParameters["charcs_darea"] = VFData[i].fltent;
									urlParameters["keyfig"] = VFData[i].measureBy.selected;
									urlParameters["keyfig_darea"] = VFData[i].keyfigent;
									urlParameters["sort_order"] = VFData[i].sortOrder;
									urlParameters["plttp"] = VFData[i].defaultChart;
									referenceData.push({ "charcs": VFData[i].characteristic, "index": i });
									oModel.read(url, {
										urlParameters: urlParameters,
										success: function (oData, response) {
											var chartData = [], index;
											_.each(oData.results, function (object) {
												index = _.find(referenceData, { "charcs": object["charcs"].toLowerCase() })["index"];
												chartData.push({
													"value": parseInt(object["orig_val"]),
													"label": object["label"],
													"secondaryLabel": object["value"],
													"displayedValue": object["disp_val"],
													"selected": false
												});
											});
											if (chartData["length"] > 0) {
												VFModel.setProperty("/VFData/" + index + "/chartContent/chartType", VFData[index]["defaultChart"]);
												VFModel.setProperty("/VFData/" + index + "/chartContent/child", chartData);
												VFModel.setProperty("/VFData/" + index + "/fetched", true);
											}
										},
										error: function (oData, response) {

										}

									});
								}
							}
						}
					}

					if (viewModel.getProperty("/FilterVariantLoaded")) {
						viewModel.setProperty("/FilterVariantLoaded", false);
						oController.onVisualFilterVariantLoad(oFilterBar);
					} else {
						if (viewModel.getProperty("/navigationFilterData")) {
							oController.setFilterBarInitialData(oSource);
						}
					}
				},
				error: function (oData, response) {

				}
			});


			oModel.submitChanges({
				batchGroupId: "changes"
			});
			//			setTimeout(function(){
			//			var chartsData = VFModel.getProperty("/VFData");
			//			chartsData = _.toArray(chartsData);
			//			for(var i = 0; i < chartsData["length"]; i++){
			//			if(chartsData[i]["deflt"] == "X"){
			//			var toEntity =
			//			oMetaModel.getODataAssociationEnd(filterEntityType,chartsData[i].fltent);
			//			var toEntityType = oMetaModel.getODataEntityType(toEntity.type);
			//			var keyfigProperty =
			//			_.find(toEntityType.property,{name:chartsData[i].measureBy.selected});
			//			var unitsFilterItem = oSource._getFilterItemByName(chartsData[i]["fltent"] +
			//			"." + keyfigProperty["sap:unit"]);
			//			if(!unitsFilterItem.getControl().data("name")){
			//			unitsFilterItem.getControl().addCustomData(new
			//			sap.ui.core.CustomData({key:"name",value:unitsFilterItem.getName()}));
			//			}
			//			if(!unitsFilterItem.getControl().data("keyFig")){
			//			unitsFilterItem.getControl().addCustomData(new
			//			sap.ui.core.CustomData({key:"keyFig",value:chartsData[i].measureBy.selected}));
			//			}
			//			unitsFilterItem.getControl().attachChange(oController.getVFNewData,oController);
			//			}
			//			}
			//			},100);
		},

		getVFNewData: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var VFModel = oController.getView().getModel("VFModel");
			if (!VFModel) return;
			var referenceData = [];
			var oSource = oEvent.getSource();
			setTimeout(function () {
				var chartsData = VFModel.getProperty("/VFData");
				chartsData = _.toArray(chartsData);
				if (oSource.getTokens()["length"] == 1) {
					var tokenData;
					if (oSource.getTokens()[0].getKey()) {
						tokenData = oSource.data("name") + " EQ " + oSource.getTokens()[0].getKey();
					}
					else if (oSource.getTokens()[0].getProperty("text") &&
						oSource.getTokens()[0].getProperty("text").charAt(0) === "=") {
						tokenData = oSource.data("name") + " EQ " + oSource.getTokens()[0].getProperty("text").slice(1);
					} else {
						tokenData = oSource.data("name") + " EQ " + oSource.getTokens()[0].getKey();
					}
					for (var i = 0; i < chartsData["length"]; i++) {
						if (chartsData[i]["measureBy"]["selected"] == oSource.data("keyFig") && chartsData[i]["deflt"] == "X") {
							var url = "/CHART_DATA";
							var urlParameters = {};
							urlParameters["wstyp"] = window.workspaceType;
							urlParameters["wspvw"] = window.workspaceView;
							urlParameters["charcs"] = chartsData[i].characteristic;
							urlParameters["charcs_darea"] = chartsData[i].fltent;
							urlParameters["keyfig"] = chartsData[i].measureBy.selected;
							urlParameters["keyfig_darea"] = chartsData[i].keyfigent;
							urlParameters["sort_order"] = chartsData[i].sortOrder;
							urlParameters["plttp"] = chartsData[i].defaultChart;
							urlParameters["fltr_value"] = tokenData;
							referenceData.push({ "charcs": chartsData[i].characteristic, "index": i });
							oModel.read(url, {
								urlParameters: urlParameters,
								success: function (oData, response) {
									var chartData = [], index;
									_.each(oData.results, function (object) {
										index = _.find(referenceData, { "charcs": object["charcs"].toLowerCase() })["index"];
										chartData.push({
											"value": parseInt(object["orig_val"]),
											"label": object["label"],
											"secondaryLabel": object["value"],
											"displayedValue": object["disp_val"],
											"selected": false
										});
									});
									if (chartData["length"] > 0) {
										var defaultKeyfig = _.find(chartsData[index]["measureBy"]["data"], { key: chartsData[index]["measureBy"]["selected"] });
										var title = chartsData[index].toolbarTitle.split(" by")[0] + " by " + defaultKeyfig["text"];
										VFModel.setProperty("/VFData/" + index + "/toolbarTitle", title);
										VFModel.setProperty("/VFData/" + index + "/chartContent/chartType", chartsData[index]["defaultChart"]);
										VFModel.setProperty("/VFData/" + index + "/chartContent/child", chartData);
										VFModel.setProperty("/VFData/" + index + "/fetched", true);
									}
								},
								error: function (oData, response) {

								}
							});
						}
					}
				} else {
					for (var i = 0; i < chartsData["length"]; i++) {
						if (chartsData[i]["measureBy"]["selected"] == oSource.data("keyFig") && chartsData[i]["deflt"] == "X") {
							VFModel.setProperty("/VFData/" + i + "/chartContent/chartType", "None");
							VFModel.setProperty("/VFData/" + i + "/fetched", false);
						}
					}
				}
			});
		},
		onAfterFilterVariantLoad: function (oEvent) {
			var oController = this;
			var oSource = oEvent.getSource();
			var filterEntity = oSource.getEntitySet();
			var viewModel = oController.getView().getModel("viewModel");
			if (oSource.getVariantManagement()._getVariantText() == "standard") {
				return;
			}
			if (filterEntity == "WorkspaceView_SR") {
				viewModel.setProperty("/FilterVariantLoaded", true);
				if (viewModel.getProperty("/filterBarInitialized") &&
					viewModel.getProperty("/visualFilterInitialized") == "1") {
					oController.onVisualFilterVariantLoad(oSource);
				}
			} else {
				oController.onVisualFilterVariantLoad(oSource);
			}
		},

		onVisualFilterVariantLoad: function (oSource) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var VFModel = oController.getView().getModel("VFModel");
			if (!VFModel) return;
			var VFDialogModel = oController.getView().getModel("VFDialogModel");
			var functionImport = oModel.getMetaModel().getODataFunctionImport("VAR_READ");
			var urlParameters = {};

			urlParameters["wstyp"] = window.workspaceType;
			urlParameters["wspvw"] = window.workspaceView;
			urlParameters["vname"] = oSource.getVariantManagement()._getVariantText();
			urlParameters["sectn"] = "";
			urlParameters["sumry"] = "";
			urlParameters["public"] = oSource.getVariantManagement()._getSelectedItem().getProperty("global");
			if (viewModel.getProperty("/showDetailClose") == false) {
				urlParameters["sumry"] = window.workspaceSummary;
				urlParameters["sectn"] = oSource.getEntitySet();
			}

			if (functionImport) {
				//				viewModel.setProperty("/variantFetchedforVF",true);
				oModel.callFunction("/VAR_READ", {
					method: "POST",
					urlParameters: urlParameters,
					success: function (oData, response) {
						var VFData = JSON.parse(decodeURIComponent(oData.vf_data));
						if (VFData) {
							VFModel.setProperty("/VFData", VFData);
						}
						if (viewModel.getProperty("/navigationFilterData")) {
							oController.setFilterBarInitialData(oSource);
						}
						console.log("Variant Read Successful");
					},
					error: function (oData, response) {
						setTimeout(function () {
							oController.showMessagePopover(oController.messageButtonId);
						}, 1000);
					}
				});
			}
			//			_.each(chartsData,function(chartData){

			//			});
		},

		// ***** functions related to visual filter bar and visual filter dialog
		// --- end

		onDSCSegmentedButtonChange: function (oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var viewModel = oController.getView().getModel("viewModel");
			//** #164828 -> Approval Integration via Action code(GTM sync ) **start
			//			var selectedKey = oEvent.getSource().getKey();
			var selectedKey = oEvent.getParameter("selectedKey");
			//** #164828 -> Approval Integration via Action code(GTM sync ) **end
			//			Required Changes
			if (selectedKey !== "details") {
				var errorMessages = oController.checkErrorMessageExist(oModel);
				if (errorMessages) {
					sap.ui.core.BusyIndicator.hide();
					oController.showMessagePopover(oController.messageButtonId);
					return;
				}
			}
			//			
			//			var dynamicSideContent =
			//			oController.getDynamicSideContent(oEvent.getSource());
			var dynamicSideContent = oController.getResponsiveSplitter(oEvent.getSource());
			//			oController.DSCID = dynamicSideContent.getId();
			oController.DSCID = dynamicSideContent.content.getId();
			//			if(selectedKey === "details" || selectedKey === "codes"){
			//			dynamicSideContent.setEqualSplit(false);
			//			}else{
			//			dynamicSideContent.setEqualSplit(true);
			//			}

			//** #164828 -> Approval Integration via Action code(GTM sync ) **start
			var iconTabBar = sap.ui.getCore().byId(oController.DSCID + "::IconTab");
			//** #164828 -> Approval Integration via Action code(GTM sync ) **end
			//**     Hiding Splitter bar 
			var sideContentTable = oController.getView().byId(oController.DSCID + "::Table");
			if (!sideContentTable) {
				var sideContentTable = sap.ui.getCore().byId(oController.DSCID + "::Table");
			}
			if (!oController.sidePanelDSC.displayCodesInDetail) {
				sideContentTable.getParent().getParent().$().addClass("hideSplitterBar");
			}

			//**     Hiding Splitter bar 


			//** #164828 -> Approval Integration via Action code(GTM sync ) **start
			if (
				viewModel.getProperty("/selectedSegmenetedButton") &&
				viewModel.getProperty("/selectedSegmenetedButton") !==
				oEvent.getSource().getParent().getSelectedButton()
			) {
				viewModel.setProperty("/selectedSegmenetedButton", undefined);
			}
			if (!viewModel.getProperty("/matchResultActionPerformed")) {
				viewModel.setProperty(
					"/currentSegmentedButtonParams",
					oEvent.getParameters()
				);
			}
			//** #164828 -> Approval Integration via Action code(GTM sync ) **end
			// if (!viewModel.getProperty("/disp_only")) {
			// 	if ((selectedKey === "details" || selectedKey === "codes") && !oController.codesAllRowsLocked) {
			// 		dynamicSideContent.getSideContent()[0].getItems()[1].addStyleClass("vistex-display-none");
			// 	} else {
			// 		dynamicSideContent.getSideContent()[0].getItems()[1].removeStyleClass("vistex-display-none");
			// 	}
			// }

			if (selectedKey === "matchDialog") {
				if (oController._oMatchDialog) {
					oController._oMatchDialog.removeAllContent();
					delete oController._oMatchDialog;
				}
				oController._oMatchDialog = sap.ui.jsfragment("vui.workspace.fragment.MatchDialog", oController);
				oController.getView().addDependent(oController._oMatchDialog);
				oController._oMatchDialog.open();
			} else if (selectedKey === "match") {
				//				Making Apply Button Sticky changes
				//				dynamicSideContent.getSideContent()[0].getItems()[2]
				// if (dynamicSideContent.getSideContent()[0].getItems()[3].getContent()[0].getItems()[2].
				// 	getContent()[0].getItems()[0].getContent()[0].getItems()[1] instanceof sap.m.MenuButton) {
				// 	dynamicSideContent.getSideContent()[0].getItems()[3].getContent()[0].getItems()[2].
				// 		getContent()[0].getItems()[0].getContent()[0].getItems()[1].getMenu().getItems()[0].firePress();
				// } else if (dynamicSideContent.getSideContent()[0].getItems()[3].getContent()[0].getItems()[2].
				// 	getContent()[0].getItems()[0].getContent()[1].getItems()[1] instanceof sap.m.MenuButton) {
				// 	dynamicSideContent.getSideContent()[0].getItems()[3].getContent()[0].getItems()[2].
				// 		getContent()[0].getItems()[0].getContent()[1].getItems()[1].getMenu().getItems()[0].firePress();
				// }

				//** #164828 -> Approval Integration via Action code(GTM sync ) **start
				var matchPaths = viewModel.getProperty("/matchDetails/matchPaths");
				if (matchPaths && matchPaths.length > 0) {
					oController.matchPathSelect(oEvent.getParameter("selectedItem"));
				}
				//				if (oController.matchSectionContext && oController.matchSectionContext.matchPathPopup)
				//					oController.matchSectionContext.matchPathPopup.getContent()[0].getItems()[0].firePress();
				viewModel.setProperty("/DSCSegmentedButtonSelectedKey", selectedKey);
				//** #164828 -> Approval Integration via Action code(GTM sync ) **end
			} else if (selectedKey === "codes") {
				oController.onCodesSectionPrepare(oEvent);
				viewModel.setProperty("/DSCSegmentedButtonSelectedKey", selectedKey);
			}
			// Duplication Changes -- Start
			else if (selectedKey === "duplicates") {
				if (
					oController.duplicationSectionContext &&
					oController.duplicationSectionContext.duplicationPathPopup
				)
					oController.duplicationSectionContext.duplicationPathPopup
						.getContent()[0]
						.getItems()[0]
						.firePress();
				viewModel.setProperty("/DSCSegmentedButtonSelectedKey", selectedKey);
			}
			// Duplication Changes -- End
			else {
				viewModel.setProperty("/DSCSegmentedButtonSelectedKey", selectedKey);
			}
		},
		onManualMatchFilterInitialized: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var oSource = oEvent.getSource();
			var DSCSource = oModel.getProperty(oController.DSCSourcePath);
			var entitySet = oMetaModel.getODataEntitySet(oSource.getEntitySet());
			var entityType = oMetaModel.getODataEntityType(entitySet.entityType);
			var manualMatchMapping = entityType["vui.bodc.workspace.ManualMatchMapping"];
			var propertyPath, sourceField, targetField, filterData = {};
			for (var i = 0; i < manualMatchMapping.length; i++) {
				propertyPath = manualMatchMapping[i].PropertyPath.split("/");
				sourceField = propertyPath[1];
				targetField = propertyPath[3];
				filterData[targetField] = { value: null, ranges: [], items: [] };
				if (DSCSource[sourceField]) {
					filterData[targetField].ranges.push({
						exclude: false,
						operation: "EQ",
						value1: DSCSource[sourceField],
						keyField: targetField,
						tokenText: "=" + DSCSource[sourceField],
					});
				}
			}

			oEvent.getSource().setFilterData(filterData);
		},
		setFilterBarInitialData: function (oFilterBar) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			var filterEntity = oFilterBar.getEntitySet();
			var entityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(filterEntity).entityType);
			var selectionFields = entityType["com.sap.vocabularies.UI.v1.SelectionFields"];
			if (viewModel.getProperty("/navigationFilterData") && filterEntity == "WorkspaceView_SR") {
				var oNavigationFilterData = viewModel.getProperty("/navigationFilterData");
				var filterData = {};
				for (var key1 in oNavigationFilterData) {
					var key = key1.toLowerCase();
					var selectionField = selectionFields.find(function (prop) {
						return prop.PropertyPath.indexOf(key) !== -1
					});
					if (selectionField) {
						var path = selectionField.PropertyPath.replace("/", ".");
						for (var i = 0; i < oNavigationFilterData[key1].length; i++) {
							var oTokens = oFilterBar._getFilterItemByName(path).getControl().getTokens();
							if (oTokens && oTokens.length > 0) {
								var keyFound = false;
								for (var i = 0; i < oTokens.length; i++) {
									if (oTokens[i].getKey() == oNavigationFilterData[key1][i].value) {
										keyFound = true;
										break;
									}
								}
								if (!keyFound) {
									oFilterBar._getFilterItemByName(path).getControl().addToken(new sap.m.Token({
										key: oNavigationFilterData[key1][i].value,
										text: oNavigationFilterData[key1][i].value
									}));
								}
							} else {
								oFilterBar._getFilterItemByName(path).getControl().addToken(new sap.m.Token({
									key: oNavigationFilterData[key1][i].value,
									text: oNavigationFilterData[key1][i].value
								}));
							}
						}
						oFilterBar._getFilterItemByName(path).getControl().fireTokenUpdate();
					}
				}
			}
		},
		onCodeListSelectionChange: function (oEvent) {
			var oController = this;
			var itemPath = oEvent.getSource().getParent().getBindingContext("viewModel").getPath();
			var selected = oEvent.getParameter("selected");
			var data = oEvent.getSource().data();
			var viewModel = oController.getView().getModel("viewModel");
			var changedContext = viewModel.getProperty(itemPath);
			var itemsData = viewModel.getProperty("/bulkEditCode/" + data.entity + "/itemsData");
			if (selected && data.singleSelect) {
				for (var i in itemsData) {
					if (itemsData[i].row_id !== changedContext.row_id) {
						itemsData[i].seltd = false;
					}
				}
				viewModel.setProperty("/bulkEditCode/" + data.entity + "/itemsData", itemsData);
			}
			//	#164828 -> Approval Integration via Action code(GTM sync ) --Start
			oController.onBulkeditChanges(oEvent, true);
			//	#164828 -> Approval Integration via Action code(GTM sync ) --End
		},
		getTextArrangementForSmartControl: function (oField, oEntityType) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var sDataFieldValuePath = oField.Value.Path;
			var aProperties = oEntityType.property || [];
			var sDescriptionField, sTextArrangement;
			for (var i = 0; i < aProperties.length; i++) {
				if (sDataFieldValuePath === aProperties[i].name) {
					sDescriptionField = aProperties[i]["sap:text"];
					break;
				}
			}
			if (sDescriptionField) {
				sTextArrangement = "descriptionAndId";
				if (oMetaModel.getODataProperty(oEntityType, oField.Value.Path)) {
					var oPropertyTextModel = oMetaModel.getODataProperty(oEntityType, oField.Value.Path)["com.sap.vocabularies.Common.v1.Text"];
					// 1. check TextArrangement definition for property
					if (oPropertyTextModel && oPropertyTextModel["com.sap.vocabularies.UI.v1.TextArrangement"] && oPropertyTextModel["com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember) {
						sTextArrangement = zvui.work.controller.AnnotationHelper._mapTextArrangement4smartControl(
							oPropertyTextModel["com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember);
					}
				}
				// 2. check TextArrangement definition for entity type
				if (oEntityType["com.sap.vocabularies.UI.v1.TextArrangement"] && oEntityType["com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember) {
					sTextArrangement = zvui.work.controller.AnnotationHelper._mapTextArrangement4smartControl(
						oEntityType["com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember);
				}
				return sTextArrangement;
			} else {
				return "idOnly";
			}

			return sTextArrangement;
		},
		getItemValueByText: function (item, selectedRowData, oEntityType, fieldEnabled, selectedRow) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			if (fieldEnabled) {
				var oPropertyTextModel = oMetaModel.getODataProperty(oEntityType, item.Value.Path)["com.sap.vocabularies.Common.v1.Text"]
				if (oPropertyTextModel) {
					var sTextArrangement = oController.getTextArrangementForSmartControl(item, oEntityType);
					if (sTextArrangement && sTextArrangement !== "idOnly") {
						return oModel.getProperty(oPropertyTextModel.Path, selectedRow, true);
					}
				} else {
					return selectedRowData[item.Value.Path];
				}
			}
			return selectedRowData[item.Value.Path];
		},
		refreshTableEntitiesData: function () {
			var oController = this;
			var content, sections;
			var viewModel = oController.getView().getModel("viewModel");
			var currentRoute = viewModel.getProperty("/currentRoute");
			//			var appControl =
			//			oController.getOwnerComponent().getRootControl().byId("idAppControl");
			//			if(currentRoute == "DetailDetail"){
			//			if(appControl.getCurrentPage().getContent()[0].getContent()[viewModel.getProperty("/currentDetailPageLevel")]){
			//			content =
			//			appControl.getCurrentPage().getContent()[0].getContent()[viewModel.getProperty("/currentDetailPageLevel")];
			//			}else{
			//			content = appControl.getCurrentPage().getContent()[0].getContent()[0];
			//			}
			//			}else{
			//			content = appControl.getCurrentPage().getContent()[0];
			//			}
			var flexibleColumnLayout = oController.getOwnerComponent().getRootControl().byId("idAppControl");
			if (currentRoute == "DetailDetail") {
				if (flexibleColumnLayout.getCurrentMidColumnPage().getContent()[0].getContent()[viewModel.getProperty("/currentDetailPageLevel")]) {
					content = flexibleColumnLayout.getCurrentMidColumnPage().getContent()[0].getContent()[viewModel.getProperty("/currentDetailPageLevel")];
				} else {
					content = oController.getView().getContent()[0];
				}
			} else {
				content = oController.getView();
			}
			//			content = oController.getView();
			if (!content) return;
			while (!content.getSections) {
				content = content.getContent()[0];
			}
			var sections = content.getSections();
			for (var i = 0; i < sections.length; i++) {
				var oBlock = sections[i].getSubSections()[0].getBlocks()[0];
				var aContent = oBlock.getContent();
				for (var z = 0; z < aContent.length; z++) {
					var oControl = aContent[z];
					if (oController.isControlOfType(oControl, "sap/ui/layout/DynamicSideContent")) {
						var aMainContent = oControl.getMainContent();
						for (var y = 0; y < aMainContent.length; y++) {
							if (oController.isSmartTable(aMainContent[y])) {
								oController.refreshSmartTable(aMainContent[y]);
							}
						}
					} else if (oController.isControlOfType(oControl, "sap/ui/layout/ResponsiveSplitter")) {
						var aMainContent = oControl.getRootPaneContainer().getPanes()[0].getContent().getContent()[0].getContent();
						for (var y = 0; y < aMainContent.length; y++) {
							if (oController.isSmartTable(aMainContent[y])) {
								oController.refreshSmartTable(aMainContent[y]);
								if (!aMainContent[y].data("columnSelectAttached") && aMainContent[y].getTable().attachColumnSelect) {
									aMainContent[y].getTable().attachColumnSelect(oController.onTableColumnSelect.bind(oController));
									aMainContent[y].data("columnSelectAttached", true);
								}
							}
						}
					} else if (oController.isSmartTable(oControl)) {
						oController.refreshSmartTable(oControl);
						if (!oControl.data("columnSelectAttached") && oControl.getTable().attachColumnSelect) {
							oControl.getTable().attachColumnSelect(oController.onTableColumnSelect.bind(oController));
							oControl.data("columnSelectAttached", true);
						}
					}
				}
			}
			// 138624 - Changes for Performance Improvement During Save and
			// Refresh in Workspace - Started
			oController.refreshKPITagEntity();
			// 138624 - Changes for Performance Improvement During Save and
			// Refresh in Workspace - Ended
		},

		//			Manual Correction Changes - start
		onDSCAddCorrectionLines: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var sEntitySet = oEvent.getSource().data("entitySet");
			if (oEvent.getParameter("state")) {
				viewModel.setProperty("/addCorrectionLines" + sEntitySet, true);
			} else {
				viewModel.setProperty("/addCorrectionLines" + sEntitySet, false);
			}
		},
		//			Manual Correction Changes - end


		clearTableSelections: function (oContent, onlyCloseDSC) {
			var oController = this;
			var content = oContent;
			var viewModel = oController.getView().getModel("viewModel");
			var currentRoute = viewModel.getProperty("/currentRoute");
			//			var appControl =
			//			oController.getOwnerComponent().getRootControl().byId("idAppControl");
			//			if(currentRoute == "DetailDetail"){
			//			if(appControl.getCurrentPage().getContent()[0].getContent()[viewModel.getProperty("/currentDetailPageLevel")]){
			//			content =
			//			appControl.getCurrentPage().getContent()[0].getContent()[viewModel.getProperty("/currentDetailPageLevel")];
			//			}else{
			//			content = appControl.getCurrentPage().getContent()[0].getContent()[0];
			//			}
			//			}else{
			//			content = appControl.getCurrentPage().getContent()[0];
			//			}
			var flexibleColumnLayout = oController.getOwnerComponent().getRootControl().byId("idAppControl");
			if (currentRoute == "DetailDetail") {
				if (flexibleColumnLayout.getCurrentMidColumnPage().getContent()[0].getContent()[viewModel.getProperty("/currentDetailPageLevel")]) {
					content = flexibleColumnLayout.getCurrentMidColumnPage().getContent()[0].getContent()[viewModel.getProperty("/currentDetailPageLevel")];
				} else {
					content = oController.getView().getContent()[0];
				}
			} else {
				content = oController.getView();
			}
			if (!content) return;
			while (!content.getSections) {
				content = content.getContent()[0];
			}
			var sections = content.getSections();
			for (var i = 0; i < sections.length; i++) {
				var oBlock = sections[i].getSubSections()[0].getBlocks()[0];
				var aContent = oBlock.getContent();
				for (var z = 0; z < aContent.length; z++) {
					var oControl = aContent[z];
					if (oController.isControlOfType(oControl, "sap/ui/layout/DynamicSideContent")) {
						var aMainContent = oControl.getMainContent();
						for (var y = 0; y < aMainContent.length; y++) {
							if (oController.isSmartTable(aMainContent[y])) {
								if (!onlyCloseDSC) {
									if (aMainContent[y].getTable().getRows) {
										aMainContent[y].getTable().clearSelection();
									} else {
										aMainContent[y].getTable().removeSelections();
									}
								}
								oController.onClosingDscSideContent(oControl);
							}
						}
					} else if (oController.isControlOfType(oControl, "sap/ui/layout/ResponsiveSplitter")) {
						var aMainContent = oControl.getRootPaneContainer().getPanes()[0].getContent().getContent()[0].getContent();
						for (var y = 0; y < aMainContent.length; y++) {
							if (oController.isSmartTable(aMainContent[y])) {
								if (!onlyCloseDSC) {
									if (aMainContent[y].getTable().getRows) {
										aMainContent[y].getTable().clearSelection();
									} else {
										aMainContent[y].getTable().removeSelections();
									}
								}
								oController.onClosingDscSideContent(oControl);
							}
						}
					} else if (oController.isSmartTable(oControl)) {
						if (!onlyCloseDSC) {
							if (oControl.getTable().getRows) {
								oControl.getTable().clearSelection();
							} else {
								oControl.getTable().removeSelections();
							}
						}
					}
				}
			}
		},
		optimizedUpdateCalls: function (updatedEntityName, changedPath) {
			var oController = this;
			var oModel = oController.getView().getModel();
			if (oModel) {
				var oMetaModel = oModel.getMetaModel();
				if (!oMetaModel.getODataEntitySet(updatedEntityName)) {
					oModel = oController.getOwnerComponent().getModel();
				}
			}
			var oMetaModel = oModel.getMetaModel();
			var updatedRowidEntitySet = oMetaModel.getODataEntitySet("Updated_Rowid");
			if (updatedRowidEntitySet) {
				var sPath = "/Updated_Rowid";
				oModel.read(sPath, {
					urlParameters: oController.readQueryPrepare("Updated_Rowid"),
					success: function (oData, response) {
						if (oData && oData.results && oData.results[0] && oData.results[0].upd_rowid) {
							var rowids = oData.results[0].upd_rowid;
							oController.performUpdateCalls(updatedEntityName, changedPath, rowids);
						} else {
							oController.performUpdateCalls(updatedEntityName, changedPath);
						}
					}
				});
			} else {
				oController.performUpdateCalls(updatedEntityName, changedPath);
			}
		},
		performUpdateCalls: function (updatedEntityName, changedPath, upd_rowid) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			var urlParameters = {}, rowIDs = [], facetParentTable, selectedRows = [];
			var content, sections, showingSideContent;
			var currentRoute = viewModel.getProperty("/currentRoute");
			//			var appControl =
			//			oController.getOwnerComponent().getRootControl().byId("idAppControl");
			//			if(currentRoute == "DetailDetail"){
			//			if(appControl.getCurrentPage().getContent()[0].getContent()[viewModel.getProperty("/currentDetailPageLevel")]){
			//			content =
			//			appControl.getCurrentPage().getContent()[0].getContent()[viewModel.getProperty("/currentDetailPageLevel")]
			//			}else{
			//			content = appControl.getCurrentPage().getContent()[0].getContent()[0]
			//			}
			//			}else{
			//			content = appControl.getCurrentPage().getContent()[0];
			//			}
			var flexibleColumnLayout = oController.getOwnerComponent().getRootControl().byId("idAppControl");
			if (currentRoute == "DetailDetail") {
				if (flexibleColumnLayout.getCurrentMidColumnPage().getContent()[0].getContent()[viewModel.getProperty("/currentDetailPageLevel")]) {
					content = flexibleColumnLayout.getCurrentMidColumnPage().getContent()[0].getContent()[viewModel.getProperty("/currentDetailPageLevel")];
				} else {
					content = oController.getView().getContent()[0];
				}
			} else {
				content = oController.getView();
			}
			if (!content) return;
			while (!content.getSections) {
				content = content.getContent()[0];
			}
			var sections = content.getSections();
			var oEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(updatedEntityName).entityType);
			if (oEntityType["vui.bodc.workspace.CodesEditable"]) {
				facetParentTable = oController.getFacetParentTable(updatedEntityName);
			} else {
				facetParentTable = oController.getFacetParentTable(updatedEntityName, true);
				facetParentTable.setBusy(true);
				showingSideContent = viewModel.getProperty("/" + updatedEntityName + "showingSideContent");
				if (facetParentTable) {
					facetParentTable.s
					if (!showingSideContent) {
						oModel.read(changedPath, {
							_refresh: true,
							urlParameters: oController.readQueryPrepare(updatedEntityName),
							success: function () {
								facetParentTable.setBusy(false);
							}
						});
						//						oController.refreshSmartTable(facetParentTable);
						return;
					}
				} else if (!facetParentTable) {
					oModel.refresh();
				}
			}
			if (facetParentTable) {
				var facetParentTableEntityName = facetParentTable.getEntitySet();
				var oTable = facetParentTable.getTable();
				if (oTable.getSelectedIndices) {
					var selectedIndices = oTable.getSelectedIndices();
					_.each(selectedIndices, function (index) {
						selectedRows.push(oTable.getContextByIndex(index));
					});
				} else {
					var selectedItems = oTable.getSelectedItems();
					_.each(selectedItems, function (item) {
						selectedRows.push(item.getBindingContext());
					});
				}

				//				if(selectedRows.length > 1){
				//				_.each(selectedRows,function(context){
				//				if(context && context.getPath){
				//				var oContextData = oModel.getProperty(context.getPath());
				//				var rowId = oContextData.row_id;
				//				rowIDs.push(rowId);
				//				}
				//				});

				//				urlParameters["row_id"] = rowIDs.toString();
				//				oModel.read("/" + facetParentTableEntityName,{
				//				urlParameters: urlParameters,
				//				_refresh: true,
				//				});

				//				}else{
				//				var selectedPath = selectedRows[0].getPath();
				//				oModel.read(selectedPath,{
				//				_refresh: true
				//				});
				//				}
				if (selectedRows && selectedRows.length == 1 && !upd_rowid) {
					var selectedPath = selectedRows[0].getPath();
					var sEntitySet = facetParentTable.getEntitySet();
					var row_id = oModel.getProperty(selectedPath).row_id;
					//					Manual Correction Changes - start
					var correction_row_id;
					if (
						oController.correction_row_id &&
						oController.correction_row_id[sEntitySet] &&
						oController.correction_row_id[sEntitySet][row_id]
					) {
						correction_row_id =
							oController.correction_row_id[sEntitySet][row_id];
						var selectedPath1 = selectedPath.split("(")[0];
						selectedPath = selectedPath.split("(")[1].replace(row_id, correction_row_id);
						selectedPath = selectedPath1 + "(" + selectedPath;
					}
					//					Manual Correction Changes - end
					oModel.read(selectedPath, {
						_refresh: true,
						urlParameters: oController.readQueryPrepare(facetParentTableEntityName),
						success: function () {
							facetParentTable.setBusy(false);
						}
					});
				} else if (selectedRows) {
					var rowids = [];
					var sEntitySet = facetParentTable.getEntitySet();
					// Supressing Lase get Request 
					viewModel.setProperty("/facetParentTableEntity", sEntitySet);
					// Supressing Lase get Request
					for (var i = 0; i < selectedRows.length; i++) {
						if (selectedRows[i]) {
							var selectedPath = selectedRows[i].getPath();
							var row_id = oModel.getProperty(selectedPath).row_id;
							//							Manual Correction Changes - start
							var correction_row_id;
							if (
								oController.correction_row_id &&
								oController.correction_row_id[sEntitySet] &&
								oController.correction_row_id[sEntitySet][row_id]
							) {
								correction_row_id =
									oController.correction_row_id[sEntitySet][row_id];
							}
							if (correction_row_id) {
								rowids.push(correction_row_id);
							} else {
								rowids.push(row_id);
							}
							//							Manual Correction Changes - end
						}
					}
					urlParameters = oController.readQueryPrepare(facetParentTableEntityName);
					urlParameters["_row_id"] = rowids.toString();
					if (upd_rowid) {
						urlParameters["_row_id"] = urlParameters["_row_id"] + "," + upd_rowid;
					}
					oModel.read("/" + sEntitySet, {
						urlParameters: urlParameters,
						_refresh: true,
						success: function () {
							facetParentTable.setBusy(false);
						}
					});
				} else {
					oController.refreshSmartTable(facetParentTable);
				}
				//				oModel.invalidate();
				//				oModel.resetChanges();
				//				oController.refreshSmartTable(facetParentTable);
				//				oController.refreshSmartTable(facetParentTable);


				//	#164828 -> Approval Integration via Action code(GTM sync ) --Start
				if (oEntityType["vui.bodc.workspace.CodesEditable"] &&
					oEntityType["vui.bodc.workspace.DisplayCodesInDetail"]
				) {
					var oContent;
					if (!oController.sidePanelDSC) {
						if (
							oController.getView().getContent &&
							oController.getView().getContent()[0] &&
							oController.getView().getContent()[0].getContent &&
							oController.getView().getContent()[0].getContent()[0] &&
							oController.getView().getContent()[0].getContent()[0]
								.getController &&
							oController
								.getView()
								.getContent()[0]
								.getContent()[0]
								.getController().sidePanelDSC &&
							oController
								.getView()
								.getContent()[0]
								.getContent()[0]
								.getController().sidePanelDSC[updatedEntityName + "_popover"] &&
							oController
								.getView()
								.getContent()[0]
								.getContent()[0]
								.getController()
								.sidePanelDSC[
								updatedEntityName + "_popover"
							].content.getContent()[0]
						) {
							oContent = oController
								.getView()
								.getContent()[0]
								.getContent()[0]
								.getController().sidePanelDSC[
								updatedEntityName + "_popover"
							].content;
						}
					} else {
						oContent =
							oController.sidePanelDSC[updatedEntityName + "_popover"].content;
					}
					if (oContent.getContent()[0].getEntitySet) {
						oContent.getContent()[0].rebindList();
					} else if (
						oContent.getContent()[0].getBindingInfo &&
						oContent.getContent()[0].getBindingInfo("items") &&
						oContent.getContent()[0].getBindingInfo("items").binding &&
						oContent.getContent()[0].getBindingInfo("items").binding.refresh
					) {
						oContent.getContent()[0].getBindingInfo("items").binding.refresh();
					}
					var sourceId = oContent.data("sourceId");
					var inputElement = sap.ui.getCore().getElementById(sourceId);

					//		if codes entity is of single select type can we show it as like a dropdown field in stead of multi select
					if (!(oEntityType['vui.bodc.workspace.SingleSelect'].Bool)
					) {
						inputElement.getBindingInfo("tokens").binding.refresh();
					}
					else {
						inputElement.getBindingInfo("items").binding.refresh();

					}
					//		if codes entity is of single select type can we show it as like a dropdown field in stead of multi select		

				}
				//	#164828 -> Approval Integration via Action code(GTM sync ) --End
				else if (oEntityType["vui.bodc.workspace.CodesEditable"]) {
					//					var dynamicSideContent = oController.getDynamicSideContent(facetParentTable);
					var dynamicSideContent = oController.getResponsiveSplitter(facetParentTable);
					//					Making Apply Button Sticky changes			
					//					dynamicSideContent.getSideContent()[0].getItems()[2]
					// var codes = dynamicSideContent.getSideContent()[0].getItems()[0].getItems()[0].getItems().find(function (item) {
					// 	return item.getKey() == "codes";
					// }).getContent()[0].getItems();

					var codes = dynamicSideContent.getSideContent()[0].getItems()[0].getItems()[0].getItems().find(function (item) {
						return item.getKey() == "codes";
					}).getContent();

					for (var i = 0; i < codes.length; i++) {
						var items = codes[i] && codes[i].getItems();
						for (var j = 0; j < items.length; j++) {
							if (items[j].getEntitySet) {
								items[j].rebindList();
							} else if (
								items[j].getBindingInfo &&
								items[j].getBindingInfo("items") &&
								items[j].getBindingInfo("items").binding &&
								items[j].getBindingInfo("items").binding.refresh
							) {
								items[j].getBindingInfo("items").binding.refresh();
							}
						}

					}
				}
			}
		},
		getFacetParentTable: function (entityName, self) {
			var oController = this;
			var oModel = oController.getView().getModel();
			if (oModel) {
				var oMetaModel = oModel.getMetaModel();
				if (entityName && oMetaModel && oMetaModel.getODataEntitySet && !oMetaModel.getODataEntitySet(entityName) &&
					oController.getOwnerComponent && oController.getOwnerComponent() && oController.getOwnerComponent().getModel) {
					oModel = oController.getOwnerComponent().getModel();
				}
			}
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			var content, sections, tableEntityName, facetTableEntityName, facetParentTable;
			var currentRoute = viewModel.getProperty("/currentRoute");
			if (oController.getOwnerComponent()) {
				var flexibleColumnLayout = oController.getOwnerComponent().getRootControl().byId("idAppControl");
				if (currentRoute == "Detail") {
					content = oController.getView();
				} else if (currentRoute == "DetailDetail") {
					if (flexibleColumnLayout.getCurrentMidColumnPage) {
						if (flexibleColumnLayout.getCurrentMidColumnPage().getContent()[0].getContent()[viewModel.getProperty("/currentDetailPageLevel")]) {
							if (flexibleColumnLayout.getCurrentMidColumnPage().getContent()[0].getContent()[viewModel.getProperty("/currentDetailPageLevel")]) {
								content = flexibleColumnLayout.getCurrentMidColumnPage().getContent()[0].getContent()[viewModel.getProperty("/currentDetailPageLevel")];
							} else {
								content = flexibleColumnLayout.getCurrentMidColumnPage().getContent()[0].getContent()[0];
							}
						} else {
							content = flexibleColumnLayout.getCurrentMidColumnPage().getContent()[0].getContent()[0];
						}
					} else {
						content = flexibleColumnLayout.getCurrentPage().getContent()[0].getContent()[viewModel.getProperty("/currentDetailPageLevel")];
					}
				}
			}
			while (content && !content.getSections) {
				content = content.getContent()[0];
			}
			if (content) {
				var sections = content.getSections();
				for (var i = 0; i < sections.length; i++) {
					var oBlock = sections[i].getSubSections()[0].getBlocks()[0];
					var aContent = oBlock.getContent();
					for (var z = 0; z < aContent.length; z++) {
						if (facetTableEntityName) {
							break;
						}
						var oControl = aContent[z];
						if (oController.isControlOfType(oControl, "sap/ui/layout/DynamicSideContent")) {
							var aMainContent = oControl.getMainContent();
							for (var y = 0; y < aMainContent.length; y++) {
								if (oController.isSmartTable(aMainContent[y])) {
									tableEntityName = aMainContent[y].getEntitySet();
									var entityFound;
									if (self) {
										entityFound = tableEntityName == entityName;
									} else {
										var tableEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(tableEntityName).entityType);
										entityFound = oMetaModel.getODataAssociationEnd(tableEntityType, "to_" + entityName);
									}
									if (entityFound) {
										facetParentTable = aMainContent[y];
										facetTableEntityName = tableEntityName;
										break;
									}
								}
							}
						} else if (oController.isControlOfType(oControl, "sap/ui/layout/ResponsiveSplitter")) {
							var aMainContent = oControl.getRootPaneContainer().getPanes()[0].getContent().getContent()[0].getContent();
							for (var y = 0; y < aMainContent.length; y++) {
								if (oController.isSmartTable(aMainContent[y])) {
									tableEntityName = aMainContent[y].getEntitySet();
									var entityFound;
									if (self) {
										entityFound = tableEntityName == entityName;
									} else {
										var tableEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(tableEntityName).entityType);
										entityFound = oMetaModel.getODataAssociationEnd(tableEntityType, "to_" + entityName);
									}
									if (entityFound) {
										facetParentTable = aMainContent[y];
										facetTableEntityName = tableEntityName;
										break;
									}
								}
							}
						} else if (oController.isSmartTable(oControl)) {
							tableEntityName = oControl.getEntitySet();
							var entityFound;
							if (self) {
								entityFound = tableEntityName == entityName;
							} else {
								var tableEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(tableEntityName).entityType);
								entityFound = oMetaModel.getODataAssociationEnd(tableEntityType, "to_" + entityName);
							}
							if (entityFound) {
								facetParentTable = aMainContent[y];
								facetTableEntityName = tableEntityName;
								break;
							}
						}
					}
				}
			}

			return facetParentTable;
		},
		getKeyValue: function (sPath) {
			var oModel = this.getOwnerComponent().getModel("workspaceModel");
			if (!oModel) return;
			var path = sPath;
			if (!path.startsWith("/"))
				path = "/" + path;
			var oObject = oModel.getProperty(path);
			if (oObject) {
				var sEntitySet = path.substring(1, path.indexOf("("));
				var oMetaModel = oModel.getMetaModel();
				var oEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(sEntitySet).entityType);
				if (oEntityType && oEntityType["com.sap.vocabularies.UI.v1.HeaderInfo"]
					&& oEntityType["com.sap.vocabularies.UI.v1.HeaderInfo"].Title
					&& oEntityType["com.sap.vocabularies.UI.v1.HeaderInfo"].Title.Value
					&& oEntityType["com.sap.vocabularies.UI.v1.HeaderInfo"].Title.Value.Path) {
					return oObject[oEntityType["com.sap.vocabularies.UI.v1.HeaderInfo"].Title.Value.Path];
				}
			}
			return "";
		},

		onDrillDown: function (sEntitySet, oContext, oSmartTable, oSelected, summaryPath) {
			var oController = this;

			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			var sPath = oContext.getPath();
			var object = oContext.getObject();
			var modelChanged = viewModel.getProperty("/modelChanged");
			if (modelChanged) {
				viewModel.setProperty("/dataChangedInPreviousRoute", true);
			}
			viewModel.setProperty("/sectionPopover", { open: false });
			oModel.invalidateEntry(sPath);
			sPath = sPath.substr(1, sPath.length);

			var navigationPath = "";
			if (summaryPath) {
				navigationPath = summaryPath;
			} else {
				navigationPath = sPath;
			}

			var oRouter = oController.getOwnerComponent().getRouter();
			var previousHash = oRouter.getHashChanger().getHash();
			var aHash = previousHash.split('/')
			if (aHash.length > 2) {
				var sPreviousPath = aHash[2];
				if (sPreviousPath == navigationPath)
					return;
			}

			var functionImport = oMetaModel.getODataFunctionImport(sEntitySet + "_EXPAND");
			var urlParameters = {};
			urlParameters["_row_id"] = object.row_id;
			//			var dynamicSideContent = oController.getDynamicSideContent(oSmartTable);
			var dynamicSideContent = oController.getResponsiveSplitter(oSmartTable);
			var bundle = oController.getOwnerComponent().getModel("i18n").getResourceBundle();

			//			if(viewModel.getProperty("/currentRoute") == "DetailDetail" && modelChanged){
			//			MessageBox.confirm(bundle.getText('CHANGESLOSTCONTINUE'), {
			//			title: bundle.getText('CONFIRM'),
			//			actions: [MessageBox.Action.YES, MessageBox.Action.NO],
			//			onClose: function (oAction) {
			//			if (oAction == 'YES'){
			//			oController.onDiscard();
			//			setTimeout(function(){
			//			oController.onDrillDownProceed(oSmartTable, dynamicSideContent,
			//			navigationPath, functionImport, urlParameters, oContext, oSelected);
			//			},10);
			//			}else{

			//			}
			//			}
			//			});
			//			}else{
			oController.onDrillDownProceed(oSmartTable, dynamicSideContent, navigationPath, functionImport, urlParameters, oContext, oSelected);
			//			}

		},

		onDrillDownProceed: function (oSmartTable, dynamicSideContent, navigationPath, functionImport, urlParameters, oContext, oSelected) {
			var oController = this;

			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			var uiModel = oController.getView().getModel("ui");
			var oRouter = oController.getOwnerComponent().getRouter();
			var oTable = oSmartTable.getTable();

			//			if(oTable.setSelectedIndex) {
			//			oTable.setSelectedIndex(oSelected.getIndex());
			//			}else{
			//			// oTable.removeSelections()
			//			oTable.setSelectedItem(oSelected);
			//			}

			oModel.callFunction("/" + functionImport.name, {
				method: "POST",
				urlParameters: urlParameters,
				success: function (oData, response) {

					viewModel.setProperty("/nextUiState", 1);
					var oModel = oContext.getModel();
					//VHD#740535->Error as Workspace encountered internal server error on cal run post - Start
					var count;
					if (oSmartTable.getTable() instanceof sap.m.Table) {
						count = oSmartTable.getTable().getMaxItemsCount();
					} else if (oSmartTable.getTable() instanceof sap.ui.table.Table) {
						count = oSmartTable.getTable().getBinding("rows").getLength();
					}
					//VHD#740535->Error as Workspace encountered internal server error on cal run post - End
					var rowCount = count;
					viewModel.setProperty("/DetailPageMaxRows", rowCount);
					viewModel.setProperty("/disableBulkEdit", true);
					oController.onClosingDscSideContent(dynamicSideContent);
					oController.removenoBackHash();
					setTimeout(function () {
						var replaceNavPath = false;
						var currentRoute = viewModel.getProperty("/currentRoute");
						//						if(currentRoute == "DetailDetail" || currentRoute == "BeginColumn"){
						//						replaceNavPath = true;
						//						}
						viewModel.setProperty("/preventHashChange", true);
						var level = 0;
						if (viewModel.getProperty("/fromInprocess")) {
							level = 0
						} else if (viewModel.getProperty("/currentDetailPageLevel") !== undefined &&
							viewModel.getProperty("/currentRoute") !== "Detail") {
							level = viewModel.getProperty("/currentDetailPageLevel");
							level++;
						} else {
							viewModel.setProperty("/fromDetailDrilldown", true);
						}
						//						After making any changes navigation not working
						viewModel.setProperty("/skipPageRefresh", false);

						sap.ui.core.BusyIndicator.show(0);
						oRouter.navTo("DetailDetail", {
							path: viewModel.getProperty("/navigationPath"),
							path1: navigationPath,
							level: level
						}, replaceNavPath);

						if (!viewModel.getProperty("/enableFlexColumn")) {
							uiModel.setProperty("/showExpand", true);
							viewModel.setProperty("/layout", "MidColumnFullScreen");
							oController._updateUIElements();
						} else {
							uiModel.setProperty("/showExpand", false);
						}

					}, 100);
				},
				error: function (oData, response) {
					setTimeout(function () {
						oController.showMessagePopover(oController.messageButtonId);
					}, 1000);
				}
			});
		},
		onTableFieldChange: function (oEvent) {
			//			Don't change anything without approval
			var oController = this;
			var oViewModel = oController.getOwnerComponent().getModel("viewModel");
			var oContext = oEvent.getSource().getBindingContext();
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var bundle = oController.getView().getModel("i18n").getResourceBundle();
			var entityType, entitySet, entityName, oSource, oSourceEvent = oEvent;
			var changedPath;
			if (oViewModel.getProperty("/tableFieldChangeInprocess")) {
				return;
			}
			oViewModel.setProperty("/tableFieldChangeInprocess", true);
			//			setTimeout(function(){
			if (oSourceEvent.getParameter("changeEvent")) {
				entityName = oSourceEvent.getParameter("changeEvent").getSource().getBindingContext().getPath().split("(")[0].split("/")[1];
				oSource = oSourceEvent.getParameter("changeEvent").getSource();
				changedPath = oSourceEvent.getParameter("changeEvent").getSource().getBindingContext().getPath();
			} else {
				entityName = oSourceEvent.getSource().getBindingContext().getPath().split("(")[0].split("/")[1];
				oSource = oSourceEvent.getSource();
				changedPath = oSourceEvent.getSource().getBindingContext().getPath();
			}

			if (oSourceEvent.getParameter("validated") || oSourceEvent.getParameter("value") == "" || oSourceEvent.getParameter("selectionChange") ||
				(oSourceEvent.getParameter("changeEvent") && (oSourceEvent.getParameter("changeEvent").getParameter("validated")
					|| oSourceEvent.getParameter("changeEvent").getParameter("value") == "" || oSourceEvent.getParameter("changeEvent").getParameter("selectionChange")))) {
				if (entityName) {
					if (oViewModel.getProperty("/currentRoute") == 'Detail' ||
						(oViewModel.getProperty("/currentRoute") == 'DetailDetail')) {
						oController.noBackPlease(); // for preventing the
						// browser back
					}
					entitySet = oMetaModel.getODataEntitySet(entityName);
					entityType = oMetaModel.getODataEntityType(entitySet.entityType);
					var path;
					if (oSourceEvent.getParameter("changeEvent") &&
						oSourceEvent.getParameter("changeEvent").getSource().getBindingInfo("value")) {
						path = oSourceEvent.getParameter("changeEvent").getSource().getBindingInfo("value").binding.getPath();
					} else if (oSourceEvent.getSource().getBindingInfo("value")) {
						path = oSourceEvent.getSource().getBindingInfo("value").binding.sPath;
					}
					var property = oMetaModel.getODataProperty(entityType, path);
					//					if(oSourceEvent.getParameter("value") == "" && property['com.sap.vocabularies.UI.v1.Mandatory'] && 
					//							property['com.sap.vocabularies.UI.v1.Mandatory'].Bool){
					//						var oMessageManager = sap.ui.getCore().getMessageManager();						
					//						if(!oController.oMessageProcessor){
					//							oController.oMessageProcessor = new sap.ui.core.message.ControlMessageProcessor();
					//							oMessageManager.registerMessageProcessor(oController.oMessageProcessor);
					//							oMessageManager.registerObject(oController.getView(), true);
					//						}					
					//						oMessageManager.addMessages(new sap.ui.core.message.Message({
					//							  message: bundle.getText("MANDATORYTEXT",[property["com.sap.vocabularies.Common.v1.Label"].String]),
					//							  description: bundle.getText("MANDATORYTEXT",[property["com.sap.vocabularies.Common.v1.Label"].String]),
					//							  type: sap.ui.core.MessageType.Error,
					//							  target: changedPath
					//							  }));
					//						oEvent.getSource().setValueState("Error");
					//						oEvent.getSource().setValueStateText(bundle.getText("ENTERVALIDVALUE"));
					//						setTimeout(function () {
					//							oController.showMessagePopover(oController.messageButtonId);
					//						},100);
					//					}else 
					if (property && (property["com.sap.vocabularies.Common.v1.ValueList"]
						//					&& property["sap:value-list"] == "standard"
					)) {
						oViewModel.setProperty("/modelChanged", true);
						// confirmation popup changes nav from launchpad
						if (parent && parent.commonUtils && parent.commonUtils.dataChanged) {
							parent.commonUtils.dataChanged = true;
						}
						// confirmation popup changes nav from launchpad
						oModel.submitChanges({
							batchGroupId: "changes",
							success: function (oData, response) {
								oViewModel.setProperty("/tableFieldChangeInprocess", false);
								oController.showMessagePopover(oController.messageButtonId);
								sap.ui.core.BusyIndicator.hide();
								oController.optimizedUpdateCalls(entityName, changedPath);
								//								oModel.refresh();
							},
							error: function (data, response) {
								oViewModel.setProperty("/tableFieldChangeInprocess", false);
								oController.showMessagePopover(oController.messageButtonId);
								sap.ui.core.BusyIndicator.hide();
							}
						});
					}
				}
			} else {
				if (oEvent.getSource() instanceof sap.m.ComboBox) {
					oViewModel.setProperty("/modelChanged", true);
					// confirmation popup changes nav from launchpad
					if (parent && parent.commonUtils && parent.commonUtils.dataChanged) {
						parent.commonUtils.dataChanged = true;
					}
					// confirmation popup changes nav from launchpad
					oModel.submitChanges({
						batchGroupId: "changes",
						success: function (oData, response) {
							oController.showMessagePopover(oController.messageButtonId);
							sap.ui.core.BusyIndicator.hide();
							oViewModel.setProperty("/tableFieldChangeInprocess", false);
							oController.optimizedUpdateCalls(entityName, changedPath);
							//							oModel.refresh();
						},
						error: function (data, response) {
							oController.showMessagePopover(oController.messageButtonId);
							oViewModel.setProperty("/tableFieldChangeInprocess", false);
							sap.ui.core.BusyIndicator.hide();
						}
					});
				} else if (entityName) {
					entitySet = oMetaModel.getODataEntitySet(entityName);
					entityType = oMetaModel.getODataEntityType(entitySet.entityType);
					var property = oMetaModel.getODataProperty(entityType, oEvent.getSource().getBindingInfo("value").binding.sPath);
					if (property && (property["com.sap.vocabularies.Common.v1.ValueList"]
						//					|| property["com.sap.vocabularies.Common.v1.ValueListWithFixedValues"]
						&& property["sap:value-list"] == "fixed-values"
					)) {
						oViewModel.setProperty("/tableFieldChangeInprocess", false);
						if (oEvent.getParameter("selectionChange")) {
							oEvent.getSource().setValueState();
							oEvent.getSource().setValueStateText();
						} else {
							oEvent.getSource().setValueState("Error");
							oEvent.getSource().setValueStateText(bundle.getText("ENTERVALIDVALUE"));
						}
					}
				}
			}
			//			},1000);
		},
		onDrilldownButtonActionChange: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var data = oEvent.getSource().data();
			viewModel.setProperty("/navigateActionType", data.Action);
			viewModel.setProperty("/navigateAction_" + data.entitySet, data.Action);
		},
		//		Manual Correction Changes - start
		// onShowSectionInPopover: function (oEvent) {
		// 	var oController = this;
		// 	var oSourceEvent = $.extend(true, {}, oEvent);
		// 	var viewModel = oController.getView().getModel("viewModel");
		// 	var oData = oEvent.getSource().data();
		// 	var oModel = oController.getOwnerComponent().getModel();
		// 	var oMetaModel = oModel.getMetaModel();
		// 	var oSource = oEvent.getSource();
		// 	var oResBundle = oController.getView().getModel("i18n").getResourceBundle();
		// 	var sEntitySet = oData.entitySet;
		// 	var pEntitySet = oData.targetEntity;
		// 	var oEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(sEntitySet).entityType);

		// 	var sPath = oEvent.getSource().getParent().getBindingContext().getPath();
		// 	var lineItems = oEntityType["property"],cellProperties,itcrdItem;

		// 	_.each(lineItems, function (item) {

		// 			cellProperties = _.find(oEntityType["property"], { name: item.name});
		// 			if(cellProperties.name.endsWith("itcrd"))
		// 			{
		// 				itcrdItem = cellProperties.name;
		// 			}
		// 	});
		// 	var rowField = oModel.getProperty(sPath).rowid_h;
		// 	var itcrdElement = oModel.getProperty(sPath)[itcrdItem];

		// 	if ((rowField && rowField != "" && rowField != "0") && (itcrdElement == "R" || itcrdElement == "O")) {
		// 		var functionImport = oMetaModel.getODataFunctionImport(oData.entitySet + "_TREE_CHILD_POPUP");
		// 		oModel.callFunction("/" + functionImport.name, {
		// 			method: "POST",
		// 			batchGroupId: "changes",
		// 			success: function (oDataSet, response) {
		// 				oController.prepareSectionInPopover(oSourceEvent,oData,sEntitySet,oEntityType,sPath,true);
		// 			}
		// 		});
		// 		oModel.submitChanges({
		// 			batchGroupId: "changes",
		// 		});
		// 	}
		// 	else
		// 	{
		// 		oController.prepareSectionInPopover(oSourceEvent,oData,sEntitySet,oEntityType);
		// 	}


		// },
		//		Manual Correction Changes - end
		onShowSectionInPopover: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oData = oEvent.getSource().data();
			var oModel = oController.getOwnerComponent().getModel();
			var oMetaModel = oModel.getMetaModel();
			var oSource = oEvent.getSource();
			var oResBundle = oController.getView().getModel("i18n").getResourceBundle();
			var ok = oResBundle.getText('OK');
			var close = oResBundle.getText('CLOSE');
			var sEntitySet = oData.entitySet;
			var pEntitySet = oData.targetEntity;
			var sPath = oEvent.getSource().getParent().getBindingContext().getPath();
			var oEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(sEntitySet).entityType);
			oController.removeTransientMessages();
			var errorMessages = oController.checkErrorMessageExist(oModel);
			var content = oEvent.getSource();
			var sourcePath = oEvent.getSource().getParent().getBindingContext().getPath();
			var oTargetEntitySet = oMetaModel.getODataEntitySet(oEvent.getSource().data("targetEntity"));
			var oTargetEntityType = oMetaModel.getODataEntityType(oTargetEntitySet.entityType);
			var oUpdateRestrictions = oTargetEntitySet["Org.OData.Capabilities.V1.UpdateRestrictions"];
			var isUpdateable = true;
			if (oUpdateRestrictions && oUpdateRestrictions.Updatable) {
				if (oUpdateRestrictions.Updatable.Bool == "false") {
					isUpdateable = false;
					while (!content.getTable) {
						content = content.getParent();
					}
				}
			}
			//			else{
			//				oController.prepareAdjustmentDSCSection(oEvent,true);
			//				return;
			//			}
			if (isUpdateable) {
				viewModel.setProperty("/adjustmentDialogParentPath", sourcePath);
			}

			var controlId = content.getId();

			if (errorMessages) {
				oController.showMessagePopover(oController.messageButtonId);
				return;
			} else {

				if (oTargetEntityType["vui.bodc.workspace.Calculations"] && oTargetEntityType["vui.bodc.workspace.Calculations"].Bool &&
					oTargetEntityType["vui.bodc.workspace.Calculations"].Bool == "true") {
					oController.prepareCalcWidget(oEvent);
					return;
				}

				var path = oEvent.getSource().getBindingContext().getPath();
				viewModel.setProperty("/sectionPopover", { open: true, entitySet: oData.targetEntity });
				viewModel.setProperty("/skipHideBusyIndicatorOnBatchComplete", true);
				sap.ui.core.BusyIndicator.show(0);
				if (oController.popoverSection && oController.popoverSection[oData.targetEntity] && oController.popoverSection[oData.targetEntity].content &&
					oController.popoverSection[oData.targetEntity].content.isOpen()) {
					oController.popoverSection[oData.targetEntity].content.close();
				}
				var popoverTitle = oModel.getProperty(path)[oEntityType["com.sap.vocabularies.UI.v1.HeaderInfo"].Title.Value.Path];
				//				if(!oController.popoverSection || oController.popoverSection.entitySet !== oData.targetEntity){					
				var oPopover;
				if (!oController.popoverSection || !oController.popoverSection[oData.targetEntity] || !oController.popoverSection[oData.targetEntity].content || viewModel.getProperty("/modelChanged")) {
					var aFacets = oEntityType["com.sap.vocabularies.UI.v1.Facets"];
					var facetPath;
					for (var i = 0; i < aFacets.length; i++) {
						if (aFacets && aFacets[i].Target && aFacets[i].Target.AnnotationPath) {
							var annotationPath = aFacets[i].Target.AnnotationPath;
							annotationPath = annotationPath.replace('/@', '::');
							if (annotationPath.indexOf(oData.targetEntity) >= 0) {
								facetPath = i + "";
								break;
							}
						}
					}

					var hierarchyModel = new JSONModel();
					var hierarchy = [];
					hierarchyModel.setProperty("/nodes", hierarchy);

					if (oController.columnPosition == 'midColumn') {
						hierarchyModel.setProperty("/ShowDetailDetail", true);
					} else {
						if (oController.columnPosition == 'beginColumn') {
							hierarchyModel.setProperty("/ShowDetailDetail", false);
						}
					}

					var oEntities = viewModel.getProperty("/entities");

					var oListEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(oData.targetEntity).entityType);
					// #188496 - Conditions are not diplayed - start
					if (oListEntityType["vui.bodc.NonResponsiveLineItem"]) {
						oEntities[oListEntityType.name] = "NonResponsive";
					} else if (oListEntityType["vui.bodc.ResponsiveLineItem"]) {
						oEntities[oListEntityType.name] = "Responsive";
					}
					// oEntities[oListEntityType.name] = "Responsive";
					// #188496 - Conditions are not diplayed - start
					hierarchyModel.setProperty("/entities", oEntities);
					viewModel.setProperty("/entities", oEntities);
					var oEntitySetContext = oMetaModel.createBindingContext(oMetaModel.getODataEntitySet(sEntitySet, true));
					var oEntityTypeContext = oMetaModel.createBindingContext(oEntityType.$path);
					var oFacetsContext = oMetaModel.createBindingContext(oEntityType.$path + "/com.sap.vocabularies.UI.v1.Facets");
					var oFacetContext = oMetaModel.createBindingContext(oEntityType.$path + "/com.sap.vocabularies.UI.v1.Facets/" + facetPath);
					window.fromPopoverSection = true;
					var oFragment = XMLTemplateProcessor.loadTemplate("vui.workspace.fragment.SmartTablePopover", "fragment");
					oFragment = XMLPreprocessor.process(oFragment, {
						caller: "XML-Fragment-templating"
					}, {
						bindingContexts: {
							meta: oMetaModel.createBindingContext("/"), //.createBindingContext(oMetaModel.getODataEntitySet(entitySet, true)),
							entitySet: oEntitySetContext,
							entityType: oEntityTypeContext,
							facet: oFacetContext,
							facets: oFacetsContext
						},
						models: {
							meta: oMetaModel,
							entitySet: oMetaModel,
							entityType: oMetaModel,
							facet: oMetaModel,
							facets: oMetaModel,
							columnModel: hierarchyModel
						}
					}).then(function (fragment) {
						oFragment = sap.ui.xmlfragment({
							fragmentContent: fragment
						}, oController);
						window.fromPopoverSection = false;
						viewModel.setProperty("/currentSectionInPopverSourceEntity", oData.entitySet);
						if (!oController.popoverSection)
							oController.popoverSection = {};
						oController.popoverSection[oData.targetEntity] = {};
						oController.popoverSection[oData.targetEntity].entitySet = oData.targetEntity;

						if (isUpdateable) {
							var oContent;
							if (oEntityType["vui.bodc.workspace.DialogueContextFields"]) {
								var columnData = [{ "col": "row1", "label": "Field" }, { "col": "row2", "label": "Value" }];
								viewModel.setProperty("/columnData", columnData);

								oContent = new sap.ui.layout.DynamicSideContent({
									sideContentFallDown: "BelowM",
									sideContentPosition: "Begin",
									containerQuery: true
								}).addStyleClass("sapUiDSCExplored noPadding sectionInDialog");

								var oSourceTable = new sap.m.Table({
									headerToolbar: new sap.m.OverflowToolbar({
										content: [
											new sap.m.Title({
												text: "{i18n>SOURCEITEM}"
											})
										]
									}),
									columns: [
										new sap.m.Column({
											header: new sap.m.Text({
												text: "{i18n>FIELD}"
											}),
											visible: true
										}),
										new sap.m.Column({
											header: new sap.m.Text({
												text: "{i18n>VALUE}"
											}),
											visible: true
										})
									]
								});
								var tableData = [];
								_.each(oEntityType["vui.bodc.workspace.DialogueContextFields"], function (field) {
									var cellProperties = _.find(oEntityType["property"], { name: field.String });
									if (cellProperties && cellProperties["com.sap.vocabularies.Common.v1.Label"] && cellProperties["com.sap.vocabularies.Common.v1.Label"].String) {
										tableData.push({ "row1": cellProperties["com.sap.vocabularies.Common.v1.Label"].String, "field": cellProperties.name });
									}
								});
								viewModel.setProperty("/sectionDialogSourceItemsData", tableData);
								var sourceItemsDataPath = "viewModel>/sectionDialogSourceItemsData";
								oSourceTable.bindElement(sourcePath);
								oSourceTable.bindAggregation("items", sourceItemsDataPath, function (sId, oContext) {
									var sSourceEntity = viewModel.getProperty("/currentSectionInPopverSourceEntity");
									var oSourceEntity = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(sSourceEntity).entityType);
									var contextObject = oContext.getObject();
									var fcat_data = viewModel.getProperty("/columnData");
									var cells = [];
									_.each(fcat_data, function (obj) {
										if (obj.col != "row1") {
											var oProperty = oSourceEntity.property.find(function (obj) { return obj.name == contextObject.field });
											var sPath;
											if (oProperty["sap:unit"]) {
												//						if(oDataField.NoOfDecimals){
												//						    return "{parts:[{path: '" + oDataField.Value.Path + "'},{value: '"+ oDataField.NoOfDecimals.String + "'}],formatter: 'zvui.work.controller.AnnotationHelper.formatDeimalValue'}";
												//						}else{
												sPath = "{parts:[{path: '" + contextObject.field + "'},{value: '2'}],formatter: 'zvui.work.controller.AnnotationHelper.formatDeimalValue'} {" + oProperty["sap:unit"] + "}";
												//						}
											} else if (oProperty && oProperty.type == "Edm.DateTime") {
												sPath = "{path:'" + contextObject.field + "', formatter:'zvui.work.controller.AnnotationHelper.getChangeDateFormat'}";
											} else {
												if (contextObject.field) {
													var sTextArrangement;
													if (oProperty["com.sap.vocabularies.Common.v1.Text"] && oProperty["com.sap.vocabularies.Common.v1.Text"]["com.sap.vocabularies.UI.v1.TextArrangement"] && oProperty["com.sap.vocabularies.Common.v1.Text"]["com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember) {
														sTextArrangement = zvui.work.controller.AnnotationHelper._mapTextArrangement4smartControl(
															oProperty["com.sap.vocabularies.Common.v1.Text"]["com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember);
														var sTextArrangementPath;
														switch (sTextArrangement) {
															case "idAndDescription":
																sTextArrangementPath = "{parts: [{path: '" + contextObject.field + "'} , {path: '" + oProperty["com.sap.vocabularies.Common.v1.Text"].Path + "'}], formatter: 'zvui.work.controller.AnnotationHelper.getLinkTextBasedOnTextArrangement'}";
																break;
															case "idOnly":
																sTextArrangementPath = "{" + contextObject.field + "}";
																break;
															case "descriptionOnly":
																if (oProperty["com.sap.vocabularies.Common.v1.Text"]) {
																	sTextArrangementPath = "{" + oProperty["com.sap.vocabularies.Common.v1.Text"].Path + "}";
																} else {
																	sTextArrangementPath = "{" + contextObject.field + "}";
																}
																break;
															case "descriptionAndId":
																sTextArrangementPath = "{parts: [ {path: '" + oProperty["com.sap.vocabularies.Common.v1.Text"].Path + "'} , {path: '" + contextObject.field + "'}], formatter: 'zvui.work.controller.AnnotationHelper.getLinkTextBasedOnTextArrangement'}";
																break;
															default:
																sTextArrangementPath = "{" + contextObject.field + "}";
																break;
														}
														sPath = sTextArrangementPath;
													} else {
														sPath = "{" + contextObject.field + "}";
													}
												}
											}
											var input = new sap.m.Text({ text: sPath, wrapping: true });
											cells.push(input);
										} else {
											var text = new sap.m.Label({ design: "Bold", wrapping: true }).bindProperty("text", "viewModel" + ">" + obj["col"], null, sap.ui.model.BindingMode.OneWay);
											cells.push(text);
										}
									});
									return new sap.m.ColumnListItem({
										cells: cells,
										type: sap.m.ListType.Inactive,
									}).addStyleClass("noPadding");
								});

								oContent.addSideContent(new sap.m.VBox({
									items: [oSourceTable]
								}).addStyleClass("matchToolSideContent"));
								oFragment.addStyleClass("sapUiTinyMarginBegin");
								oContent.addMainContent(new sap.m.VBox({
									items: oFragment
								}));
							} else {
								oContent = oFragment;
							}

							oPopover = new sap.m.Dialog({
								title: "{path:'" + oEntityType["com.sap.vocabularies.UI.v1.HeaderInfo"].Title.Value.Path + "'}",
								contentWidth: "60rem",
								draggable: true,
								resizable: true,
								content: [oContent],
								beginButton: new sap.m.Button({
									text: ok,
									press: function (oEvent) {
										oEvent.getSource().getParent().close();
										var functionImport = oMetaModel.getODataFunctionImport(oData.targetEntity + "_OK");
										if (!functionImport) {
											return;
										}
										//
										//										var urlParameters = {};								
										//										urlParameters["fname"] = oColumn.data("p13nData").columnKey;
										//										urlParameters['sectn'] = oTable.getParent().getEntitySet();

										oModel.callFunction("/" + functionImport.name, {
											method: "POST",
											batchGroupId: "changes",
											//											urlParameters: urlParameters
										});
										oModel.submitChanges({
											batchGroupId: "changes",
											success: function (oData, response) {
												//												viewModel.setProperty("/skipBusyIndicator",false);
											}
										});
									}.bind(this)
								}),
								endButton: new sap.m.Button({
									text: "Close",
									press: function (oEvent) {
										viewModel.setProperty("/adjustmentDialogParentPath", undefined);
										oEvent.getSource().getParent().close();
										var functionImport = oMetaModel.getODataFunctionImport(oData.targetEntity + "_CANCEL");
										if (!functionImport) {
											return;
										}
										//
										//										var urlParameters = {};								
										//										urlParameters["fname"] = oColumn.data("p13nData").columnKey;
										//										urlParameters['sectn'] = oTable.getParent().getEntitySet();

										oModel.callFunction("/" + functionImport.name, {
											method: "POST",
											batchGroupId: "changes",
											//											urlParameters: urlParameters
										});
										oModel.submitChanges({
											batchGroupId: "changes",
											success: function (oData, response) {
												//												viewModel.setProperty("/skipBusyIndicator",false);
											}
										});
									}.bind(this)
								}),
								afterClose: function (oEvent) {
									//									oEvent.getSource().unbindElement();	//**commented for QA#7066- dump
								}
							}).addStyleClass("sapUiSizeCompact");
						} else {
							//----------Resizing Popover Changes --**Start
							if (oTargetEntityType['com.sap.vocabularies.UI.v1.LineItem'].length > 5) {
								oPopover = new sap.m.Dialog({
									showHeader: false,
									title: "{path:'" + oEntityType["com.sap.vocabularies.UI.v1.HeaderInfo"].Title.Value.Path + "'}",
									contentWidth: "60rem",
									draggable: true,
									resizable: true,
									content: oFragment,
									endButton: new sap.m.Button({
										text: ok,
										press: function (oEvent) {
											oEvent.getSource().getParent().close();

										}.bind(this)
									}),
									afterClose: function (oEvent) {
										//									oEvent.getSource().unbindElement();	//**commented for QA#7066- dump
									}
								}).addStyleClass("sapUiSizeCompact");
							} else {
								oPopover = new sap.m.Popover({
									showHeader: false,
									title: "{path:'" + oEntityType["com.sap.vocabularies.UI.v1.HeaderInfo"].Title.Value.Path + "'}",
									contentWidth: "700px",
									content: oFragment,
									placement: sap.m.PlacementType.Auto,
									afterClose: function (oEvent) {
										//									oEvent.getSource().unbindElement();	
									}
								});
							}
							//----------Resizing Popover Changes --**End
						}
						oPopover.bindElement(path);

						jQuery.sap.syncStyleClass(oController.getOwnerComponent().getContentDensityClass(), oController.getView(), oPopover);

						oController.popoverSection[oData.targetEntity].content = oPopover;
						setTimeout(function () {
							var lineItems = oEntityType["property"], cellProperties, itcrdItem;

							_.each(lineItems, function (item) {

								cellProperties = _.find(oEntityType["property"], { name: item.name });
								if (cellProperties.name.endsWith("itcrd")) {
									itcrdItem = cellProperties.name;
								}
							});
							var rowid_h = oModel.getProperty(sPath).rowid_h;
							var itcrdElement = oModel.getProperty(sPath)[itcrdItem];

							if ((rowid_h && rowid_h != "" && rowid_h != "0")) {
								oController.getView().addDependent(oPopover);
								oController.onShowChildSectionInPopover(oModel, oMetaModel, oPopover, oData, sPath, isUpdateable, pEntitySet, oTargetEntityType);

							} else {
								if (isUpdateable) {
									oController.popoverSection[pEntitySet].content.open();
								} else {
									if (oTargetEntityType['com.sap.vocabularies.UI.v1.LineItem'].length > 5) {
										oController.popoverSection[pEntitySet].content.open();
									} else {
										oController.popoverSection[pEntitySet].content.openBy(oSource);
									}
								}
								oController.getView().addDependent(oPopover);
							}
							viewModel.setProperty("/skipHideBusyIndicatorOnBatchComplete", false);
							sap.ui.core.BusyIndicator.hide();

						}, 1000);


					});
				} else {
					var lineItems = oEntityType["property"], cellProperties, itcrdItem;

					_.each(lineItems, function (item) {

						cellProperties = _.find(oEntityType["property"], { name: item.name });
						if (cellProperties.name.endsWith("itcrd")) {
							itcrdItem = cellProperties.name;
						}
					});

					var rowid_h = oModel.getProperty(sPath).rowid_h;
					var itcrdElement = oModel.getProperty(sPath)[itcrdItem];
					if (!(rowid_h && rowid_h != "" && rowid_h != "0")) {
						oController.popoverSection[oData.targetEntity].content.bindElement(path);
						if (oController.popoverSection[oData.targetEntity].content.getContent &&
							oController.popoverSection[oData.targetEntity].content.getContent()[0].getSideContent &&
							oController.popoverSection[oData.targetEntity].content.getContent()[0].getSideContent()[0].getItems()[0]) {
							oController.popoverSection[oData.targetEntity].content.getContent()[0].getSideContent()[0].
								getItems()[0].bindElement(sourcePath);
						}

					}
					setTimeout(function () {

						if ((rowid_h && rowid_h != "" && rowid_h != "0")) {
							oController.getView().addDependent(oPopover);
							oController.onShowChildSectionInPopover(oModel, oMetaModel, oPopover, oData, sPath, isUpdateable, pEntitySet, oTargetEntityType);
							oController.popoverSection[oData.targetEntity].content.bindElement(path);
							if (oController.popoverSection[oData.targetEntity].content.getContent &&
								oController.popoverSection[oData.targetEntity].content.getContent()[0].getSideContent &&
								oController.popoverSection[oData.targetEntity].content.getContent()[0].getSideContent()[0].getItems()[0]) {
								oController.popoverSection[oData.targetEntity].content.getContent()[0].getSideContent()[0].
									getItems()[0].bindElement(sourcePath);
							}
						} else {
							if (isUpdateable) {
								oController.popoverSection[pEntitySet].content.open();
							} else {
								if (oTargetEntityType['com.sap.vocabularies.UI.v1.LineItem'].length > 5) {
									oController.popoverSection[pEntitySet].content.open();
								} else {
									oController.popoverSection[pEntitySet].content.openBy(oSource);
								}
							}
							//oController.getView().addDependent(oPopover);
						}
						viewModel.setProperty("/skipHideBusyIndicatorOnBatchComplete", false);
						sap.ui.core.BusyIndicator.hide();
					}, 1000);


				}
			}
		},
		onShowChildSectionInPopover: function (oModel, oMetaModel, oPopover, oData, sPath, isUpdateable, pEntitySet, oTargetEntityType) {
			var oController = this;
			var functionImport = oMetaModel.getODataFunctionImport(oData.entitySet + "_TREE_CHILD_POPUP");
			// if(addDependent) 
			// {
			// 	oController.getView().addDependent(oPopover);
			// }
			oModel.callFunction("/" + functionImport.name, {
				method: "POST",
				batchGroupId: "changes",
				success: function (oDataSet, response) {

					var urlParameters = {};
					urlParameters["corr_rows_get"] = true;
					urlParameters["$skip"] = 0;
					urlParameters["$top"] = 100;

					oModel.read(sPath, {
						urlParameters: _.extend(
							urlParameters,
							oController.readQueryPrepare(pEntitySet)
						),
						success: function (oData, response) {
							if (isUpdateable) {
								oController.popoverSection[pEntitySet].content.open();
							} else {
								if (oTargetEntityType['com.sap.vocabularies.UI.v1.LineItem'].length > 5) {
									oController.popoverSection[pEntitySet].content.open();
								} else {
									oController.popoverSection[pEntitySet].content.openBy(oSource);
								}
							}


						},
					});
				}
			});
			oModel.submitChanges({
				batchGroupId: "changes",
			});

		},
		getSelectionsDateFieldsFromEntity: function (sEntitySet) {
			var oController = this;
			var oModel = oController.getOwnerComponent().getModel("workspaceModel");
			var oMetaModel = oModel.getMetaModel();
			var oEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(sEntitySet).entityType);
			var oSelectionFields = oEntityType["com.sap.vocabularies.UI.v1.SelectionFields"];
			var keys = [];
			if (!oSelectionFields) return;
			for (var i = 0; i < oSelectionFields.length; i++) {
				var property = oEntityType.property.find(function (prop) { return prop.name == oSelectionFields[i].PropertyPath })
				if (property && property["sap:display-format"] == "Date") {
					keys.push({ key: oSelectionFields[i].PropertyPath });
				}
			}

			return keys;
		},
		openMatchToolsDialog: function () {
			var oController = this;
			if (oController._oMatchDialog) {
				oController._oMatchDialog.removeAllContent();
				delete oController._oMatchDialog;
			}
			oController._oMatchDialog = sap.ui.jsfragment("vui.workspace.fragment.MatchDialog", oController);
			oController.getView().addDependent(oController._oMatchDialog);
			oController._oMatchDialog.open();
		},
		setNavigationTypeForTable: function (oContent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var navigateAction = viewModel.getProperty("/navigateActionType");
			if (!navigateAction) {
				return;
			}
			var content = oContent;
			if (!content) return;
			while (!content.getSections) {
				content = content.getContent()[0];
			}
			if (!content) {
				return;
			}
			var sections = content.getSections();
			for (var i = 0; i < sections.length; i++) {
				var oBlock = sections[i].getSubSections()[0].getBlocks()[0];
				var aContent = oBlock.getContent();
				for (var z = 0; z < aContent.length; z++) {
					var oControl = aContent[z];
					if (oController.isControlOfType(oControl, "sap/ui/layout/DynamicSideContent")) {
						var aMainContent = oControl.getMainContent();
						for (var y = 0; y < aMainContent.length; y++) {
							if (oController.isSmartTable(aMainContent[y])) {
								var segButton = aMainContent[y].getToolbar().getContent().find(function (obj) { return obj.sId.indexOf("::SegButton") !== -1 });
								if (segButton && segButton.getVisible()) {
									if (navigateAction == "child") {
										segButton.getItems()[1].firePress();
										segButton.getButtons()[1].firePress();
										segButton.setSelectedKey(segButton.getItems()[1].getKey());
									} else {
										segButton.getItems()[0].firePress();
										segButton.getButtons()[0].firePress();
										segButton.setSelectedKey(segButton.getItems()[0].getKey());
									}
								}
							}
						}
					} else if (oController.isControlOfType(oControl, "sap/ui/layout/ResponsiveSplitter")) {
						var aMainContent = oControl.getRootPaneContainer().getPanes()[0].getContent().getContent()[0].getContent();
						for (var y = 0; y < aMainContent.length; y++) {
							if (oController.isSmartTable(aMainContent[y])) {
								var segButton = aMainContent[y].getToolbar().getContent().find(function (obj) { return obj.sId.indexOf("::SegButton") !== -1 });
								if (segButton && segButton.getVisible()) {
									if (navigateAction == "child") {
										segButton.getItems()[1].firePress();
										segButton.getButtons()[1].firePress();
										segButton.setSelectedKey(segButton.getItems()[1].getKey());
									} else {
										segButton.getItems()[0].firePress();
										segButton.getButtons()[0].firePress();
										segButton.setSelectedKey(segButton.getItems()[0].getKey());
									}
								}
							}
						}
					} else if (oController.isSmartTable(oControl)) {
						var segButton = oControl.getToolbar().getContent().find(function (obj) { return obj.sId.indexOf("::SegButton") !== -1 });
						if (segButton && segButton.getVisible()) {
							if (navigateAction == "child") {
								segButton.getItems()[1].firePress();
								segButton.getButtons()[1].firePress();
								segButton.setSelectedKey(segButton.getItems()[1].getKey());
							} else {
								segButton.getItems()[0].firePress();
								segButton.getButtons()[0].firePress();
								segButton.setSelectedKey(segButton.getItems()[0].getKey());
							}
						}
					}
				}
			}
		},
		onFilterSearch: function (oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();

			var viewModel = oController.getView().getModel("viewModel");
			viewModel.setProperty("/searchEvent", true);
			viewModel.setProperty("/searchedEntity", oEvent.getSource().getEntitySet());

			//			oController.searchEntity = oEvent.getSource().getEntitySet();

			//			var sections = oController.getView().getContent()[0];
			//			while(true){
			//			if(sections.getSections){
			//			sections = sections.getSections();
			//			break;
			//			}else{
			//			sections = sections.getContent()[0];
			//			}
			//			}

		},
		// VHD#737628 -> Multiselect functionality is not working fine --Start
		formatDateWithoutUTC: function (date) {
			if (!date) return "";
			var format = "yMd";
			if (window.dateFormat) {
				format = window.dateFormat;
			}
			var dateFormat = sap.ui.core.format.DateFormat.getInstance({
				format: "yMd",
			});
			var oDate = new Date(date);
			var formatedDate = dateFormat.format(oDate);
			var dateData = formatedDate.split("/");
			var month = dateData[0].length == 1 ? "0" + dateData[0] : dateData[0];
			var day = dateData[1].length == 1 ? "0" + dateData[1] : dateData[1];
			var year = dateData[2];
			switch (format) {
				case "dd.MM.yyyy":
				case "DD.MM.YYYY":
					formatedDate = day + "." + month + "." + year;
					break;
				case "MM-dd-yyyy":
				case "MM-DD-YYYY":
					formatedDate = month + "-" + day + "-" + year;
					break;
				case "yyyy.MM.dd":
				case "YYYY.MM.DD":
					formatedDate = year + "." + month + "." + day;
					break;
				case "yyyy/MM/dd":
				case "YYYY/MM/DD":
					formatedDate = year + "/" + month + "/" + day;
					break;
				case "yyyy-MM-dd":
				case "YYYY-MM-DD":
					formatedDate = year + "-" + month + "-" + day;
					break;
			}

			return formatedDate;
		},

		// VHD#737628 -> Multiselect functionality is not working fine --End
		onTableSelectAll: function (oEvent) {
			var oController = this;
			var viewModel = this.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			//			var oTable = oEvent.getSource().getParent().getParent();
			var dynamicSideContent = oController.getResponsiveSplitter(
				oEvent.getSource()
			);
			var oSmartTable = dynamicSideContent.getMainContent()[0];
			var oTable = oSmartTable.getTable();
			var sEntitySet = oSmartTable.getEntitySet();
			var entity = oMetaModel.getODataEntityType(
				oMetaModel.getODataEntitySet(sEntitySet).entityType
			);
			var oBundle = oController
				.getView()
				.getModel("i18n")
				.getResourceBundle();
			var indices = [];
			//VHD#740535->Error as Workspace encountered internal server error on cal run post - Start
			var count;
			if (oSmartTable.getTable() instanceof sap.m.Table) {
				count = oSmartTable.getTable().getMaxItemsCount();
			} else if (oSmartTable.getTable() instanceof sap.ui.table.Table) {
				count = oSmartTable.getTable().getBinding("rows").getLength();
			}
			//VHD#740535->Error as Workspace encountered internal server error on cal run post - End

			var totalRows = count;
			var oSourceEvent = $.extend(true, {}, oEvent);

			//			for (var i = 0; i < totalRows; i++) {
			//				indices.push(i);
			//			}
			var customData = oEvent.getSource().data();
			if (customData.selected == "false") {
				oEvent.getSource().setType("Emphasized");
				oEvent.getSource().data("selected", "true");
				viewModel.setProperty("/skipSelectionChange", false);
				//				oTable.addSelectionInterval(0,totalRows - 1);
				// 188496
				//18478 - POS DO>Multi select is not working Properly - start					
				oTable.data("selectAll", "true");
				oTable.data("selectAllButtonId", oEvent.getSource().getId());
				//18478 - POS DO>Multi select is not working Properly - end
				// 188496
				oTable.setEnableSelectAll(true);
				oTable.selectAll();
				oTable.setEnableSelectAll(false);
				//				setTimeout(function(){
				//					oTable.fireRowSelectionChange({rowContext:oTable.getRows()[0].getBindingContext(), rowIndex: 0, selectAll: true, rowIndices: indices, userInteraction: true});
				//				});
			} else {
				if (
					entity["vui.bodc.workspace.Summary"] &&
					viewModel.getProperty("/selectAll_" + sEntitySet) &&
					viewModel.getProperty("/modelChanged")
				) {
					MessageBox.confirm(oBundle.getText("BACKTOWORKSPACE"), {
						title: oBundle.getText("CONFIRM"),
						actions: [MessageBox.Action.YES, MessageBox.Action.NO],
						onClose: function (oAction) {
							if (oAction == "YES") {
								oSourceEvent.getSource().setType("Default");
								oSourceEvent.getSource().data("selected", "false");
								viewModel.setProperty("/skipSelectionChange", true);
								oTable.setSelectedIndex(-1);
								setTimeout(function () {
									//									oTable.fireRowSelectionChange({rowContext: null, rowIndex: -1, selectAll: false, rowIndices: indices, userInteraction: true});
									oTable.fireRowSelectionChange({
										rowContext: null,
										rowIndex: -1,
										selectAll: false,
										userInteraction: true,
									});
									oController.onDiscard();
									// 188496
									//18478 - POS DO>Multi select is not working Properly - start		
									oTable.data("selectAll", "false");
									oController.onCloseTableDSC(oSourceEvent);
									//18478 - POS DO>Multi select is not working Properly - end
									// 188496
								});
							}
						},
					});
				} else {
					oEvent.getSource().setType("Default");
					oEvent.getSource().data("selected", "false");
					viewModel.setProperty("/skipSelectionChange", true);
					oTable.setSelectedIndex(-1);
					setTimeout(function () {
						oTable.fireRowSelectionChange({
							rowContext: null,
							rowIndex: -1,
							selectAll: false,
							rowIndices: indices,
							userInteraction: true,
						});
					});
				}
			}
		},
		onSelectAllToggle: function (oEvent) {
			var oController = this;
			var viewModel = this.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			//			var oTable = oEvent.getSource().getParent().getParent();
			var dynamicSideContent = oController.getResponsiveSplitter(oEvent.getSource());
			var oTable = dynamicSideContent.getMainContent()[0].getTable();
			var customData = oEvent.getSource().data();
			var sEntitySet = oTable.getParent().getEntitySet();
			var entity = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(sEntitySet).entityType);
			var oBundle = oController.getView().getModel("i18n").getResourceBundle();
			var oSourceEvent = $.extend(true, {}, oEvent);
			//			var showingSideContent = viewModel.getProperty("/" + sEntitySet +
			//			"showingSideContent");
			var selectAllButton = oTable.getParent().getToolbar().getContent().find(function (button) {
				if (button.data("Type") && button.data("Type") == "SelectAll") {
					return GamepadButton
				}
			})
			if (customData.Action == "SELECT_ALL") {
				if (oTable.getRows) {
					oTable._toggleSelectAll();
				} else {
					oTable.selectAll(true);
				}
			} else {
				if (entity["vui.bodc.workspace.Summary"] &&
					viewModel.getProperty("/selectAll_" + sEntitySet) &&
					viewModel.getProperty("/modelChanged")) {
					MessageBox.confirm(oBundle.getText('BACKTOWORKSPACE'), {
						title: oBundle.getText('CONFIRM'),
						actions: [MessageBox.Action.YES, MessageBox.Action.NO],
						onClose: function (oAction) {
							if (oAction == 'YES') {
								//								 if(selectAllButton){
								//										selectAllButton.setType("Default");
								//										selectAllButton.data("selected","false");
								//									}
								if (oTable.getRows) {
									oTable.clearSelection();
								} else {
									oTable.removeSelections();
								}
								oController.onCloseTableDSC(oSourceEvent);
								oController.onDiscard();
							}

						}
					});
				} else {
					//					 if(selectAllButton){
					//							selectAllButton.setType("Default");
					//							selectAllButton.data("selected","false");
					//						}
					if (oTable.getRows) {
						oTable.clearSelection();
					} else {
						oTable.removeSelections();
					}
					oController.onCloseTableDSC(oEvent);
				}
			}
		},
		onDSCSizeChange: function (oEvent) {
			var oController = this;
			//			var dynamicSideContent =
			//			oController.getDynamicSideContent(oEvent.getSource());
			var dynamicSideContent = oController.getResponsiveSplitter(oEvent.getSource());
			if (!dynamicSideContent.getEqualSplit()) {
				dynamicSideContent.setEqualSplit(true);
			} else {
				dynamicSideContent.setEqualSplit(false);
			}
		},

		onChangeContentDensity: function (oEvent) {
			var oController = this;
			var viewModel = oController.getOwnerComponent().getModel("viewModel");
			var uiModel = oController.getView().getModel("ui");
			var oModel = oController.getView().getModel();
			var gridTable = oEvent.getSource().getParent().getParent();
			if (oEvent.getSource().data("CONTENTDENSITY") == "COMPACT") {
				gridTable.addStyleClass("vistexCompactStyle");
				gridTable.setVisibleRowCount(23);
				viewModel.setProperty("/CompactMode", true);
			} else {
				gridTable.removeStyleClass("vistexCompactStyle");
				gridTable.setVisibleRowCount(13);
				viewModel.setProperty("/CompactMode", false);
			}
		},
		onTableSelectionModeChange: function (oEvent) {
			var oController = this;
			var viewModel = oController.getOwnerComponent().getModel("viewModel");
			var customData = oEvent.getSource().data();
			var mainTable;
			var dynamicSideContent = oController.getResponsiveSplitter(oEvent.getSource());
			if (dynamicSideContent.getMainContent()[0].getTable) {
				mainTable = dynamicSideContent.getMainContent()[0].getTable();
			} else if (dynamicSideContent.getMainContent()[1].getTable) {
				mainTable = dynamicSideContent.getMainContent()[1].getTable()
			}
			var selectAllButton = mainTable.getParent().getToolbar().getContent().find(function (button) {
				if (button.data("Type") && button.data("Type") == "SelectAll") {
					return GamepadButton
				}
			})
			if (oEvent.getParameter("state") == true) {
				if (mainTable.setSelectionMode) {
					mainTable.setSelectionMode("MultiToggle");
				} else {
					mainTable.setMode("MultiSelect");
				}
				if (selectAllButton) {
					selectAllButton.setVisible(true);
					selectAllButton.setType("Default");
				}
			} else {
				if (mainTable.setSelectionMode) {
					mainTable.setSelectionMode("Single");
				} else {
					var oModel = oController.getView().getModel();
					var oMetaModel = oModel.getMetaModel();
					var oEntitySet = oMetaModel.getODataEntitySet(mainTable.getParent().getEntitySet());
					var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
					if (oEntityType["com.sap.vocabularies.UI.v1.Facets"]) {
						var facet = oEntityType["com.sap.vocabularies.UI.v1.Facets"].find(function (facet) {
							return !facet.TabHide || facet.TabHide.String !== "True"
						});
						if (facet) {
							mainTable.setMode("SingleSelectLeft");
						} else {
							mainTable.setMode("SingleSelectMaster");
						}
					} else {
						mainTable.setMode("SingleSelectMaster");
					}
				}
				if (selectAllButton) {
					selectAllButton.setVisible(false);
					selectAllButton.setType("Default");
				}
			}
			oController.onCloseTableDSC(oEvent);
		},
		onCodesSectionPrepare: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");

			if (!oController.prepareCodesSection && !viewModel.getProperty("/modelChanged")) return;
			oController.prepareCodesSection = false;
			sap.ui.core.BusyIndicator.show();
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var dynamicSideContent = oController.getResponsiveSplitter(oEvent.getSource());
			var oSmartTable, oTargetEntity, segmentedButton;
			var DSCId = dynamicSideContent.content.getId();
			var bundle = oController.getView().getModel("i18n").getResourceBundle();
			if (dynamicSideContent.getMainContent()[1]) {
				oSmartTable = dynamicSideContent.getMainContent()[1];
			} else {
				oSmartTable = dynamicSideContent.getMainContent()[0];
			}

			var oTable = oSmartTable.getTable();
			var oneRowSelected = true;
			if (oTable.getSelectedIndices) {
				oneRowSelected = oTable.getSelectedIndices().length == 1 ? true : false;
			} else {
				oneRowSelected = oTable.getSelectedItems().length == 1 ? true : false;
			}

			var sEntitySet = oSmartTable.getEntitySet();
			var entity = oModel.getMetaModel().getODataEntityType(oModel.getMetaModel().getODataEntitySet(sEntitySet).entityType);

			var itemTabBar = oController.getView().byId(DSCId + "::IconTab");
			if (!itemTabBar) {
				itemTabBar = sap.ui.getCore().byId(DSCId + "::IconTab");
				segmentedButton = sap.ui.getCore().byId(DSCId + "::SegButton");
			} else {
				segmentedButton = oController.getView().byId(DSCId + "::SegButton");
			}

			itemTabBar.getItems()[1].removeAllContent();

			if (entity.navigationProperty && entity.navigationProperty.length > 0) {
				for (var i = 0; i < entity.navigationProperty.length; i++) {
					oTargetEntity = oMetaModel.getODataEntityType(oMetaModel.getODataAssociationEnd(entity, entity.navigationProperty[i].name).type);
					if (oTargetEntity && oTargetEntity['vui.bodc.workspace.CodesEditable']) {
						//	#164828 -> Approval Integration via Action code(GTM sync ) --Start
						if (oTargetEntity["vui.bodc.workspace.DisplayCodesInDetail"] &&
							oTargetEntity["vui.bodc.workspace.DisplayCodesInDetail"].Bool
						) {
							continue;
						}

						// 						if (oneRowSelected) {
						// 							var listEntity = oMetaModel.getODataAssociationSetEnd(entity, entity.navigationProperty[i].name).entitySet;
						// 							var oAcgrpField = oTargetEntity.property.find(function (obj) { return obj.name == "acgrp" });
						// 							if (oAcgrpField) {
						// 								var customListItem;
						// 								if (oController.codesDataEnabled === "1") {
						// 									customListItem = new sap.m.CustomListItem({
						// 										content: new sap.m.CheckBox({
						// 											selected: "{seltd}",
						// 											enabled: "{= ${seltd_fc} === 3}",
						// 											partiallySelected: "{psltd}",
						// 											text: "{text}"
						// 										})
						// 									});
						// 								} else {
						// 									customListItem = new sap.m.CustomListItem({
						// 										content: new sap.m.CheckBox({
						// 											selected: "{seltd}",
						// 											enabled: false,
						// 											partiallySelected: "{psltd}",
						// 											text: "{text}"
						// 										})
						// 									});
						// 								}
						// 								var codesList = new sap.m.List().data({ "entity": listEntity, "refresh": true, noDataText: bundle.getText("NOITEMS_SMARTTABLE") });
						// 								var codeListItemPath = "/" + listEntity;
						// 								var sorter = new sap.ui.model.Sorter("acgrp_txt", false, true);
						// 								codesList.bindAggregation("items", { path: codeListItemPath, template: customListItem, sorter: sorter });

						// 								var oCodesToolbar = new sap.m.Toolbar();
						// 								oCodesToolbar.addContent(new sap.m.Title({
						// 									text: oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"]["TypeName"].String
						// 								}));
						// 								codesList.setHeaderToolbar(oCodesToolbar);
						// 							} else {
						// 								var codesList = new sap.ui.comp.smartlist.SmartList({
						// 									entitySet: listEntity,
						// 									header: oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"]["TypeName"].String,
						// 									showRowCount: false,
						// 									enableAutoBinding: true
						// 								});

						// 								var customListItem;
						// 								if (oController.codesDataEnabled === "1") {
						// 									customListItem = new sap.m.CustomListItem({
						// 										content: new sap.m.CheckBox({
						// 											selected: "{seltd}",
						// 											enabled: "{= ${seltd_fc} === 3}",
						// 											partiallySelected: "{psltd}",
						// 											text: "{text}"
						// 										})
						// 									});
						// 								} else {
						// 									customListItem = new sap.m.CustomListItem({
						// 										content: new sap.m.CheckBox({
						// 											selected: "{seltd}",
						// 											enabled: false,
						// 											partiallySelected: "{psltd}",
						// 											text: "{text}"
						// 										})
						// 									});
						// 								}

						// 								codesList.setListItemTemplate(customListItem);
						// 								if (codesList.getList) {
						// 									codesList.attachDataReceived(function (oEvent) {
						// 										oEvent.getSource().getList().setNoDataText(bundle.getText("NOITEMS_SMARTTABLE"));
						// 									});
						// 								}

						// 							}
						// 						} else {
						// 							var editablelistEntity = oMetaModel.getODataAssociationSetEnd(entity, entity.navigationProperty[i].name).entitySet;
						// 							viewModel.setProperty("/bulkEditCode/" + editablelistEntity, {});
						// 							viewModel.setProperty("/bulkEditCode/" + editablelistEntity + "/entityName", editablelistEntity);
						// 							var codesList = new sap.m.List({ noDataText: bundle.getText("NOITEMS_SMARTTABLE") });
						// 							var singleSelect = false;
						// 							if (oTargetEntity["vui.bodc.workspace.SingleSelect"] &&
						// 								oTargetEntity["vui.bodc.workspace.SingleSelect"].Bool) {
						// 								singleSelect = true;
						// 							}
						// 							var sorter = null;
						// 							var oAcgrpField = oTargetEntity.property.find(function (obj) { return obj.name == "acgrp" });
						// 							if (oAcgrpField) {
						// 								sorter = new sap.ui.model.Sorter("acgrp_txt", false, true);
						// 							}
						// 							var codeListItemPath = "viewModel>/bulkEditCode/" + editablelistEntity + "/itemsData";
						// 							codesList.bindAggregation("items", {
						// 								path: codeListItemPath, factory: function (sId, oContext) {
						// //									if (oController.codesDetails.allRowsLocked) {
						// //										return new sap.m.CustomListItem({
						// //											content: new sap.m.CheckBox({
						// //												selected: "{viewModel>seltd}",
						// //												enabled: false,
						// //												partiallySelected: "{viewModel>psltd}",
						// //												text: "{viewModel>text}"
						// //											})
						// //										});
						// //									} else {
						// 										return new sap.m.CustomListItem({
						// 											content: new sap.m.CheckBox({
						// 												select: [oController.onCodeListSelectionChange, oController],
						// 												selected: "{viewModel>seltd}",
						// 												enabled: "{= ${viewModel>seltd_fc} === 3 }",
						// 												partiallySelected: "{viewModel>psltd}",
						// 												text: "{viewModel>text}"
						// 											}).data("singleSelect", singleSelect)
						// 												.data("entity", editablelistEntity)
						// 										});
						// //									}
						// 								}, sorter: sorter
						// 							});
						// 							var oCodesToolbar = new sap.m.Toolbar();
						// 							oCodesToolbar.addContent(new sap.m.Title({
						// 								text: oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"]["TypeName"].String
						// 							}));
						// 							oCodesToolbar.addContent(new sap.m.ToolbarSpacer());
						// 							if (oController.codesDetails && !oController.codesDetails.allRowsLocked) {
						// 								var oCodesApplyButton = new sap.m.Button({
						// 									type: "Emphasized",
						// 									press: [oController.onDscApply, oController],
						// 									text: "{i18n>APPLY}",
						// 									visible: "{viewModel>/" + sEntitySet + "showDscApply}"
						// 								}).data("codes", true);
						// 								oCodesApplyButton.data("codeEntity", editablelistEntity);
						// 								oCodesToolbar.addContent(oCodesApplyButton);
						// 							}

						// 							codesList.setHeaderToolbar(oCodesToolbar);
						// 							// codesList.bindElement("/" + listEntity);
						// 							itemTabBar.getItems()[1].addContent(codesList);

						// 							oModel.read("/" + editablelistEntity, {
						// 								urlParameters: oController.codesDetails.urlParameters,
						// 								success: function (oData, response, test) {
						// 									if (oData.results[0]) {
						// 										var responseEntity = oData.results[0].__metadata.type.split(".")[oData.results[0].__metadata.type.split(".").length - 1].split("Type")[0];
						// 										viewModel.setProperty("/bulkEditCode/" + responseEntity + "/itemsData", $.extend(true, {}, oData.results));
						// 										viewModel.setProperty("/bulkEditCode/" + responseEntity + "/referenceItemsData", $.extend(true, {}, oData.results));
						// 									}
						// 								}
						// 							});

						// 						}

						var listEntity = oMetaModel.getODataAssociationSetEnd(
							entity,
							entity.navigationProperty[i].name
						).entitySet;
						// 						Changes to remove apply button and send apply action directly on change
						var codesList = oController.onEditableCodeSectionPrepare(
							listEntity,
							DSCId,
							true
						);
						//	#164828 -> Approval Integration via Action code(GTM sync ) --End
						itemTabBar.getItems()[1].addContent(codesList);
					} else if (oTargetEntity && oTargetEntity['vui.bodc.workspace.CodesNonEditable']) {
						var listEntity = oMetaModel.getODataAssociationSetEnd(
							entity,
							entity.navigationProperty[i].name
						).entitySet;

						var oAcgrpField = oTargetEntity.property.find(function (obj) {
							return obj.name == "acgrp";
						});
						if (oAcgrpField) {
							var customListItem = new sap.m.StandardListItem({
								title: "{text}",
							});
							var codesList = new sap.m.List().data({
								entity: listEntity,
								refresh: true,
								noDataText: "{i18n>NOITEMS_SMARTTABLE}",
							});
							var codeListItemPath = "/" + listEntity;
							var sorter = new sap.ui.model.Sorter("acgrp_txt", false, true);
							codesList.bindAggregation("items", {
								path: codeListItemPath,
								template: customListItem,
								sorter: sorter,
							});
							var oCodesToolbar = new sap.m.Toolbar();
							oCodesToolbar.addContent(
								new sap.m.Title({
									text: oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"][
										"TypeName"
									].String,
								})
							);
							codesList.setHeaderToolbar(oCodesToolbar);
						} else {
							var codesList = new sap.ui.comp.smartlist.SmartList({
								entitySet: listEntity,
								header:
									oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"][
										"TypeName"
									].String,
								showRowCount: false,
								enableAutoBinding: true,
								listItemTemplate: new sap.m.StandardListItem({
									title: "{text}",
								})
							});

							codesList.attachDataReceived(function (oEvent) {
								oEvent
									.getSource()
									.getList()
									.setNoDataText(bundle.getText("NOITEMS_SMARTTABLE"));
							});
						}
						itemTabBar.getItems()[1].addContent(codesList);
					}
				}
			}
		},
		readPath: function (entitySet, sPath) {
			var oController = this;

			var oModel = oController.getView().getModel();
			if (oModel) {
				var oMetaModel = oModel.getMetaModel();
				if (!oMetaModel.getODataEntitySet(entitySet)) {
					oModel = oController.getOwnerComponent().getModel();
				}
			}

			//			var oModel = oController.getOwnerComponent().getModel();
			oModel.read(sPath, {
				urlParameters: oController.readQueryPrepare(entitySet)
			});
		},
		readQueryPrepare: function (entitySet) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var viewModel = oController.getView().getModel("viewModel");
			var oSmartTable = oController.getFacetParentTable(entitySet, true);
			if (oModel) {
				var oMetaModel = oModel.getMetaModel();
				if (!oMetaModel.getODataEntitySet(entitySet)) {
					oModel = oController.getOwnerComponent().getModel();
				}
			}
			var oMetaModel = oModel.getMetaModel();

			var oEntitySet = oMetaModel.getODataEntitySet(entitySet);
			var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);

			var select = [];
			var expand = [];
			_.each(oEntityType.property, function (object) {
				select.push(object.name);
				if (object['sap:text']
					&& object['sap:text'].indexOf('/') != -1) {
					expand.push(object['sap:text'].substr(0, object['sap:text'].indexOf('/')));
					// select.push(object['sap:text']);
				}
			});

			var fields = zvui.work.controller.AnnotationHelper.getRequestAtLeastFields(oEntityType);
			if (oEntityType["com.sap.vocabularies.UI.v1.Identification"]) {
				var lineItems = oEntityType["com.sap.vocabularies.UI.v1.Identification"];
				for (var i = 0; i < lineItems.length; i++) {
					if (lineItems[i].Fields) {
						for (var j = 0; j < lineItems[i].Fields.length; j++) {
							if (lineItems[i].Fields[j].Value && lineItems[i].Fields[j].Value.Path &&
								fields.indexOf(lineItems[i].Fields[j].Value.Path) == -1) {
								var fieldTemp = zvui.work.controller.AnnotationHelper.getRequestFields(oEntityType, lineItems[i].Fields[j]);
								if (fieldTemp != "") {
									if (fields != "") {
										fields = fields + ",";
									}
									fields = fields + fieldTemp;
								}
							}
						}
					} else {
						if (lineItems[i].Value && lineItems[i].Value.Path &&
							fields.indexOf(lineItems[i].Value.Path) == -1) {
							var fieldTemp = zvui.work.controller.AnnotationHelper.getRequestFields(oEntityType, lineItems[i]);
							if (fieldTemp != "") {
								if (fields != "") {
									fields = fields + ",";
								}
								fields = fields + fieldTemp;
							}
						}
					}
				}
			}
			if (oEntityType["com.sap.vocabularies.UI.v1.HeaderFacets"]) {
				var headerFacets = oEntityType["com.sap.vocabularies.UI.v1.HeaderFacets"];
				for (var i = 0; i < headerFacets.length; i++) {
					if (headerFacets[i].Target && headerFacets[i].Target.AnnotationPath &&
						oEntityType[headerFacets[i].Target.AnnotationPath.substr(1)]) {
						var hFacets = oEntityType[headerFacets[i].Target.AnnotationPath.substr(1)];
						if (hFacets.Data) {
							for (var y = 0; y < hFacets.Data.length; y++) {
								if (hFacets.Data[y] && hFacets.Data[y].Value && hFacets.Data[y].Value.Path) {
									var fieldTemp = zvui.work.controller.AnnotationHelper.getRequestFields(oEntityType, hFacets.Data[y]);
									if (fieldTemp != "") {
										if (fields != "") {
											fields = fields + ",";
										}
										fields = fields + fieldTemp;
									}
								}
							}
						} else if (hFacets.Value && hFacets.Value.Path) {
							var fieldTemp = zvui.work.controller.AnnotationHelper.getRequestFields(oEntityType, hFacets);
							if (fieldTemp != "") {
								if (fields != "") {
									fields = fields + ",";
								}
								fields = fields + fieldTemp;
							}
						}
					}
				}
			}

			//Triggering Metadata Request
			if (oEntityType["vui.bodc.workspace.MatchSourceFields"]) {
				var oMatchGroupKeys = viewModel.getProperty("/matchDetails/matchGoupKeys");
				if (oMatchGroupKeys && oMatchGroupKeys.length > 0) {
					for (var i = 0; i < oMatchGroupKeys.length; i++) {
						var sourcefieldAnnotation;
						if (oMatchGroupKeys[i] && oMatchGroupKeys[i] !== "ALL") {
							sourcefieldAnnotation = "vui.bodc.workspace.MatchSourceFields." + oMatchGroupKeys[i];
						} else {
							sourcefieldAnnotation = "vui.bodc.workspace.MatchSourceFields";
						}
						if (oEntityType[sourcefieldAnnotation]) {
							var tableData = [];
							_.each(oEntityType[sourcefieldAnnotation], function (item) {
								var targetField = item.PropertyPath.split("/")[3];
								var cellProperties = _.find(oEntityType.property, { name: targetField });
								if (cellProperties) {
									if (fields != "") {
										fields = fields + ",";
									}
									fields = fields + targetField;
								}
							});
						}
					}
				} else {
					var sourcefieldAnnotation = "vui.bodc.workspace.MatchSourceFields";
					if (oEntityType[sourcefieldAnnotation]) {
						var tableData = [];
						_.each(oEntityType[sourcefieldAnnotation], function (item) {
							var targetField = item.PropertyPath.split("/")[3];
							var cellProperties = _.find(oEntityType.property, { name: targetField });
							if (cellProperties) {
								if (fields != "") {
									fields = fields + ",";
								}
								fields = fields + targetField;
							}
						});
					}
				}
			}
			//Triggering metadat request
			if (oEntityType["vui.bodc.workspace.Duplication"]) {
				// changes from du8 start
				fields = fields + ",_source";
				// changes from du8 end
				_.each(oEntityType["vui.bodc.workspace.DuplicationCriteria"], function (obj) {
					var fieldName = obj.PropertyPath.toLowerCase();
					var oDataField = { Value: { Path: fieldName } };
					if (fieldName && fields.indexOf(fieldName) == -1) {
						var fieldTemp = zvui.work.controller.AnnotationHelper.getRequestFields(oEntityType, oDataField);
						if (fieldTemp != "") {
							if (fields != "") {
								fields = fields + ",";
							}
							fields = fields + fieldTemp;
						}
					}
				});
				// _.each(oEntityType["vui.bodc.workspace.DuplicationData"], function (obj) {
				// 	var fieldName = obj.PropertyPath.toLowerCase();
				// 	var oDataField = { Value: { Path: fieldName } };
				// 	if (fieldName && fields.indexOf(fieldName) == -1) {
				// 		var fieldTemp = zvui.work.controller.AnnotationHelper.getRequestFields(oEntityType, oDataField);
				// 		if (fieldTemp != "") {
				// 			if (fields != "") {
				// 				fields = fields + ",";
				// 			}
				// 			fields = fields + fieldTemp;
				// 		}
				// 	}
				// });
			}
			/**
			 * ****Task#131283 - Generic KPI Tags in Workspace Snapping Header -
			 * changes Started****
			 */
			if (entitySet.indexOf("_KPI") !== -1) {
				_.each(oEntityType["property"], function (obj) {
					var fieldName = obj.name.toLowerCase();
					var oDataField = { Value: { Path: fieldName } };
					if (fieldName && fields.indexOf(fieldName) == -1) {
						var fieldTemp = zvui.work.controller.AnnotationHelper.getRequestFields(oEntityType, oDataField);
						if (fieldTemp != "") {
							if (fields != "") {
								fields = fields + ",";
							}
							fields = fields + fieldTemp;
						}
					}
				});
			}
			/**
			 * ****Task#131283 - Generic KPI Tags in Workspace Snapping Header -
			 * changes Ended****
			 */
			var aTechnicalFields = [
				"row_id",
				"rowst",
				"edtst",
				"hide_filter",
				"sectn",	// Required for Summary Group
				"updkz",
				"error"
			];
			if (oSmartTable && oSmartTable.getTable() instanceof sap.ui.table.Table) {
				aTechnicalFields.push("rowid_h");
				aTechnicalFields.push("_level");
				aTechnicalFields.push("prow_id");
				aTechnicalFields.push("drilldown_state");
			}
			for (i = 0; i < aTechnicalFields.length; i++) {
				var object = null;
				object = _.findWhere(oEntityType.property, { name: aTechnicalFields[i] });
				if (object != null) {
					if (fields != "") {
						fields = fields + ",";
					}
					fields = fields + aTechnicalFields[i];
				}
			}
			if (oSmartTable && oSmartTable.getTable && oSmartTable.getTable() && oSmartTable.getTable()._getVisibleColumns
				&& oSmartTable.getTable()._getVisibleColumns().length > 0) {
				var visibleRows = oSmartTable.getTable()._getVisibleColumns();
				for (var i = 0; i < visibleRows.length; i++) {
					if (visibleRows[i].data && visibleRows[i].data("p13nData") &&
						visibleRows[i].data("p13nData").columnKey) {
						var columnKey = visibleRows[i].data("p13nData").columnKey;
						if (fields.indexOf(columnKey) < 0) {
							fields = fields + "," + columnKey;
						}
						var description = visibleRows[i].data("p13nData").description;
						if (description && fields.indexOf(description) < 0 &&
							description !== columnKey) {
							fields = fields + "," + description;
						}
					}
				}
			}
			/* VHD#743792->System hangs when selecting customer match path Suggestion -- Start */
			fields = Array.from(new Set(fields.split(','))).toString();//Removing duplicate fields
			/* VHD#743792->System hangs when selecting customer match path Suggestion -- End */
			var urlParameters = {
				// "$select" : select.toString()
				"$select": fields
			};
			if (expand.length > 0) {
				urlParameters["$expand"] = expand.toString();
			}

			if (oSmartTable && oSmartTable.getTable && oSmartTable.getTable() && oSmartTable.getTable().getBinding
				&& oSmartTable.getTable().getBinding() && oSmartTable.getTable().getBinding().sSortParams) {
				var sSortParams = oSmartTable.getTable().getBinding().sSortParams.split("$orderby=");
				if (sSortParams[1] && decodeURI) {
					urlParameters["$orderby"] = decodeURI(sSortParams[1]);
				}
			}
			if (oSmartTable && oSmartTable.getTable && oSmartTable.getTable() && oSmartTable.getTable().getBinding
				&& oSmartTable.getTable().getBinding() && oSmartTable.getTable().getBinding().sFilterParams) {
				var sFilterParams = oSmartTable.getTable().getBinding().sFilterParams.split("$filter=");
				if (sFilterParams[1] && decodeURI) {
					urlParameters["$filter"] = decodeURI(sFilterParams[1]);
				}
			}
			return urlParameters;
		},
		//Triggering metadat Request
		onMatchItemPress: function (oEvent) {
			var oController = this;
			var viewModel = oController.getOwnerComponent().getModel("viewModel");
			var oSource = oEvent.getSource();
			var oPanel = oSource.getParent();
			var sPath = oEvent
				.getParameter("listItem")
				.getBindingContext("viewModel")
				.getPath();
			while (!(oPanel instanceof sap.m.IconTabFilter)) {
				oPanel = oPanel.getParent();
			}
			if (!oPanel) return;
			var columnData = [
				{ col: "field", label: "Field" },
				{ col: "source", label: "Source" },
				{ col: "target", label: "Target" },
			];
			viewModel.setProperty("/matchColumnData", columnData);

			oPanel.getContent()[0].setVisible(false);
			oPanel.getContent()[1].getContent()[0].setVisible(false);
			var length = oPanel
				.getContent()[1]
				.getContent()[0]
				.getVisibleItems().length;
			var index = parseInt(sPath.split("/")[sPath.split("/").length - 1]) + 1;
			oController.prepareMatchItemDetails(oPanel, sPath, length, index);
		},
		prepareMatchItemDetails: function (oPanel, sPath, length, index) {
			var oController = this;
			var viewModel = oController.getOwnerComponent().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var previousButtonEnable = true,
				nextButtonEnable = true;

			if (index < 2) {
				previousButtonEnable = false;
			}

			if (index >= length) {
				nextButtonEnable = false;
			}

			var oVBox = new sap.m.VBox();
			var oHBox = new sap.m.HBox({
				justifyContent: "SpaceBetween",
				items: [
					new sap.m.Button({
						type: sap.m.ButtonType.Transparent,
						icon: "sap-icon://nav-back",
						press: [oController.onMatchItemBackPress, oController],
					}),
					new sap.m.Text({
						text: index + " of " + length,
					}).addStyleClass("sapUiTinyMarginTop"),
					new sap.m.HBox({
						items: [
							new sap.m.Button({
								type: sap.m.ButtonType.Transparent,
								icon: "sap-icon://navigation-up-arrow",
								enabled: previousButtonEnable,
								tooltip: "{i18n>PREVIOUS}",
								press: [oController.onMatchNextItem, oController],
							}).data({ length: length, index: index, sPath: sPath }),
							new sap.m.Button({
								type: sap.m.ButtonType.Transparent,
								icon: "sap-icon://navigation-down-arrow",
								enabled: nextButtonEnable,
								tooltip: "{i18n>NEXT}",
								press: [oController.onMatchNextItem, oController],
							}).data({ length: length, index: index, sPath: sPath }),
						],
					}),
				],
			});
			oVBox.addItem(oHBox);
			oVBox.addItem(
				new sap.m.Toolbar({
					width: "100%",
					height: "1px",
				})
			);
			var resultEntityName = viewModel.getProperty(
				"/matchDetails/resultEntityName"
			);
			var oTargetEntity = oMetaModel.getODataEntityType(
				oMetaModel.getODataEntitySet(resultEntityName).entityType
			);
			var oLineItems = oTargetEntity["vui.bodc.ResponsiveLineItem"];

			var title = "",
				subtitle = "",
				quickViewField,
				TitleField,
				oContent;
			oHBox = new sap.m.HBox({
				justifyContent: "SpaceBetween",
			}).addStyleClass("sapUiTinyMarginTop");
			var collectionField = oLineItems.find(function (obj) {
				return obj.RecordType == "com.sap.vocabularies.UI.v1.CollectionField";
			});
			if (collectionField && collectionField.Fields) {
				_.each(collectionField.Fields, function (field) {
					if (field.Quickview_Enitity) {
						quickViewField = field;
					} else {
						TitleField = field;
					}
				});
			}
			if (collectionField && quickViewField) {
				var oList = new sap.m.Link({
					text: "{viewModel>" + quickViewField.Value.Path + "}",
					press: [oController.onTableNavigationLinkClick, oController],
				});
				oList.data("FieldName", quickViewField.Value.Path);
				oList.data("TableEntity", resultEntityName);
				oList.data("row_id", viewModel.getProperty(sPath + "/row_id"));
				if (quickViewField.Quickview_Enitity) {
					oList.data(
						"QuickviewEnitity",
						quickViewField.Quickview_Enitity.String
					);
				}
				if (quickViewField.HREF) {
					oList.data("HREF", quickViewField.HREF.Path);
				}
				oContent = new sap.m.VBox({
					//design
					items: [
						new sap.m.Label({
							text: "{viewModel>" + TitleField.Value.Path + "}",
							design: "Bold",
						}),
						oList,
					],
				});
			} else {
				if (
					oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"] &&
					oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"].Title
				) {
					title =
						"{viewModel>" +
						oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"].Title.Value
							.Path +
						"}";
				}

				if (
					oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"] &&
					oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"].Description
				) {
					subtitle =
						"{viewModel>" +
						oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"].Description
							.Value.Path +
						"}";
				}
				oContent = new sap.m.ObjectIdentifier({
					title: title,
					text: subtitle,
					titleActive: false,
				}).addStyleClass("matchTitleObjectIdentifier sapUiTinyMarginBegin");
			}
			oHBox.addItem(
				new sap.m.HBox({
					items: [oContent],
				})
			);
			var buttonLineItem = oLineItems.find(function (obj) {
				return (
					obj.RecordType == "com.sap.vocabularies.UI.v1.DataFieldForAction"
				);
			});
			oHBox.addItem(
				new sap.m.Button({
					icon: "sap-icon://accept",
					text: "{i18n>APPLY}",
					enabled: "{viewModel>/matchDetails/enabled}",
					type: {
						path: "viewModel>mqlfr",
						formatter: function (mqlfr) {
							var sButtonType;
							if (mqlfr) {
								sButtonType = sap.m.ButtonType.Emphasized;
							} else {
								sButtonType = sap.m.ButtonType.Default;
							}
							return sButtonType;
						},
					},
					press: oController.onMatchResultAction.bind(oController),
				}).data({
					Action: buttonLineItem.Action.String,
					fromMatchDetails: true,
					sPath: sPath,
				})
			);
			oVBox.addItem(oHBox);
			var mtpctField = oLineItems.find(function (obj) {
				return obj.Value.Path == "mtpct";
			});
			if (mtpctField) {
				//				Radial Microchart
				var mtpctFieldProp = oTargetEntity.property.find(function (obj) {
					return obj.name == "mtpct";
				});
				oVBox.addItem(
					new sap.m.HBox({
						alignItems: "Center",
						items: [
							new sap.m.Label({
								text: "{i18n>CONFIDENCE} :",
							}).addStyleClass("sapUiTinyMarginBeginEnd"),
							//						new sap.suite.ui.microchart.RadialMicroChart({
							//							size: sap.m.Size.XS,
							//							percentage: {path: "viewModel>mtpct", formatter:function(mtpct){
							//								if(mtpct){
							//									return parseFloat(mtpct)
							//								}else{
							//									return 0;
							//								}
							//							}}
							//						})
							new sap.m.RatingIndicator({
								iconSize: "12px",
								maxValue: 5,
								editable: false,
								//							value: {path: "viewModel>mtpct", formatter:function(mtpct){
								//								var value;
								//								if(mtpct){
								//									value = parseFloat(mtpct) / 20;
								//									return Math.round(value);
								//								}else{
								//									return 0;
								//								}
								//							}}
								value: { path: "viewModel>mtpct", formatter: zvui.work.controller.AnnotationHelper.getRatingValue }
								//value: "{viewModel>mtpct}",
							}),
						],
					}).addStyleClass("sapUiSmallMarginTopBottom")
				);
			}

			oVBox.addItem(
				new sap.m.Label({
					text: "{i18n>MATCHDETAILS}",
				}).addStyleClass("sapUiTinyMarginBeginEnd")
			);

			var oTable = new sap.m.Table({
				autoPopinMode: false,
				columns: [
					new sap.m.Column({
						visible: true,
						header: new sap.m.Text({
							text: "{i18n>MATCHINGFIEDS}",
						}),
					}),
					new sap.m.Column({
						visible: true,
						header: new sap.m.Text({
							text: "{i18n>SOURCE}",
						}),
					}),
					new sap.m.Column({
						visible: true,
						header: new sap.m.Text({
							text: "{i18n>SUGGESTED}",
						}),
					}),
				],
			});

			oTable.bindAggregation(
				"items",
				"viewModel>/matchItemsData" + oTargetEntity.name,
				function (sId, oContext) {
					var contextObject = oContext.getObject();
					var fcat_data = viewModel.getProperty("/matchColumnData");
					var cells = [];
					_.each(fcat_data, function (obj) {
						if (obj.col == "field") {
							var text = new sap.m.Label({
								design: "Bold",
								wrapping: true,
							}).bindProperty(
								"text",
								"viewModel" + ">" + obj["col"],
								null,
								sap.ui.model.BindingMode.OneWay
							);
							cells.push(text);
						} else if (obj.col == "source") {
							var input = new sap.m.Text({
								text: "{" + contextObject.source + "}",
								wrapping: true,
							});
							//						input.bindElement(oController.DSCSourcePath);
							cells.push(input);
						} else if (obj.col == "target") {
							//						var input = new sap.m.Text({text: "{viewModel>" + sPath + "/" + contextObject.target + "}", wrapping: true});
							var input = new sap.m.FormattedText({
								htmlText: {
									parts: [
										{ path: contextObject.source },
										{
											path: "viewModel>" + sPath + "/" + contextObject.target,
										},
									],
									formatter: function (source, target) {
										return oController.getHighlightedText(source, target);
									},
								},
							});
							cells.push(input);
						}
					});
					return new sap.m.ColumnListItem({
						cells: cells,
						type: "Active",
					}).addStyleClass("noPadding");
				}
			);
			oTable.bindElement(oController.DSCSourcePath);

			oVBox.addItem(oTable);

			oVBox.bindElement("viewModel>" + sPath);
			if (oPanel.getContent()[1].getContent().length == 1) {
				oPanel.getContent()[1].addContent(oVBox);
			} else {
				oPanel.getContent()[1].removeContent(1);
				oPanel.getContent()[1].addContent(oVBox);
			}
		},
		onMatchItemBackPress: function (oEvent) {
			var oController = this;
			var oSource = oEvent.getSource();
			var oPanel = oSource.getParent();
			while (!(oPanel instanceof sap.m.IconTabFilter)) {
				oPanel = oPanel.getParent();
			}
			if (!oPanel) return;
			oPanel.getContent()[0].setVisible(true);
			oPanel.getContent()[1].getContent()[0].setVisible(true);
			oPanel.getContent()[1].removeContent(1);
		},
		onMatchNextItem: function (oEvent) {
			var oController = this;
			var oSource = oEvent.getSource();
			var sIcon = oSource.getIcon();
			var oCustomData = oSource.data();
			var oPanel, sPath, length, index, sPathIndex;
			index =
				oCustomData.sPath.split("/")[oCustomData.sPath.split("/").length - 1];
			sPath = oCustomData.sPath.slice(
				0,
				oCustomData.sPath.length - index.length
			);
			length = oCustomData.length;
			if (sIcon == "sap-icon://navigation-up-arrow") {
				sPathIndex = oCustomData.index - 2;
				index = oCustomData.index - 1;
			} else if (sIcon == "sap-icon://navigation-down-arrow") {
				sPathIndex = oCustomData.index;
				index = oCustomData.index + 1;
			}

			if (index < 1 || index > length) return;
			sPath = sPath + sPathIndex;

			var oPanel = oSource.getParent();
			while (!(oPanel instanceof sap.m.IconTabFilter)) {
				oPanel = oPanel.getParent();
			}
			if (!oPanel) return;
			oController.prepareMatchItemDetails(oPanel, sPath, length, index);
		},
		//Triggering metadat request
		// onMatchItemPress: function (oEvent) {
		// 	var oController = this;
		// 	var viewModel = oController.getOwnerComponent().getModel("viewModel");
		// 	var oSource = oEvent.getSource();
		// 	var oPanel = oSource.getParent();
		// 	var sPath = oEvent.getParameter("listItem").getBindingContext("viewModel").getPath();
		// 	while (!(oPanel instanceof sap.m.Panel)) {
		// 		oPanel = oPanel.getParent();
		// 	}
		// 	if (!oPanel) return;
		// 	var columnData = [{ "col": "field", "label": "Field" }, { "col": "source", "label": "Source" }, { "col": "target", "label": "Target" }];
		// 	viewModel.setProperty("/matchColumnData", columnData);

		// 	oPanel.getContent()[0].setVisible(false);
		// 	oPanel.getContent()[1].setVisible(false);
		// 	var length = oPanel.getContent()[1].getItems()[0].getVisibleItems().length;
		// 	var index = parseInt(sPath.split("/")[sPath.split("/").length - 1]) + 1;
		// 	oController.prepareMatchItemDetails(oPanel, sPath, length, index);
		// },
		// prepareMatchItemDetails: function (oPanel, sPath, length, index) {
		// 	var oController = this;
		// 	var viewModel = oController.getOwnerComponent().getModel("viewModel");
		// 	var oModel = oController.getView().getModel();
		// 	var oMetaModel = oModel.getMetaModel();
		// 	var previousButtonEnable = true, nextButtonEnable = true;

		// 	if (index < 2) {
		// 		previousButtonEnable = false;
		// 	}

		// 	if (index >= length) {
		// 		nextButtonEnable = false;
		// 	}

		// 	var oVBox = new sap.m.VBox();
		// 	var oHBox = new sap.m.HBox({
		// 		justifyContent: "SpaceBetween",
		// 		items: [
		// 			new sap.m.Button({
		// 				type: sap.m.ButtonType.Transparent,
		// 				icon: "sap-icon://nav-back",
		// 				press: [oController.onMatchItemBackPress, oController]
		// 			}),
		// 			new sap.m.Text({
		// 				text: index + " of " + length
		// 			}).addStyleClass("sapUiTinyMarginTop"),
		// 			new sap.m.HBox({
		// 				items: [
		// 					new sap.m.Button({
		// 						type: sap.m.ButtonType.Transparent,
		// 						icon: "sap-icon://navigation-up-arrow",
		// 						enabled: previousButtonEnable,
		// 						tooltip: "{i18n>PREVIOUS}",
		// 						press: [oController.onMatchNextItem, oController]
		// 					}).data({ length: length, index: index, sPath: sPath }),
		// 					new sap.m.Button({
		// 						type: sap.m.ButtonType.Transparent,
		// 						icon: "sap-icon://navigation-down-arrow",
		// 						enabled: nextButtonEnable,
		// 						tooltip: "{i18n>NEXT}",
		// 						press: [oController.onMatchNextItem, oController]
		// 					}).data({ length: length, index: index, sPath: sPath })
		// 				]
		// 			})
		// 		]
		// 	});
		// 	oVBox.addItem(oHBox);
		// 	oVBox.addItem(new sap.m.Toolbar({
		// 		width: "100%",
		// 		height: "1px"
		// 	}));
		// 	var resultEntityName = viewModel.getProperty("/matchDetails/resultEntityName");
		// 	var oTargetEntity = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(resultEntityName).entityType);
		// 	var oLineItems = oTargetEntity["vui.bodc.ResponsiveLineItem"];

		// 	var title = "", subtitle = "", quickViewField, TitleField, oContent;
		// 	oHBox = new sap.m.HBox({
		// 		justifyContent: "SpaceBetween",
		// 	}).addStyleClass("sapUiTinyMarginTop");
		// 	var collectionField = oLineItems.find(function (obj) { return obj.RecordType == "com.sap.vocabularies.UI.v1.CollectionField" });
		// 	if (collectionField && collectionField.Fields) {
		// 		_.each(collectionField.Fields, function (field) {
		// 			if (field.Quickview_Enitity) {
		// 				quickViewField = field;
		// 			} else {
		// 				TitleField = field;
		// 			}
		// 		});
		// 	}
		// 	if (collectionField && quickViewField) {
		// 		var oList = new sap.m.Link({
		// 			text: "{viewModel>" + quickViewField.Value.Path + "}",
		// 			press: [oController.onTableNavigationLinkClick, oController],
		// 		});
		// 		oList.data("FieldName", quickViewField.Value.Path);
		// 		oList.data("TableEntity", resultEntityName);
		// 		oList.data("row_id", viewModel.getProperty(sPath + "/row_id"));
		// 		if (quickViewField.Quickview_Enitity) {
		// 			oList.data("QuickviewEnitity", quickViewField.Quickview_Enitity.String);
		// 		}
		// 		if (quickViewField.HREF) {
		// 			oList.data("HREF", quickViewField.HREF.Path);
		// 		}
		// 		oContent = new sap.m.VBox({// design
		// 			items: [new sap.m.Label({
		// 				text: "{viewModel>" + TitleField.Value.Path + "}",
		// 				design: "Bold"
		// 			}),
		// 				oList
		// 			]
		// 		});

		// 	} else {
		// 		if (oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"] && oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"].Title) {
		// 			title = "{viewModel>" + oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"].Title.Value.Path + "}";
		// 		}

		// 		if (oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"] && oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"].Description) {
		// 			subtitle = "{viewModel>" + oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"].Description.Value.Path + "}";
		// 		}
		// 		oContent = new sap.m.ObjectIdentifier({
		// 			title: title,
		// 			text: subtitle,
		// 			titleActive: false,
		// 		}).addStyleClass("matchTitleObjectIdentifier sapUiTinyMarginBegin");
		// 	}
		// 	oHBox.addItem(new sap.m.HBox({
		// 		items: [oContent]
		// 	}));
		// 	var buttonLineItem = oLineItems.find(function (obj) { return obj.RecordType == "com.sap.vocabularies.UI.v1.DataFieldForAction" });
		// 	oHBox.addItem(new sap.m.Button({
		// 		icon: "sap-icon://accept",
		// 		text: "{i18n>APPLY}",
		// 		enabled: "{viewModel>/matchDetails/enabled}",
		// 		type: {
		// 			path: "viewModel>mqlfr", formatter: function (mqlfr) {
		// 				var sButtonType;
		// 				if (mqlfr) {
		// 					sButtonType = sap.m.ButtonType.Emphasized;
		// 				} else {
		// 					sButtonType = sap.m.ButtonType.Default;
		// 				}
		// 				return sButtonType;
		// 			}
		// 		},
		// 		press: oController.onMatchResultAction.bind(oController),
		// 	}).data({ "Action": buttonLineItem.Action.String, fromMatchDetails: true, sPath: sPath }));
		// 	oVBox.addItem(oHBox);
		// 	var mtpctField = oLineItems.find(function (obj) { return obj.Value && obj.Value.Path == "mtpct" });
		// 	if (mtpctField) {
		// 		//				Radial Microchart
		// 		var mtpctFieldProp = oTargetEntity.property.find(function (obj) { return obj.name == "mtpct" });
		// 		oVBox.addItem(new sap.m.HBox({
		// 			alignItems: "Center",
		// 			items: [
		// 				new sap.m.Label({
		// 					text: "{i18n>CONFIDENCE} :"
		// 				}).addStyleClass("sapUiTinyMarginBeginEnd"),
		// 				//						new sap.suite.ui.microchart.RadialMicroChart({
		// 				//						size: sap.m.Size.XS,
		// 				//						percentage: {path: "viewModel>mtpct", formatter:function(mtpct){
		// 				//						if(mtpct){
		// 				//						return parseFloat(mtpct)
		// 				//						}else{
		// 				//						return 0;
		// 				//						}
		// 				//						}}
		// 				//						})
		// 				new sap.m.RatingIndicator({
		// 					iconSize: "12px",
		// 					maxValue: 5,
		// 					editable: false,
		// 					value: { path: "viewModel>mtpct", formatter: zvui.work.controller.AnnotationHelper.getRatingValue }
		// 				})
		// 			],
		// 		}).addStyleClass("sapUiSmallMarginTopBottom"));
		// 	}

		// 	oVBox.addItem(new sap.m.Label({
		// 		text: "{i18n>MATCHDETAILS}"
		// 	}).addStyleClass("sapUiTinyMarginBeginEnd"));

		// 	var oTable = new sap.m.Table({
		// 		autoPopinMode: false,
		// 		columns: [
		// 			new sap.m.Column({
		// 				visible: true,
		// 				header: new sap.m.Text({
		// 					text: "{i18n>MATCHINGFIEDS}"
		// 				})
		// 			}),
		// 			new sap.m.Column({
		// 				visible: true,
		// 				header: new sap.m.Text({
		// 					text: "{i18n>SOURCE}"
		// 				})
		// 			}),
		// 			new sap.m.Column({
		// 				visible: true,
		// 				header: new sap.m.Text({
		// 					text: "{i18n>SUGGESTED}"
		// 				})
		// 			})
		// 		]
		// 	});

		// 	oTable.bindAggregation("items", "viewModel>/matchItemsData" + oTargetEntity.name, function (sId, oContext) {
		// 		var contextObject = oContext.getObject();
		// 		var fcat_data = viewModel.getProperty("/matchColumnData");
		// 		var cells = [];
		// 		_.each(fcat_data, function (obj) {
		// 			if (obj.col == "field") {
		// 				var text = new sap.m.Label({ design: "Bold", wrapping: true }).bindProperty("text", "viewModel" + ">" + obj["col"], null, sap.ui.model.BindingMode.OneWay);
		// 				cells.push(text);
		// 			} else if (obj.col == "source") {
		// 				var input = new sap.m.Text({ text: "{" + contextObject.source + "}", wrapping: true });
		// 				//						input.bindElement(oController.DSCSourcePath);
		// 				cells.push(input);
		// 			} else if (obj.col == "target") {
		// 				var input = new sap.m.Text({ text: "{viewModel>" + sPath + "/" + contextObject.target + "}", wrapping: true });
		// 				cells.push(input);
		// 			}
		// 		});
		// 		return new sap.m.ColumnListItem({
		// 			cells: cells,
		// 			type: "Active",
		// 		}).addStyleClass("noPadding");
		// 	});
		// 	oTable.bindElement(oController.DSCSourcePath);

		// 	oVBox.addItem(oTable);

		// 	oVBox.bindElement("viewModel>" + sPath);
		// 	if (oPanel.getContent().length == 2) {
		// 		oPanel.addContent(oVBox);
		// 	} else {
		// 		oPanel.removeContent(2);
		// 		oPanel.addContent(oVBox);
		// 	}

		// },
		// onMatchItemBackPress: function (oEvent) {
		// 	var oController = this;
		// 	var oSource = oEvent.getSource();
		// 	var oPanel = oSource.getParent();
		// 	while (!(oPanel instanceof sap.m.Panel)) {
		// 		oPanel = oPanel.getParent();
		// 	}
		// 	if (!oPanel) return;
		// 	oPanel.getContent()[0].setVisible(true);
		// 	oPanel.getContent()[1].setVisible(true);
		// 	oPanel.removeContent(2);
		// },
		// onMatchNextItem: function (oEvent) {
		// 	var oController = this;
		// 	var oSource = oEvent.getSource();
		// 	var sIcon = oSource.getIcon();
		// 	var oCustomData = oSource.data();
		// 	var oPanel, sPath, length, index, sPathIndex;
		// 	index = oCustomData.sPath.split("/")[oCustomData.sPath.split("/").length - 1];
		// 	sPath = oCustomData.sPath.slice(0, oCustomData.sPath.length - index.length);
		// 	length = oCustomData.length;
		// 	if (sIcon == "sap-icon://navigation-up-arrow") {
		// 		sPathIndex = oCustomData.index - 2;
		// 		index = oCustomData.index - 1;
		// 	} else if (sIcon == "sap-icon://navigation-down-arrow") {
		// 		sPathIndex = oCustomData.index;
		// 		index = oCustomData.index + 1;
		// 	}

		// 	if (index < 1 || index > length) return;
		// 	sPath = sPath + sPathIndex;

		// 	var oPanel = oSource.getParent();
		// 	while (!(oPanel instanceof sap.m.Panel)) {
		// 		oPanel = oPanel.getParent();
		// 	}
		// 	if (!oPanel) return;
		// 	oController.prepareMatchItemDetails(oPanel, sPath, length, index);
		// },
		onTableColumnSelect: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			viewModel.setProperty("/skipBusyIndicator", true);
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			if (oEvent.getParameter("column") && oEvent.getParameter("column").getMenu) {
				var oColumn = oEvent.getParameter("column");
				var oTable = oEvent.getSource();
				var oSmarTable = oTable.getParent();
				var oEntity = oSmarTable.getEntitySet();
				if (!viewModel.getProperty("/footerData_" + oEntity)) {
					viewModel.setProperty("/footerData_" + oEntity, { data: [] });
				}
				var oEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(oEntity).entityType);
				var oColumnKey = oColumn.data("p13nData").columnKey;
				if (oColumnKey && oEntityType["vui.bodc.workspace.AggregationField"] && oEntityType["vui.bodc.workspace.AggregationField"].length > 0) {
					var oField = oEntityType["vui.bodc.workspace.AggregationField"].find(function (obj) { return obj.String.split("/")[0] == oColumnKey });
					if (oField) {
						var oFieldProperties = oMetaModel.getODataProperty(oEntityType, oField.String.split("/")[0]);
						if (oFieldProperties) {
							oColumn.getMenu().onAfterRendering = function (oEvent) {
								if (oEvent && oEvent.srcControl) {
									var oMenu = oEvent.srcControl;
									var existingItems = oMenu.getItems();
									if (!oMenu.data('actionsAdded')) {
										if (oField.String.split("/")[1] == 'X' || oField.String.split("/")[1] == '1') {
											oMenu.addItem(new sap.ui.unified.MenuItem({
												text: "{i18n>TOTAL}",
												tooltip: "{i18n>TOTAL}",
												select: [oController.onAggrAction, oController],
												customData: [
													new sap.ui.core.CustomData({ "key": "entity", "value": oEntity }),
													new sap.ui.core.CustomData({ "key": "field", "value": oColumnKey }),
													new sap.ui.core.CustomData({ "key": "tableId", "value": oSmarTable.getId() }),
													new sap.ui.core.CustomData({ "key": "text", "value": oFieldProperties["com.sap.vocabularies.Common.v1.Label"]["String"] }),
													new sap.ui.core.CustomData({ "key": "operation", "value": "total" })
												]
											}));
										}
										if (oField.String.split("/")[1] == 'X' || oField.String.split("/")[1] == '2') {
											oMenu.addItem(new sap.ui.unified.MenuItem({
												text: "{i18n>AVERAGE}",
												tooltip: "{i18n>AVERAGE}",
												select: [oController.onAggrAction, oController],
												customData: [
													new sap.ui.core.CustomData({ "key": "entity", "value": oEntity }),
													new sap.ui.core.CustomData({ "key": "field", "value": oColumnKey }),
													new sap.ui.core.CustomData({ "key": "tableId", "value": oSmarTable.getId() }),
													new sap.ui.core.CustomData({ "key": "text", "value": oFieldProperties["com.sap.vocabularies.Common.v1.Label"]["String"] }),
													new sap.ui.core.CustomData({ "key": "operation", "value": "average" })
												]
											}));
										}
										oMenu.data('actionsAdded', true);
									} else {
										if (!oTable.getFooter()) {
											var totalMenuItem = existingItems.find(function (obj) { return obj.data("operation") == "total" });
											if (totalMenuItem && totalMenuItem.setIcon) {
												totalMenuItem.setIcon("");
												totalMenuItem.data("selected", false);
											}
											var avgMenuItem = existingItems.find(function (obj) { return obj.data("operation") == "average" });
											if (avgMenuItem && avgMenuItem.setIcon) {
												avgMenuItem.setIcon("");
												avgMenuItem.data("selected", false);
											}
										} else {
											var footerData = viewModel.getProperty("/footerData_" + oEntity + "/data");
											if (footerData && footerData.length > 0) {
												var totalMenuItem = existingItems.find(function (obj) { return obj.data("operation") == "total" });
												if (totalMenuItem) {
													var totalExists = footerData.find(function (obj) {
														if (obj.column == totalMenuItem.data("field") && obj.operation == "total") {
															return obj;
														}
													})
													if (!totalExists) {
														totalMenuItem.setIcon("");
														totalMenuItem.data("selected", false);
													} else {
														totalMenuItem.setIcon("sap-icon://accept");
														totalMenuItem.data("selected", true);
													}
												}
												var avgMenuItem = existingItems.find(function (obj) { return obj.data("operation") == "average" });
												if (avgMenuItem) {
													var avgExists = footerData.find(function (obj) {
														if (obj.column == totalMenuItem.data("field") && obj.operation == "average") {
															return obj;
														}
													})
													if (!avgExists) {
														avgMenuItem.setIcon("");
														avgMenuItem.data("selected", false);
													} else {
														avgMenuItem.setIcon("sap-icon://accept");
														avgMenuItem.data("selected", true);
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
		},
		onTableColumnSelect1: function (oEvent) {
			/*
			 * var oController = this; if(oEvent.getParameter("column") &&
			 * oEvent.getParameter("column").getMenu){
			 * oEvent.getParameter("column").getMenu()._addFilterMenuItem =
			 * function(){ //removing filter from column menu } }
			 */
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			viewModel.setProperty("/skipBusyIndicator", true);
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			if (oEvent.getParameter("column")) {
				var oColumn = oEvent.getParameter("column");
				oEvent.getParameter("column")._openMenu = function (oDomRef) {
					var oList = new sap.m.List();
					if (oColumn.isSortableByMenu()) {
						oList.addItem(
							new sap.m.StandardListItem({
								icon: "sap-icon://sort-ascending",
								title: sap.ui.table.utils.TableUtils.getResourceText("TBL_SORT_ASC"),
								type: "Active",
								press: function (oEvent) {
									oEvent.getSource().getParent().getParent().data("fromColumnMenu", true);
									oEvent.getSource().getParent().getParent().close();
									viewModel.setProperty("/skipTableCallFromBatchRequestSent", true);
									oColumn.sort(false, oEvent.getParameter("ctrlKey") === true);
								}
							}).addStyleClass("columnMenuStandListItem")
						);
						oList.addItem(
							new sap.m.StandardListItem({
								icon: "sap-icon://sort-descending",
								title: sap.ui.table.utils.TableUtils.getResourceText("TBL_SORT_DESC"),
								type: "Active",
								press: function (oEvent) {
									oEvent.getSource().getParent().getParent().data("fromColumnMenu", true);
									oEvent.getSource().getParent().getParent().close();
									viewModel.setProperty("/skipTableCallFromBatchRequestSent", true);
									oColumn.sort(true, oEvent.getParameter("ctrlKey") === true);
								}
							}).addStyleClass("columnMenuStandListItem")
						);
					}
					var oTable = oColumn.getParent();
					var bCustomFilterEnabled = oTable && oTable.getEnableCustomFilter();
					if (bCustomFilterEnabled) {
						oList.addItem(
							new sap.m.StandardListItem({
								icon: "sap-icon://filter",
								title: sap.ui.table.utils.TableUtils.getResourceText("TBL_FILTER_ITEM"),
								type: "Active",
								press: function (oEvent) {
									oEvent.getSource().getParent().getParent().data("fromColumnMenu", true);
									oEvent.getSource().getParent().getParent().close();
									viewModel.setProperty("/skipTableCallFromBatchRequestSent", true);
									oTable.fireCustomFilter({
										column: oColumn
									});
								}
							}).addStyleClass("columnMenuStandListItem")
						);
					}
					if (oColumn.isGroupable()) {
						oList.addItem(
							new sap.m.StandardListItem({
								title: sap.ui.table.utils.TableUtils.getResourceText("TBL_GROUP"),
								type: "Active",
								press: function (oEvent) {
									oEvent.getSource().getParent().getParent().data("fromColumnMenu", true);
									oEvent.getSource().getParent().getParent().close()
									viewModel.setProperty("/skipTableCallFromBatchRequestSent", true);
									oTable.setGroupBy(oColumn);
								}
							})
						);
					}

					var bColumnFreezeEnabled = oTable && oTable.getEnableColumnFreeze();
					if (bColumnFreezeEnabled) {
						var iColumnIndex = oColumn.getIndex();
						var bIsFixedColumn = iColumnIndex + sap.ui.table.utils.TableUtils.Column.getHeaderSpan(oColumn) == oTable.getComputedFixedColumnCount();
						oList.addItem(
							new sap.m.StandardListItem({
								title: sap.ui.table.utils.TableUtils.getResourceText(bIsFixedColumn ? "TBL_UNFREEZE" : "TBL_FREEZE"),
								type: "Active",
								press: function (oEvent) {
									oEvent.getSource().getParent().getParent().data("fromColumnMenu", true);
									oEvent.getSource().getParent().getParent().close()
									viewModel.setProperty("/skipTableCallFromBatchRequestSent", true);
									var bExecuteDefault = oTable.fireColumnFreeze({
										column: oColumn
									});
									if (bExecuteDefault) {
										if (bIsFixedColumn) {
											oTable.setFixedColumnCount(0);
										} else {
											oTable.setFixedColumnCount(iColumnIndex + 1);
										}
									}
								}
							})
						);
					}
					if (oColumn.isFilterableByMenu() && !viewModel.getProperty("/modelChanged")) {
						// Clear Filters
						var filterExists = oTable.getBinding("rows").aApplicationFilters.find(function (obj) {
							return obj.sPath == oColumn.data("p13nData").columnKey
						});
						if (filterExists) {
							oList.addItem(
								new sap.m.StandardListItem({
									icon: "sap-icon://clear-filter",
									title: "{i18n>CLEARFILTER}",
									type: "Active",
									press: function (oEvent) {
										viewModel.setProperty("/resetAnalyticalHeader", true); // for
										// refreshing
										// count
										// of
										// analytical
										// Table
										// after
										// search
										oEvent.getSource().getParent().getParent().data("fromColumnMenu", true);
										oEvent.getSource().getParent().getParent().close();
										viewModel.setProperty("/skipTableCallFromBatchRequestSent", true);
										var functionImport = oMetaModel.getODataFunctionImport("Clear_Filter");
										if (!functionImport)
											return;

										var urlParameters = {};
										urlParameters["fname"] = oColumn.data("p13nData").columnKey;
										urlParameters['sectn'] = oTable.getParent().getEntitySet();

										oModel.callFunction("/" + functionImport.name, {
											method: "POST",
											batchGroupId: "changes",
											urlParameters: urlParameters
										});
										oModel.submitChanges({
											batchGroupId: "changes",
											success: function (oData, response) {
												oController.showMessagePopover(oController.messageButtonId);
												var aFilters = [];
												var oBinding = oTable.getBinding("rows");
												for (var i = 0; i < oBinding.aApplicationFilters.length; i++) {
													if (oBinding.aApplicationFilters[i].sPath !== oColumn.data("p13nData").columnKey) {
														aFilters.push(oBinding.aApplicationFilters[i]);
													}
												}
												// if(aFilters.length > 0){
												oBinding.filter(aFilters, "Application");
												oBinding.aApplicationFilters = aFilters;
												oColumn.setFiltered(false);
												// }

											}
										});
									}
								}).addStyleClass("columnMenuStandListItem")
							);
						}
						var filterVBox = new sap.m.Panel().addStyleClass("noPadding vistexTableColumnFilterPanel");

						filterVBox.addContent(
							new sap.m.SearchField({
								search: oController.onColumnMenuFilterSearch.bind(oController),
								width: "100%"
							})
						);

						filterVBox.addContent(
							new sap.m.CheckBox({
								text: "{i18n>SELECT_ALL}",
								selected: "{viewModel>/tableColumnuniqueValues/selectAll}",
								partiallySelected: "{viewModel>/tableColumnuniqueValues/partiallySelected}",
								select: oController.onColumnMenuFilterSelectionChange.bind(oController)
							}).addStyleClass("columnMenuSelectAll").data("fromItem", false)
						);
						filterVBox.addContent(
							new sap.m.CheckBox({
								text: "{i18n>SELECT_ALL_SEARCHED}",
								selected: "{viewModel>/tableColumnuniqueValues/selectAll_searched}",
								partiallySelected: "{viewModel>/tableColumnuniqueValues/partiallySelected_searched}",
								select: oController.onColumnMenuFilterSelectionChange.bind(oController),
								visible: false
							}).addStyleClass("columnMenuSelectAll").data({ "fromItem": false, "fromSelectAllSearched": true })
						);
						viewModel.setProperty("/tableColumnuniqueValues", {});
						// viewModel.setProperty("/tableColumnuniqueValues/partiallySelected",false);
						// viewModel.setProperty("/tableColumnuniqueValues/selectAll",true);
						var filterItemsVBox = new sap.ui.comp.smartlist.SmartList({
							enableAutoBinding: true,
							entitySet: "LocalFilter",
							beforeRebindList: function (oSource) {
								var binding = oSource.getParameter("bindingParams");
								var oFilter = new sap.ui.model.Filter("fname", sap.ui.model.FilterOperator.EQ, oColumn.data("p13nData").columnKey);
								if (!binding.filters) binding.filters = [];
								binding.filters.push(oFilter);
								oFilter = new sap.ui.model.Filter("sectn", sap.ui.model.FilterOperator.EQ, oTable.getParent().getEntitySet());
								binding.filters.push(oFilter);
							},
							dataReceived: function (oEvent) {
								oEvent.getSource().getParent().getParent().getContent()[3].getContent()[0].getList().updateItems();
								//VHD#740535->Error as Workspace encountered internal server error on cal run post - Start
								var count;
								if (oEvent.getSource().getTable() instanceof sap.m.Table) {
									count = oEvent.getSource().getTable().getMaxItemsCount();
								} else if (oEvent.getSource().getTable() instanceof sap.ui.table.Table) {
									count = oEvent.getSource().getTable().getBinding("rows").getLength();
								}
								//VHD#740535->Error as Workspace encountered internal server error on cal run post - End
								var oCheckbox;
								if (oEvent.getSource().getParent().getParent().getContent()[1].getVisible()) {
									oCheckbox = oEvent.getSource().getParent().getParent().getContent()[1];
								} else {
									oCheckbox = oEvent.getSource().getParent().getParent().getContent()[2];
								}
								if (!oCheckbox.data("Label")) {
									oCheckbox.data("Label", oCheckbox.getText());
								}
								if (count > 0) {
									oCheckbox.setText(oCheckbox.data("Label") + " (" + count + ")");
								} else {
									oCheckbox.setText(oCheckbox.data("Label"));
								}

								var oContent = oEvent.getSource();
								// var oContexts =
								// oContent.getList().getBindingInfo("items").binding.getContexts();
								if (oEvent.getSource().getList().getBindingInfo("items").binding.iStartIndex == 0) {
									var data = oEvent.getParameter("mParameters").data.results;
									var selectedItem = data.find(function (obj) {
										return obj.selct == "X";
									});
									var unselectedItem = data.find(function (obj) {
										return obj.selct != "X";
									});

									if (selectedItem && unselectedItem) {
										viewModel.setProperty("/tableColumnuniqueValues/partiallySelected", true);
										viewModel.setProperty("/tableColumnuniqueValues/selectAll", true);
									} else if (selectedItem) {
										viewModel.setProperty("/tableColumnuniqueValues/partiallySelected", false);
										viewModel.setProperty("/tableColumnuniqueValues/selectAll", true);
									} else if (unselectedItem) {
										viewModel.setProperty("/tableColumnuniqueValues/partiallySelected", false);
										viewModel.setProperty("/tableColumnuniqueValues/selectAll", false);
									}

									if (selectedItem && unselectedItem) {
										viewModel.setProperty("/tableColumnuniqueValues/partiallySelected_searched", true);
										viewModel.setProperty("/tableColumnuniqueValues/selectAll_searched", true);
									} else if (selectedItem) {
										viewModel.setProperty("/tableColumnuniqueValues/partiallySelected_searched", false);
										viewModel.setProperty("/tableColumnuniqueValues/selectAll_searched", true);
									} else if (unselectedItem) {
										viewModel.setProperty("/tableColumnuniqueValues/partiallySelected_searched", false);
										viewModel.setProperty("/tableColumnuniqueValues/selectAll_searched", false);
									}
								}

								/*
								 * var oContent = oEvent.getSource();
								 * while(!(oContent instanceof sap.m.Popover)){
								 * oContent = oContent.getParent(); }
								 * if(oContent && !oContent.isOpen()){
								 * oContent.openBy(oColumn); }
								 */
							},
							listItemTemplate: new sap.m.CustomListItem({
								content: new sap.m.CheckBox({
									text: "{descr}",
									selected: {
										path: "selct", formatter: function (selected) {
											if (selected == "X") {
												return true;
											}
											return false;
										}
									},
									select: oController.onColumnMenuFilterSelectionChange.bind(oController)
								}).data({ "fromItem": true, "value": "{value}" })
							})
						}).data({
							"changed": false,
							"fname": oColumn.data("p13nData").columnKey,
							"sectn": oTable.getParent().getEntitySet()
						});
						filterItemsVBox._oToolbar.setVisible(false);
						filterItemsVBox.getList().setShowSeparators("None");
						filterItemsVBox.setModel(oController.getView().getModel());
						filterVBox.addContent(new sap.m.ScrollContainer({
							content: [
								filterItemsVBox
							],
							vertical: true,
							height: "200px"
						}));
						oList.addItem(new sap.m.CustomListItem({
							content: filterVBox
						}));
					}
					var oPopover = new sap.m.Popover({
						showHeader: false,
						showArrow: true,
						placement: sap.m.PlacementType.Auto,
						//						contentWidth: "200px",
						content: oList,
						footer: new sap.m.Toolbar({
							visible: oColumn.isFilterableByMenu() && !viewModel.getProperty("/modelChanged"),
							content: [
								new sap.m.ToolbarSpacer(),
								new sap.m.Button({
									text: "{i18n>OK}",
									press: function (oEvent) {
										viewModel.setProperty("/resetAnalyticalHeader", true); // for
										// refreshing
										// count
										// of
										// analytical
										// Table
										// after
										// search
										viewModel.setProperty("/skipTableCallFromBatchRequestSent", true);
										var oContent = oEvent.getSource();
										while (!(oContent instanceof sap.m.Popover)) {
											oContent = oContent.getParent();
										}
										var oList = oContent.getContent()[0].getItems()[oContent.getContent()[0].getItems().length - 1].getContent()[0].getContent()[3].getContent()[0].getList();
										oContent.data("okPressed", true);
										var searchText = oContent.getContent()[0].getItems()[oContent.getContent()[0].getItems().length - 1].getContent()[0].getContent()[0].getValue();
										var changed = oList.getParent().data("changed");
										//										var oContexts = oList.getBindingInfo("items").binding.getContexts();
										// Get Selected Items
										//										var selectedItems = oContexts.filter(function(context){
										//										var select = oModel.getProperty(context.getPath() + "/selct");
										//										return select && select == "X";
										//										});
										//										//Get Unselected Items
										//										var unselectedItems = oContexts.filter(function(context){
										//										var select = oModel.getProperty(context.getPath() + "/selct");
										//										return !select || select != "X";
										//										});

										var oItems = oList.getItems();

										var selectedItems = oItems.filter(function (item) {
											return item.getContent()[0].getSelected();
										});
										var unselectedItems = oItems.filter(function (item) {
											return !item.getContent()[0].getSelected();
										});

										var aFilters = [];
										var oBinding = oTable.getBinding("rows");
										for (var i = 0; i < oBinding.aApplicationFilters.length; i++) {
											if (oBinding.aApplicationFilters[i].sPath !== oColumn.data("p13nData").columnKey) {
												aFilters.push(oBinding.aApplicationFilters[i]);
											}
										}

										if (selectedItems.length > 0 && unselectedItems.length > 0) {
											if (unselectedItems.length < selectedItems.length) {
												for (var i = 0; i < unselectedItems.length; i++) {
													//													var value = oModel.getProperty(unselectedItems[i].getPath() + "/value");
													var value = unselectedItems[i].getContent()[0].data("value");
													var filter = new sap.ui.model.Filter(oColumn.data("p13nData").columnKey, sap.ui.model.FilterOperator.NE, value);
													aFilters.push(filter);
												}
											} else {
												for (var i = 0; i < selectedItems.length; i++) {
													//													var value = oModel.getProperty(selectedItems[i].getPath() + "/value");
													var value = selectedItems[i].getContent()[0].data("value");
													var filter = new sap.ui.model.Filter(oColumn.data("p13nData").columnKey, sap.ui.model.FilterOperator.EQ, value);
													aFilters.push(filter);
												}
											}
											if (aFilters.length > 0) {
												oBinding.filter(aFilters, "Application");
												oBinding.aApplicationFilters = aFilters;
												oColumn.setFiltered(true);
											}
										} else if (selectedItems.length > 0) {
											if (searchText) {
												var filter = new sap.ui.model.Filter(oColumn.data("p13nData").columnKey, sap.ui.model.FilterOperator.EQ, "*" + searchText + "*");
												aFilters.push(filter);
												oBinding.filter(aFilters, "Application");
												oBinding.aApplicationFilters = aFilters;
												oColumn.setFiltered(true);
											} else if (changed) {
												var functionImport = oMetaModel.getODataFunctionImport("Clear_Filter");
												if (!functionImport)
													return;

												var urlParameters = {};
												urlParameters["fname"] = oColumn.data("p13nData").columnKey;
												urlParameters['sectn'] = oTable.getParent().getEntitySet();

												oModel.callFunction("/" + functionImport.name, {
													method: "POST",
													batchGroupId: "changes",
													urlParameters: urlParameters
												});
												oModel.submitChanges({
													batchGroupId: "changes",
													success: function (oData, response) {
														oController.showMessagePopover(oController.messageButtonId);
														var aFilters = [];
														var filterExists = oTable.getBinding("rows").aApplicationFilters.find(function (obj) {
															return obj.sPath == oColumn.data("p13nData").columnKey
														});
														if (filterExists) {
															for (var i = 0; i < oBinding.aApplicationFilters.length; i++) {
																if (oBinding.aApplicationFilters[i].sPath !== oColumn.data("p13nData").columnKey) {
																	aFilters.push(oBinding.aApplicationFilters[i]);
																}
															}
															//															if(aFilters.length > 0){
															oBinding.filter(aFilters, "Application");
															oBinding.aApplicationFilters = aFilters;
															oColumn.setFiltered(false);
															oController.refreshSmartTable(oTable.getParent());
															//															}
														}

													}
												});

											}
										} else if (unselectedItems.length > 0) {

										}
										oEvent.getSource().getParent().getParent().close();
										viewModel.setProperty("/skipBusyIndicator", false);
									}
								}),
								new sap.m.Button({
									text: "{i18n>CANCEL}",
									press: function () {
										var oContent = oEvent.getSource();
										while (!(oContent instanceof sap.m.Popover)) {
											oContent = oContent.getParent();
										}
										if (oContent) oContent.close();
										var functionImport = oMetaModel.getODataFunctionImport("Cancel_Filter");
										if (!functionImport) {
											viewModel.setProperty("/skipBusyIndicator", false);
											return;
										}

										var urlParameters = {};
										urlParameters["fname"] = oColumn.data("p13nData").columnKey;
										urlParameters['sectn'] = oTable.getParent().getEntitySet();

										oModel.callFunction("/" + functionImport.name, {
											method: "POST",
											batchGroupId: "changes",
											urlParameters: urlParameters
										});
										oModel.submitChanges({
											batchGroupId: "changes",
											success: function (oData, response) {
												oController.showMessagePopover(oController.messageButtonId);
												viewModel.setProperty("/skipBusyIndicator", false);
											}
										});
									}
								})
							]
						})
					});
					oPopover.setModel(viewModel, "viewModel");
					oPopover.attachAfterClose(function (oEvent) {
						var oColumnUniqueValueChangedContext = viewModel.getProperty("/columnUniqueValueChangedContext");
						if (oColumnUniqueValueChangedContext) {
							for (var i = 0; i < oColumnUniqueValueChangedContext.length; i++) {
								oModel.deleteCreatedEntry(oColumnUniqueValueChangedContext[i]);
							}
							if (oEvent.getSource().data("okPressed") || oEvent.getSource().data("fromColumnMenu")) return;
							var functionImport = oMetaModel.getODataFunctionImport("Cancel_Filter");
							if (!functionImport) {
								viewModel.setProperty("/skipBusyIndicator", false);
								return;
							}

							var urlParameters = {};
							urlParameters["fname"] = oColumn.data("p13nData").columnKey;
							urlParameters['sectn'] = oTable.getParent().getEntitySet();
							oModel.resetChanges();
							oModel.callFunction("/" + functionImport.name, {
								method: "POST",
								batchGroupId: "changes",
								urlParameters: urlParameters
							});
							oModel.submitChanges({
								batchGroupId: "changes",
								success: function (oData, response) {
									oController.showMessagePopover(oController.messageButtonId);
									viewModel.setProperty("/skipBusyIndicator", false);
								}
							});
						}
					});
					oPopover.setModel(oController.getView().getModel("i18n"), "i18n");
					//					if(!oColumn.isFilterableByMenu() || viewModel.getProperty("/modelChanged")){
					oPopover.openBy(oColumn);
					//					}
					return true;
				}
			}
		},
		onColumnMenuFilterSelectionChange: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var selct = oEvent.getParameter("selected") ? "X" : "";
			var oColumnUniqueValueChangedContext;
			if (!viewModel.getProperty("columnUniqueValueChangedContext")) {
				oColumnUniqueValueChangedContext = [];
				viewModel.setProperty("/columnUniqueValueChangedContext", oColumnUniqueValueChangedContext);
			} else {
				oColumnUniqueValueChangedContext = viewModel.getProperty("/columnUniqueValueChangedContext");
			}
			var fromItem = oEvent.getSource().data("fromItem");
			if (fromItem) {
				var oContent = oEvent.getSource();
				while (!(oContent instanceof sap.ui.comp.smartlist.SmartList)) {
					oContent = oContent.getParent();
				}
				oContent.data("changed", true);
				//				var oContexts =
				//				oContent.getList().getBindingInfo("items").binding.getContexts();
				var oItems = oContent.getList().getItems();
				//				oModel.setProperty(oEvent.getSource().getParent().getBindingContextPath() +
				//				"/selct", selct);
				oColumnUniqueValueChangedContext.push(oEvent.getSource().getParent().getBindingContext());
				//				var selectedItem = oContexts.find(function(context){
				//				var select = oModel.getProperty(context.getPath() + "/selct");
				//				return select && select == "X";
				//				});
				//				var unselectedItem = oContexts.find(function(context){
				//				var select = oModel.getProperty(context.getPath() + "/selct");
				//				return !select || select != "X";
				//				});

				var selectedItem = oItems.find(function (item) {
					return item.getContent()[0].getSelected();
				});
				var unselectedItem = oItems.find(function (item) {
					return !item.getContent()[0].getSelected();
				});

				if (selectedItem && unselectedItem) {
					viewModel.setProperty("/tableColumnuniqueValues/partiallySelected", true);
					viewModel.setProperty("/tableColumnuniqueValues/selectAll", true);
				} else if (selectedItem) {
					viewModel.setProperty("/tableColumnuniqueValues/partiallySelected", false);
					viewModel.setProperty("/tableColumnuniqueValues/selectAll", true);
				} else if (unselectedItem) {
					viewModel.setProperty("/tableColumnuniqueValues/partiallySelected", false);
					viewModel.setProperty("/tableColumnuniqueValues/selectAll", false);
				}

				if (selectedItem && unselectedItem) {
					viewModel.setProperty("/tableColumnuniqueValues/partiallySelected_searched", true);
					viewModel.setProperty("/tableColumnuniqueValues/selectAll_searched", true);
				} else if (selectedItem) {
					viewModel.setProperty("/tableColumnuniqueValues/partiallySelected_searched", false);
					viewModel.setProperty("/tableColumnuniqueValues/selectAll_searched", true);
				} else if (unselectedItem) {
					viewModel.setProperty("/tableColumnuniqueValues/partiallySelected_searched", false);
					viewModel.setProperty("/tableColumnuniqueValues/selectAll_searched", false);
				}
			} else {
				var oList = oEvent.getSource().getParent().getContent()[3].getContent()[0].getList();
				//VHD#740535->Error as Workspace encountered internal server error on cal run post - Start
				var count;
				if (oList.getParent().getTable() instanceof sap.m.Table) {
					count = oList.getParent().getTable().getMaxItemsCount();
				} else if (oList.getParent().getTable() instanceof sap.ui.table.Table) {
					count = oList.getParent().getTable().getBinding("rows").getLength();
				}
				//VHD#740535->Error as Workspace encountered internal server error on cal run post - End
				if (count > oList.getVisibleItems().length) {
					var oContexts = oList.getBindingInfo("items").binding.getContexts();
					for (var i = 0; i < oContexts.length; i++) {
						oColumnUniqueValueChangedContext.push(oContexts[i]);
					}
					if (oList.getBindingInfo("items").binding.sCustomParams.indexOf("&selected")) {
						oList.getBindingInfo("items").binding.sCustomParams =
							oList.getBindingInfo("items").binding.sCustomParams.slice(0, 17) + "&selected=" +
							oEvent.getParameter("selected");
					} else {
						oList.getBindingInfo("items").binding.sCustomParams += "&selected=" + oEvent.getParameter("selected");
					}
					oList.getParent().rebindList();
				} else {
					var oContexts = oList.getBindingInfo("items").binding.getContexts();
					for (var i = 0; i < oContexts.length; i++) {
						if (oModel.getProperty(oContexts[i].getPath()))
							oModel.setProperty(oContexts[i].getPath() + "/selct", selct);
						oColumnUniqueValueChangedContext.push(oContexts[i]);
					}
				}
				oList.getParent().data("changed", true);
			}
			viewModel.setProperty("/columnUniqueValueChangedContext", oColumnUniqueValueChangedContext);
		},
		onColumnMenuFilterSearch: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var aFilters = [];
			var sQuery = oEvent.getSource().getValue();
			var array = viewModel.getProperty("/tableColumnuniqueValues/values");
			//			// update list binding
			var oList = oEvent.getSource().getParent().getContent()[3].getContent()[0].getList();
			var oBinding = oList.getBinding("items");
			for (var i = 0; i < oBinding.aApplicationFilters.length; i++) {
				if (oBinding.aApplicationFilters[i].sPath == "fname" || oBinding.aApplicationFilters[i].sPath == "sectn") {
					aFilters.push(oBinding.aApplicationFilters[i]);
				}
			}
			if (sQuery && sQuery.length > 0) {
				var filter = new sap.ui.model.Filter("value", sap.ui.model.FilterOperator.Contains, sQuery);
				aFilters.push(filter);
			}
			oBinding.filter(aFilters, "Application");
			oList.updateItems();
			if (sQuery) {
				oEvent.getSource().getParent().getContent()[1].setVisible(false);
				oEvent.getSource().getParent().getContent()[2].setVisible(true);

				var oContexts = oList.getBindingInfo("items").binding.getContexts();

				var selectedItem = oContexts.find(function (context) {
					var select = oModel.getProperty(context.getPath() + "/selct");
					return select && select == "X";
				});
				var unselectedItem = oContexts.find(function (context) {
					var select = oModel.getProperty(context.getPath() + "/selct");
					return !select || select != "X";
				});
				if (selectedItem && unselectedItem) {
					viewModel.setProperty("/tableColumnuniqueValues/partiallySelected_searched", true);
					viewModel.setProperty("/tableColumnuniqueValues/selectAll_searched", true);
				} else if (selectedItem) {
					viewModel.setProperty("/tableColumnuniqueValues/partiallySelected_searched", false);
					viewModel.setProperty("/tableColumnuniqueValues/selectAll_searched", true);
				} else if (unselectedItem) {
					viewModel.setProperty("/tableColumnuniqueValues/partiallySelected_searched", false);
					viewModel.setProperty("/tableColumnuniqueValues/selectAll_searched", false);
				}
			} else {
				oEvent.getSource().getParent().getContent()[1].setVisible(true);
				oEvent.getSource().getParent().getContent()[2].setVisible(false);
			}
		},

		// Triggering metadata request
		getHighlightedText: function (source, target, caseSensitive) {
			var indices = [],
				targetLower;
			var output = target;
			if (source && target) {
				var sourceSplit = source.split(" ");
				for (var i = 0; i < sourceSplit.length; i++) {
					var searchStr = sourceSplit[i];
					var searchStrLen = searchStr.length;
					if (searchStrLen == 0) {
						return output;
					}
					var startIndex = 0,
						index;
					if (!caseSensitive) {
						targetLower = target.toLowerCase();
						searchStr = searchStr.toLowerCase();
					}
					while ((index = targetLower.indexOf(searchStr, startIndex)) > -1) {
						var replaceText = target.slice(index, index + searchStr.length);
						output = output.replace(
							new RegExp(replaceText, "g"),
							"@#&" + replaceText + "@&#"
						);
						indices.push(index);
						startIndex = index + searchStrLen;
					}
				}
				output = output.replace(
					new RegExp("@#&", "g"),
					"<span class='highlightMatchText'>"
				);
				output = output.replace(new RegExp("@&#", "g"), "</span>");
			}
			//		    return indices;
			return output;
		},
		//Triggering Metadata request
		// Duplication Changes -- Start
		duplicationSectionPrepare: function (duplicationEntities, itemTabBar) {
			var oController = this;
			oController.duplicationSectionContext = {};
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var oDuplicationPathMenu = new sap.m.Menu();
			var oToolsMenu = new sap.m.Menu();
			var oDuplicationPaths = [];
			var oEntitySet, oEntityType, duplicationResultSelectEnabled;
			var viewModel = oController.getView().getModel("viewModel");
			var duplicatesTabBarItem = itemTabBar.getItems().find(function (item) {
				return item.data("name") == "duplicates";
			});
			if (!duplicatesTabBarItem) return;
			//			duplicatesTabBarItem.removeAllContent();
			//			Changes to remove apply button and send apply action directly on change
			//			duplicatesTabBarItem.getContent()[1].removeAllContent();
			if (duplicatesTabBarItem) {
				duplicatesTabBarItem.removeAllContent();
			}

			//
			viewModel.setProperty("/duplicationDetails", {});

			var mainTableSelectedPath = viewModel.getProperty(
				"/mainTableSelectedPath"
			);
			var mainTableSelectedRowData = oModel.getProperty(
				mainTableSelectedPath
			);
			if (mainTableSelectedRowData.edtst !== "1") {
				duplicationResultSelectEnabled = false;
			} else {
				duplicationResultSelectEnabled = true;
			}

			viewModel.setProperty(
				"/duplicationDetails/enabled",
				duplicationResultSelectEnabled
			);
			var oListItems = [];
			for (var i = 0; i < duplicationEntities.length; i++) {
				oEntitySet = oMetaModel.getODataEntitySet(duplicationEntities[i]);
				if (oEntitySet && oEntitySet.entityType) {
					oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
				}
				if (
					oEntityType &&
					oEntityType["com.sap.vocabularies.UI.v1.HeaderInfo"]
				) {
					var item = new sap.m.StandardListItem({
						title:
							oEntityType["com.sap.vocabularies.UI.v1.HeaderInfo"].TypeName
								.String,
						type: "Active",
						highlight: {
							parts: [
								{ value: duplicationEntities[i] },
								{ path: "viewModel>/duplicationDetails/headerEntity" },
							],
							formatter: function (key, selectedKey) {
								if (key == selectedKey) {
									return "Success";
								}
								return "None";
							},
						},
						press: oController.duplicationPathSelect.bind(oController),
					}).data({
						name: duplicationEntities[i],
						entityType: oEntitySet.entityType,
						tabBarId: itemTabBar.getId(),
						source: "mPath",
					});
					oListItems.push(item);

					oDuplicationPaths.push({
						name: duplicationEntities[i],
						text: oEntityType["com.sap.vocabularies.UI.v1.HeaderInfo"]
							.TypeName.String,
						entityType: oEntitySet.entityType,
						tabBarId: itemTabBar.getId(),
					});
				}
			}

			if (oDuplicationPaths.length > 0) {
				viewModel.setProperty(
					"/duplicationDetails/duplicationPaths",
					oDuplicationPaths
				);
			}

			oController.duplicationSectionContext.duplicationPathPopup =
				new sap.m.Popover({

					showHeader: false,
					showArrow: false,
					placement: sap.m.PlacementType.Bottom,
					content: [
						new sap.m.List({
							showSeparators: "None",
							items: oListItems,
						}),
					],
				});
			oController.getView().addDependent(oController.duplicationSectionContext.duplicationPathPopup);

			var oControl = new sap.m.VBox();
			var oToolbar = new sap.m.Toolbar({
				content: [
					new sap.m.HBox({
						alignItems: "Center",
						items: [
							new sap.m.Label({
								text: "{i18n>MATCHFOR}:",
							}),
							new sap.m.Button({
								icon: "sap-icon://slim-arrow-down",
								iconFirst: false,
								type: sap.m.ButtonType.Transparent,
								press: function (oEvent) {
									oController.duplicationSectionContext.duplicationPathPopup.openBy(
										oEvent.getSource()
									);
								},
							}),

						],
					}),
					// new sap.m.ToolbarSpacer(),
					// new sap.m.Button({
					// 	icon: "sap-icon://sys-find",
					// 	iconFirst: false,
					// 	type: sap.m.ButtonType.Transparent,
					// 	press: function (oEvent) {
					// 		sourceTablePopover.openBy(oEvent.getSource());
					// 	},
					// }),
				],
			});

			oControl.addItem(oToolbar);
			duplicatesTabBarItem.addContent(oControl);

			//			Changes to remove apply button and send apply action directly on change
			//			duplicatesTabBarItem.getContent()[1].addContent(oControl);
			// if(duplicatesTabBarItem && duplicatesTabBarItem.getContent()[0])
			// {
			// duplicatesTabBarItem.getContent()[0].addContent(oControl);
			// }
			//
		},
		duplicationPathSelect: function (oEvent) {
			var oController = this;
			var oSource = oEvent.getSource();
			var oDuplicationPathData = oSource.data();

			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var oRow_Id = oEvent.getSource().getBindingContext().getObject().row_id;
			var itemTabBar = sap.ui
				.getCore()
				.getElementById(oDuplicationPathData.tabBarId);
			var viewModel = oController.getView().getModel("viewModel");

			var previousHeaderEntity = viewModel.getProperty(
				"/duplicationDetails/headerEntity"
			);
			var previousmatchGroupKey = viewModel.getProperty(
				"/duplicationDetails/matchGroupKey"
			);

			var bundle = oController.getView().getModel("i18n").getResourceBundle();
			var oEntitySet, oEntityType, oTargetEntity;

			oEntityType = oMetaModel.getODataEntityType(
				oDuplicationPathData.entityType
			);
			//			var oToolbar = sap.ui.getCore().getElementById(oDuplicationPathData.tabBarId).getItems()[2].getContent()[0].getItems()[0];
			var duplicatesTabBarItem = sap.ui
				.getCore()
				.getElementById(oDuplicationPathData.tabBarId)
				.getItems()
				.find(function (item) {
					return item.data("name") == "duplicates";
				});
			//			var oToolbar = duplicatesTabBarItem.getContent()[0].getItems()[0];
			//			Changes to remove apply button and send apply action directly on change
			//			var oToolbar = duplicatesTabBarItem.getContent()[1].getContent()[0].getItems()[0];
			var oToolbar;
			if (duplicatesTabBarItem && duplicatesTabBarItem.getContent()[0]) {
				oToolbar = duplicatesTabBarItem.getContent()[0].getItems()[0];
			}

			//
			//			if(previousHeaderEntity != oDuplicationPathData.entityType){
			viewModel.setProperty("/duplicationDetails/duplicationResults", []);
			var oMenuButton, text;
			if (oToolbar && oToolbar.getContent()[0] && oToolbar.getContent()[0].getItems()[1]) {
				oMenuButton = oToolbar.getContent()[0].getItems()[1];
			}

			text = oSource.getTitle();
			if (oMenuButton) {
				oMenuButton.setText(text);
				oMenuButton.setTooltip(text);
			}

			//				if(text.length > 12){
			//                    oMenuButton.setWidth("7rem");
			//				}else{
			//					oMenuButton.setWidth("");
			//				}
			viewModel.setProperty(
				"/duplicationDetails/headerEntity",
				oDuplicationPathData.entityType
			);
			viewModel.setProperty(
				"/duplicationDetails/headerEntityName",
				oDuplicationPathData.name
			);
			var urlParameters = {};
			var oColumns = [],
				oTableEntity = oEntityType;
			var oLineItems = oTableEntity["com.sap.vocabularies.UI.v1.LineItem"];
			var columnListItemType = "Navigation";
			var matchGroupKey = viewModel.getProperty(
				"/duplicationDetails/matchGroupKey"
			);
			var sourcefieldAnnotation;
			var oSourceTable = new sap.m.Table({
				headerToolbar: new sap.m.OverflowToolbar({
					content: [
						new sap.m.Title({
							text: "{i18n>MATCHCRITERIA}",
						}),
					],
				}),
				columns: [
					new sap.m.Column({
						header: new sap.m.Text({
							text: "{i18n>FIELD}",
						}),
						visible: true,
						demandPopin: true
					}),
					new sap.m.Column({
						header: new sap.m.Text({
							text: "{i18n>VALUE}",
						}),
						visible: true,
						demandPopin: true
					}),
				],
			});
			var sourceEntity =
				oController.DSCSourcePath.split("/")[
					oController.DSCSourcePath.split("/").length - 1
				].split("(")[0];
			var oSourceEntityType = oMetaModel.getODataEntityType(
				oMetaModel.getODataEntitySet(sourceEntity).entityType
			);
			var oMatchCriteriaColumnData = [
				{ col: "row1", label: "Field" },
				{ col: "row2", label: "Value" },
			];
			viewModel.setProperty(
				"/duplicationDetails/matchCriteriaColumnData",
				oMatchCriteriaColumnData
			);
			var tableData = [];
			var oMatchCriteriaLineItems =
				oTableEntity["vui.bodc.workspace.DuplicationCriteria"];
			if (oMatchCriteriaLineItems && oMatchCriteriaLineItems.length > 0) {
				_.each(oMatchCriteriaLineItems, function (item) {
					var fieldName = item.PropertyPath.toLowerCase();
					if (fieldName !== "edtst") {
						var cellProperties = _.find(oTableEntity["property"], {
							name: fieldName,
						});
						if (
							cellProperties &&
							cellProperties["com.sap.vocabularies.Common.v1.Label"] &&
							cellProperties["com.sap.vocabularies.Common.v1.Label"].String
						) {
							tableData.push({
								row1: cellProperties["com.sap.vocabularies.Common.v1.Label"]
									.String,
								field: cellProperties.name,
							});
						}
					}
				});
			}
			viewModel.setProperty(
				"/duplicationDetails/matchCriteriaTableData",
				tableData
			);
			//			oSourceTable.bindElement("viewModel>/duplicationDetails/duplicationResults/0");
			//			sourceTablePopover.bindElement("viewModel>/duplicationDetails/duplicationResults/0")
			oSourceTable.bindAggregation(
				"items",
				"viewModel>/duplicationDetails/matchCriteriaTableData",
				function (sId, oContext) {
					var contextObject = oContext.getObject();
					var fcat_data = viewModel.getProperty(
						"/duplicationDetails/matchCriteriaColumnData"
					);
					var cells = [];
					_.each(fcat_data, function (obj) {
						if (obj.col != "row1") {
							var oProperty = oTableEntity.property.find(function (obj) {
								return obj.name == contextObject.field;
							});
							var sPath = oController.prepareControlBindingPath(
								oProperty,
								contextObject.field,
								"viewModel"
							);
							sPath = sPath.replaceAll("viewModel>", "viewModel>/duplicationDetails/duplicationResults/0/");
							var input = new sap.m.Text({
								text: sPath
								, wrapping: true
							});
							var input = new sap.m.Text({ text: sPath, wrapping: true });
							cells.push(input);
						} else {
							var text = new sap.m.Label({
								design: "Bold",
								wrapping: true,
							}).bindProperty(
								"text",
								"viewModel" + ">" + obj["col"],
								null,
								sap.ui.model.BindingMode.OneWay
							);
							cells.push(text);
						}
					});
					return new sap.m.ColumnListItem({
						cells: cells,
						type: sap.m.ListType.Inactive,
					}).addStyleClass("noPadding");
				}
			);
			var sourceTablePopover = new sap.m.Popover({
				contentWidth: "25rem",
				draggable: true,
				resizable: true,
				showHeader: false,
				showArrow: false,
				placement: sap.m.PlacementType.Bottom,
				content: [
					oSourceTable
				],

			}).addStyleClass("sapUiSizeCompact");
			//sourceTablePopover.bindElement("/"+oTableEntity.name.split("Type")[0]);

			oController.getView().addDependent(sourceTablePopover);

			var oDuplicationResultLineItems =
				oTableEntity["vui.bodc.workspace.DuplicationCriteria"];
			var oResponsiveLineItem = oTableEntity["com.sap.vocabularies.UI.v1.LineItem"];
			var oColumns = [];
			_.each(oResponsiveLineItem, function (lineItem) {
				// var lineItem = oResponsiveLineItem.find(function (obj) {
				// 	return (
				// 		(obj.ID && obj.ID.String == item.PropertyPath.toLowerCase()) ||
				// 		(obj.Value &&
				// 			obj.Value.Path == item.PropertyPath.toLowerCase()) ||
				// 		(obj.ID && obj.ID.String == item.PropertyPath) ||
				// 		(obj.Value && obj.Value.Path == item.PropertyPath)
				// 	);
				// });
				if (lineItem && lineItem.Fields) {
					oColumns.push(
						new sap.m.Column({
							header: new sap.m.Text({
								text: lineItem.Label.String,
							}),
							visible: true,
							popinDisplay: sap.m.PopinDisplay.Inline,
							importance: sap.ui.core.Priority.High
							//minScreenWidth:sap.ui.Device.system.desktop
						})
					);
				} else {
					var fieldName;
					if (lineItem && lineItem.Value && lineItem.Value.Path) {
						fieldName = lineItem.Value.Path;
					}
					if (fieldName !== "edtst") {
						var cellProperties = _.find(oTableEntity["property"], {
							name: fieldName,
						});
						if (cellProperties &&
							cellProperties["com.sap.vocabularies.Common.v1.Label"] &&
							cellProperties["com.sap.vocabularies.Common.v1.Label"].String
						) {
							if (lineItem["com.sap.vocabularies.UI.v1.Importance"] && lineItem["com.sap.vocabularies.UI.v1.Importance"].EnumMember && lineItem["com.sap.vocabularies.UI.v1.Importance"].EnumMember == 'com.sap.vocabularies.UI.v1.ImportanceType/High') {
								oColumns.push(
									new sap.m.Column({
										header: new sap.m.Text({
											text: cellProperties[
												"com.sap.vocabularies.Common.v1.Label"
											].String,
										}),
										visible: true,
										popinDisplay: sap.m.PopinDisplay.Inline,
										importance: sap.ui.core.Priority.High
										//minScreenWidth:sap.ui.Device.system.desktop
									})
								);
							}
							else {
								oColumns.push(
									new sap.m.Column({
										header: new sap.m.Text({
											text: cellProperties[
												"com.sap.vocabularies.Common.v1.Label"
											].String,
										}),
										visible: true,
										popinDisplay: sap.m.PopinDisplay.Inline,
										importance: sap.ui.core.Priority.None
										//minScreenWidth:sap.ui.Device.system.desktop
									})
								);
							}

						}
					}
				}
			});
			oColumns.push(
				new sap.m.Column({
					header: new sap.m.Text({
						text: "",
					}),
					visible: true,
					popinDisplay: sap.m.PopinDisplay.WithoutHeader,
					importance: sap.ui.core.Priority.High
					//minScreenWidth:sap.ui.Device.system.desktop
				})
			);
			var oTable = new sap.m.Table({
				autoPopinMode: true,
				contextualWidth: "Auto",
				itemPress: [oController.onDuplicationItemPress, oController],
				headerToolbar: new sap.m.OverflowToolbar({
					content: [
						new sap.m.Title({
							text: "{viewModel>/duplicationDetails/duplicationResultsTitle}",
						}),
						new sap.m.ToolbarSpacer(),
						new sap.m.Button({
							icon: "sap-icon://group-2",
							tooltip: "{i18n>MATCHCRITERIA}",
							type: sap.m.ButtonType.Transparent,
							press: function (oEvent) {
								//								var oModel = oController.getView().getModel();
								//								var path = oEvent.getSource().getParent().getParent().getBindingInfo("items").path;
								//								var sourcePath = viewModel.getProperty(path);
								//sourceTablePopover.setModel(oModel);								
								sourceTablePopover.openBy(oEvent.getSource());


							},
						}),
					],
				}),
				columns: oColumns,
			}).addStyleClass("vistexCompactStyle");
			oTable.data("entity", oTableEntity.name.split("Type")[0]);

			oTable.bindAggregation(
				"items",
				"viewModel>/duplicationDetails/duplicationResults",
				function (sId, oContext) {
					var contextObject = oContext.getObject();
					var cells = [],
						oContent;
					var oResponsiveLineItem =
						oTableEntity["com.sap.vocabularies.UI.v1.LineItem"];
					var fcat_data =
						oTableEntity["vui.bodc.workspace.DuplicationCriteria"];
					_.each(oResponsiveLineItem, function (lineItem) {
						// var lineItem = oResponsiveLineItem.find(function (obj1) {
						// 	return (
						// 		(obj1.ID &&
						// 			obj1.ID.String == obj.PropertyPath.toLowerCase()) ||
						// 		(obj1.Value &&
						// 			obj1.Value.Path == obj.PropertyPath.toLowerCase()) ||
						// 		(obj1.ID && obj1.ID.String == obj.PropertyPath) ||
						// 		(obj1.Value && obj1.Value.Path == obj.PropertyPath)
						// 	);
						// });
						var fieldName, input;
						if (lineItem.Fields) {
							input = new sap.m.VBox();
							_.each(lineItem.Fields, function (field) {
								fieldName = field.Value.Path;
								var oProperty = oTableEntity.property.find(function (obj) {
									return obj.name == fieldName;
								});
								var sPath = oController.prepareControlBindingPath(
									oProperty,
									fieldName,
									"viewModel"
								);
								input.addItem(
									new sap.m.Text({ text: sPath, wrapping: true })
								);
							});
						} else {
							fieldName = lineItem.Value.Path;
							var oProperty = oTableEntity.property.find(function (obj) {
								return obj.name == fieldName;
							});
							var sPath = oController.prepareControlBindingPath(
								oProperty,
								fieldName,
								"viewModel"
							);
							input = new sap.m.Text({ text: sPath, wrapping: true });
						}
						cells.push(input);
					});
					var text = new sap.m.ObjectStatus({
						inverted: true,
						text: {
							parts: [{ path: 'viewModel>_source' }, { path: 'i18n>REFERENCE' }], formatter: function (source, label) {
								if (source == "X") {
									return label;
								}
								else {
									return "";
								}
							}
						},
						state: {
							parts: [{ path: 'viewModel>_source' }], formatter: function (source) {
								if (source == "X") {
									return sap.ui.core.ValueState.Warning;
								}
								else {
									return sap.ui.core.ValueState.None;
								}
							}
						}
					})
					cells.push(text);
					return new sap.m.ColumnListItem({
						cells: cells,
						type: columnListItemType,
					}).addStyleClass("noPadding");
				}
			);
			//			Changes to remove apply button and send apply action directly on change
			//			if (duplicatesTabBarItem.getContent()[1].getContent().length == 1) {
			//				duplicatesTabBarItem.getContent()[1].addContent(new sap.m.VBox({
			if (duplicatesTabBarItem && duplicatesTabBarItem.getContent()[0]) {
				if (duplicatesTabBarItem.getContent()[0].getItems().length == 1) {
					duplicatesTabBarItem.getContent()[0].addItem(
						new sap.m.VBox({
							//
							items: [oTable],
						})
					);

				} else {
					duplicatesTabBarItem.getContent()[0].getItems()[1].removeAllItems();
					//duplicatesTabBarItem.getContent()[0].getItems()[1].addItem(oSourceTable);
					duplicatesTabBarItem.getContent()[0].getItems()[1].addItem(oTable);
					//
				}
			}

			viewModel.setProperty("/duplicationDetails/resultEntityName", oTableEntity.name.split("Type")[0]);

			var tableData = [];
			_.each(
				oTableEntity["vui.bodc.workspace.DuplicationData"],
				function (item) {
					var sourceField = item.PropertyPath.split("/")[0];
					var targetField = item.PropertyPath.split("/")[1];
					var cellProperties = _.find(oTableEntity.property, {
						name: targetField,
					});
					if (cellProperties && cellProperties["com.sap.vocabularies.Common.v1.Label"] && cellProperties["com.sap.vocabularies.Common.v1.Label"].String) {
						if ((!tableData.find(source => source.source === sourceField))) {
							tableData.push({
								field: cellProperties["com.sap.vocabularies.Common.v1.Label"].String,
								source: sourceField,
								target: targetField,
							});
						}
					}
				}
			);
			viewModel.setProperty(
				"/duplicationItemsData" + oTableEntity.name,
				tableData
			);
			var urlParameters = oController.readQueryPrepare(oTableEntity.name.split("Type")[0]);
			urlParameters["$skip"] = 0;
			urlParameters["$top"] = 100;
			oModel.read("/" + oTableEntity.name.split("Type")[0], {
				// urlParameters: oController.readQueryPrepare(
				// 	oTableEntity.name.split("Type")[0]
				// ),
				urlParameters: urlParameters,
				success: function (oData, response) {
					viewModel.setProperty(
						"/duplicationDetails/duplicationResults",
						oData.results
					);
					var title;
					if (oData.results) {
						title =
							bundle.getText("MATCHES") + " (" + oData.results.length + ")";
					} else {
						title = bundle.getText("MATCHES");
					}
					viewModel.setProperty(
						"/duplicationDetails/duplicationResultsTitle",
						title
					);
				},
			});
			//			}
		},
		onDuplicationItemPress: function (oEvent) {
			var oController = this;
			var viewModel = oController.getOwnerComponent().getModel("viewModel");
			var oSource = oEvent.getSource();
			var oPanel = oSource.getParent();
			var sPath = oEvent
				.getParameter("listItem")
				.getBindingContext("viewModel")
				.getPath();
			while (!(oPanel instanceof sap.m.Panel)) {
				oPanel = oPanel.getParent();
			}
			if (!oPanel) return;
			var columnData = [
				{ col: "field", label: "Field" },
				{ col: "source", label: "Source" },
				{ col: "target", label: "Target" },
			];
			viewModel.setProperty("/duplicationDrilldownColumnData", columnData);

			oPanel.getContent()[0].setVisible(false);
			// oPanel.getContent()[1].setVisible(false);
			// var length = oPanel.getContent()[1].getItems()[1].getVisibleItems().length;

			//QA#10292 - Duplicates Section in WS shows no columns for matched records ** start
			// if (oPanel.getContent().length === 1) {
			// 	var length = oPanel.getContent().length + 1;
			// } else {
			// 	var length = oPanel.getContent().length;
			// }
			var length = oEvent.getSource().getMaxItemsCount();

			if (oPanel.getContent()[1]) {
				oPanel.getContent()[1].setVisible(false);
			}
			//QA#10292 - Duplicates Section in WS shows no columns for matched records ** end

			var index = parseInt(sPath.split("/")[sPath.split("/").length - 1]) + 1;
			oController.prepareDuplicationItemDetails(oPanel, sPath, length, index);
		},
		prepareDuplicationItemDetails: function (oPanel, sPath, length, index) {
			var oController = this;
			var viewModel = oController.getOwnerComponent().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var previousButtonEnable = true,
				nextButtonEnable = true;

			if (index < 2) {
				previousButtonEnable = false;
			}

			if (index >= length) {
				nextButtonEnable = false;
			}

			var oVBox = new sap.m.VBox();
			var oHBox = new sap.m.HBox({
				justifyContent: "SpaceBetween",
				items: [
					new sap.m.Button({
						type: sap.m.ButtonType.Transparent,
						icon: "sap-icon://nav-back",
						press: [oController.onDuplicationItemBackPress, oController],
					}),
					new sap.m.Text({
						text: index + " of " + length,
					}).addStyleClass("sapUiTinyMarginTop"),
					new sap.m.HBox({
						items: [
							new sap.m.Button({
								type: sap.m.ButtonType.Transparent,
								icon: "sap-icon://navigation-up-arrow",
								enabled: previousButtonEnable,
								tooltip: "{i18n>PREVIOUS}",
								press: [oController.onDuplicationNextItem, oController],
							}).data({ length: length, index: index, sPath: sPath }),
							new sap.m.Button({
								type: sap.m.ButtonType.Transparent,
								icon: "sap-icon://navigation-down-arrow",
								enabled: nextButtonEnable,
								tooltip: "{i18n>NEXT}",
								press: [oController.onDuplicationNextItem, oController],
							}).data({ length: length, index: index, sPath: sPath }),
						],
					}),
				],
			});
			oVBox.addItem(oHBox);
			oVBox.addItem(
				new sap.m.Toolbar({
					width: "100%",
					height: "1px",
				})
			);
			var resultEntityName = viewModel.getProperty(
				"/duplicationDetails/resultEntityName"
			);
			var oTargetEntity = oMetaModel.getODataEntityType(
				oMetaModel.getODataEntitySet(resultEntityName).entityType
			);
			var sourceEntity =
				oController.DSCSourcePath.split("/")[
					oController.DSCSourcePath.split("/").length - 1
				].split("(")[0];
			var oSourceEntityType = oMetaModel.getODataEntityType(
				oMetaModel.getODataEntitySet(sourceEntity).entityType
			);
			var oHBox = new sap.m.HBox().addStyleClass(
				"sapUiTinyMarginBegin sapUiTinyMarginTop sapUiSmallMarginBottom"
			);
			var oDuplicationResultLineItems =
				oTargetEntity["vui.bodc.workspace.DuplicationCriteria"];
			var oResponsiveLineItem = oTargetEntity["com.sap.vocabularies.UI.v1.Identification"];
			_.each(oResponsiveLineItem, function (lineItem) {
				// var lineItem = oResponsiveLineItem.find(function (obj1) {
				// 	return (
				// 		(obj1.ID && obj1.ID.String == obj.PropertyPath.toLowerCase()) ||
				// 		(obj1.Value &&
				// 			obj1.Value.Path == obj.PropertyPath.toLowerCase()) ||
				// 		(obj1.ID && obj1.ID.String == obj.PropertyPath) ||
				// 		(obj1.Value && obj1.Value.Path == obj.PropertyPath)
				// 	);
				// });
				var fieldName, input;
				// if (lineItem.Fields) {
				// 	input = new sap.m.VBox();
				// 	_.each(lineItem.Fields, function (field) {
				// 		fieldName = field.Value.Path;
				// 		var oProperty = oTargetEntity.property.find(function (obj) {
				// 			return obj.name == fieldName;
				// 		});
				// 		var sPath = oController.prepareControlBindingPath(
				// 			oProperty,
				// 			fieldName,
				// 			"viewModel"
				// 		);
				// 		input.addItem(new sap.m.Text({ text: sPath, wrapping: true }));
				// 	});
				// 	oHBox.addItem(
				// 		new sap.m.VBox({
				// 			items: [
				// 				new sap.m.Label({
				// 					text: lineItem.Label.String + ":",
				// 				}),
				// 				input,
				// 			],
				// 		}).addStyleClass("sapUiSmallMarginEnd")
				// 	);
				// } else {
				fieldName = lineItem.Value.Path;
				var oProperty = oTargetEntity.property.find(function (obj) {
					return obj.name == fieldName;
				});
				var sPath = oController.prepareControlBindingPath(
					oProperty,
					fieldName,
					"viewModel"
				);
				input = new sap.m.Text({ text: sPath, wrapping: true });
				oHBox.addItem(
					new sap.m.VBox({
						items: [
							new sap.m.Label({
								text:
									oProperty["com.sap.vocabularies.Common.v1.Label"].String +
									":",
							}),
							input,
						],
					}).addStyleClass("sapUiSmallMarginEnd")
				);
				// }
			});

			//oVBox.addItem(oHBox);

			var oTable = new sap.m.Table({
				autoPopinMode: false,
				columns: [
					new sap.m.Column({
						visible: true,
						header: new sap.m.Text({
							text: "{i18n>FIELD}",
						}),
					}),
					new sap.m.Column({
						visible: true,
						header: new sap.m.Text({
							text: "{i18n>SOURCE}",
						}),
					}),
					new sap.m.Column({
						visible: true,
						header: new sap.m.Text({
							text: "{i18n>DUPLICATE}",
						}),
					}),
				],
			});

			oTable.bindAggregation(
				"items",
				"viewModel>/duplicationItemsData" + oTargetEntity.name,
				function (sId, oContext) {
					var contextObject = oContext.getObject();
					var fcat_data = viewModel.getProperty(
						"/duplicationDrilldownColumnData"
					);
					var cells = [];
					_.each(fcat_data, function (obj) {
						var oProperty = oTargetEntity.property.find(function (obj) {
							return obj.name == contextObject.target;
						});
						var oSourceProperty = oSourceEntityType.property.find(function (obj) {
							return obj.name == contextObject.source;
						});

						var isCriteriaField = oTargetEntity[
							"vui.bodc.workspace.DuplicationCriteria"
						].find(function (item) {
							return contextObject.target == item.PropertyPath.toLowerCase();
						});
						isCriteriaField = !!isCriteriaField;
						var descrPath;
						if (obj.col == "field") {
							var text = new sap.m.Label({
								design: "Bold",
								wrapping: true,
							}).bindProperty(
								"text",
								"viewModel" + ">" + obj["col"],
								null,
								sap.ui.model.BindingMode.OneWay
							);
							cells.push(text);
						} else if (obj.col == "source") {
							//							var input = new sap.m.Text({
							//								text: "{" + contextObject.source + "}",
							//								wrapping: true,
							//							});
							// changes from du8 starts
							if (SourceProperty && oSourceProperty["com.sap.vocabularies.Common.v1.Text"]) {
								// changes from du8 ends
								descrPath = oSourceProperty["com.sap.vocabularies.Common.v1.Text"].Path;
							}
							if (descrPath) {
								//descrPath = "viewModel>" + "/" + descrPath;
								var input = new sap.m.FormattedText({
									htmlText: {
										parts: [
											{ path: contextObject.source },
											// changesss
											{ path: descrPath },
											// changesss
											{ value: isCriteriaField },
										],
										// changesss
										formatter: function (source, descr, isCriteriaField) {
											// changesss
											if (isCriteriaField) {
												// changesss
												return "<strong>" + (descr ? descr : source) + "</strong>";
												// changesss
											} else {
												// changesss
												return descr ? descr : source;
												// changesss
											}
										},
									},
								});
							} else {
								var input = new sap.m.FormattedText({
									htmlText: {
										parts: [
											{ path: contextObject.source },
											// changesss
											{ value: oSourceProperty.type },
											// changesss	
											{ value: isCriteriaField },
										],
										// changesss
										formatter: function (source, type, isCriteriaField) {
											// changesss
											// changes from du8 starts
											if (isCriteriaField) {
												if (type == "Edm.DateTime") {
													var sameValue = zvui.work.controller.AnnotationHelper.getChangeDateFormat(source);
													return "<strong>" + sameValue + "</strong>";
												}
												else {
													return "<strong>" + source + "</strong>";
												}

											} else {
												if (type == "Edm.DateTime") {
													var sameValue = zvui.work.controller.AnnotationHelper.getChangeDateFormat(source);

													return sameValue;
												}
												else {
													return source;
												}

											}
											// changes from du8 ends
										},
									},
								});
							}

							cells.push(input);
						} else if (obj.col == "target") {
							// changes from du8 starts
							if (oProperty && oProperty["com.sap.vocabularies.Common.v1.Text"]) {
								// changes from du8 ends
								descrPath = oProperty["com.sap.vocabularies.Common.v1.Text"].Path;
							}
							//	var input = new sap.m.Text({text: "{viewModel>" + sPath + "/" + contextObject.target + "}", wrapping: true});
							if (descrPath) {
								descrPath = "viewModel>" + sPath + "/" + descrPath;
								var input = new sap.m.FormattedText({
									htmlText: {
										parts: [
											{ path: contextObject.source },
											{
												path: "viewModel>" + sPath + "/" + contextObject.target,
											},
											{ path: descrPath },
											{ value: isCriteriaField },
										],
										formatter: function (source, target, descr, isCriteriaField) {
											if (source !== target) {
												return (
													"<span class='highlightDuplicateText'>" +
													(descr ? descr : target) +
													"</span>"
												);
											} else if (isCriteriaField) {
												return "<strong>" + (descr ? descr : source) + "</strong>";
											} else {
												return (descr ? descr : target);
											}
										},
									},
								});
							} else {
								var input = new sap.m.FormattedText({
									htmlText: {
										parts: [
											{ path: contextObject.source },
											{
												path: "viewModel>" + sPath + "/" + contextObject.target,
											},
											// changes from du8 starts
											{ value: oProperty.type },
											// changes from du8 ends
											{ value: isCriteriaField },
										],
										// changes from du8 starts
										formatter: function (source, target, type, isCriteriaField) {
											if (source !== target) {
												if (type == "Edm.DateTime") {
													var sameValue = zvui.work.controller.AnnotationHelper.getChangeDateFormat(target);

													return ("<span class='highlightDuplicateText'>" + sameValue + "</span>");
												}
												else {
													return ("<span class='highlightDuplicateText'>" + target + "</span>");
												}

											} else if (isCriteriaField) {

												if (type == "Edm.DateTime") {
													var sameValue = zvui.work.controller.AnnotationHelper.getChangeDateFormat(source);

													return "<strong>" + sameValue + "</strong>";
												}
												else {
													return "<strong>" + source + "</strong>";
												}

											} else {

												if (type == "Edm.DateTime") {
													var sameValue = zvui.work.controller.AnnotationHelper.getChangeDateFormat(target);

													return sameValue;
												}
												else {
													return target;
												}

											}
										},
										// changes from du8 ends
									},
								});
							}

							cells.push(input);
						}
					});
					return new sap.m.ColumnListItem({
						cells: cells,
						type: "Active",
					}).addStyleClass("noPadding");
				}
			);
			oTable.bindElement(oController.DSCSourcePath);

			oVBox.addItem(oTable);

			oVBox.bindElement("viewModel>" + sPath);
			if (oPanel.getContent().length == 2) {
				//QA#10292 - Duplicates Section in WS shows no columns for matched records ** start
				oPanel.removeContent(1);
				//QA#10292 - Duplicates Section in WS shows no columns for matched records ** end
				oPanel.addContent(oVBox);
			} else {
				oPanel.removeContent(2);
				oPanel.addContent(oVBox);
			}
		},
		onDuplicationItemBackPress: function (oEvent) {
			var oController = this;
			var oSource = oEvent.getSource();
			var oPanel = oSource.getParent();
			while (!(oPanel instanceof sap.m.Panel)) {
				oPanel = oPanel.getParent();
			}
			if (!oPanel) return;
			oPanel.getContent()[0].setVisible(true);
			//QA#10292 - Duplicates Section in WS shows no columns for matched records *** start
			oPanel.getContent()[1].setVisible(false);
			//QA#10292 - Duplicates Section in WS shows no columns for matched records *** end
			oPanel.removeContent(2);
		},
		onDuplicationNextItem: function (oEvent) {
			var oController = this;
			var oSource = oEvent.getSource();
			var sIcon = oSource.getIcon();
			var oCustomData = oSource.data();
			var oPanel, sPath, length, index, sPathIndex;
			index =
				oCustomData.sPath.split("/")[oCustomData.sPath.split("/").length - 1];
			sPath = oCustomData.sPath.slice(
				0,
				oCustomData.sPath.length - index.length
			);
			length = oCustomData.length;
			if (sIcon == "sap-icon://navigation-up-arrow") {
				sPathIndex = oCustomData.index - 2;
				index = oCustomData.index - 1;
			} else if (sIcon == "sap-icon://navigation-down-arrow") {
				sPathIndex = oCustomData.index;
				index = oCustomData.index + 1;
			}

			if (index < 1 || index > length) return;
			sPath = sPath + sPathIndex;

			var oPanel = oSource.getParent();
			while (!(oPanel instanceof sap.m.Panel)) {
				oPanel = oPanel.getParent();
			}
			if (!oPanel) return;
			oController.prepareDuplicationItemDetails(oPanel, sPath, length, index);
		},
		// Duplication Changes -- End
		onFilterLiveModeChange: function (oEvent) {
			if (oEvent.getSource().getParent().getParent().getHeaderContent()[0] &&
				oEvent.getSource().getParent().getParent().getHeaderContent()[0].getContent()[0] &&
				oEvent.getSource().getParent().getParent().getHeaderContent()[0].getContent()[0].getItems &&
				oEvent.getSource().getParent().getParent().getHeaderContent()[0].getContent()[0].getItems()[0] instanceof sap.ui.comp.smartfilterbar.SmartFilterBar) {
				oEvent.getSource().getParent().getParent().getHeaderContent()[0].getContent()[0].getItems()[0].setLiveMode(oEvent.getParameter("state"));
			}
		},
		clearNavBackOnSAVnRef: function () {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var data = viewModel.getData();
			var navBackOnSAVnRefFlags = _.each(_.keys(data), function (flag) {
				if (flag.indexOf("navBackOnSAVnRef") > -1) {
					viewModel.setProperty("/" + flag, false);
				}
			});
		},
		LenghtOfNavBackOnSAVnRef: function () {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var data = viewModel.getData();
			var navBackOnSAVnRefFlags = _.filter(_.keys(data), function (flag) {
				if (flag.indexOf("navBackOnSAVnRef") > -1 && viewModel.getProperty("/" + flag)) {
					return flag;
				}
			})
			return navBackOnSAVnRefFlags.length;
		},
		onSummaryVariantSelect: function (oEvent) {
			var oController = this;
			var oSource = oEvent.getSource();
			var viewModel = oController.getView().getModel("viewModel");
			var modelChanged = viewModel.getProperty("/modelChanged");
			var currentRoute = viewModel.getProperty("/currentRoute");
			var prevSelectedKey = oEvent.getParameter("previousSelectedItem");
			if (prevSelectedKey) {
				prevSelectedKey = prevSelectedKey.getKey();
			} else {
				prevSelectedKey = undefined;
			}
			var selectedKey = oEvent.getParameter("selectedItem").getKey();
			var bundle = oController.getOwnerComponent().getModel("i18n").getResourceBundle();
			if (modelChanged) {
				MessageBox.confirm(bundle.getText('BACKTOWORKSPACE'), {
					title: bundle.getText('CONFIRM'),
					actions: [MessageBox.Action.YES, MessageBox.Action.NO],
					onClose: function (oAction) {
						if (oAction == 'YES') {
							//							oController.onSave("SAVE");
							//							oController.performSummarySwitch(selectedKey);
							viewModel.setProperty("/performSummarySwitchAfterSave", selectedKey);
							viewModel.setProperty("/onSaveOrCancelButton", true);
							oController.onDiscard();
						} else {
							var previousKey;
							if (prevSelectedKey) {
								previousKey = prevSelectedKey;
							} else if (currentRoute == "Detail") {
								if (oController.summarySwitchEntity) {
									previousKey = oController.summarySwitchEntity;
								}
							} else {
								var sPath = viewModel.getProperty("/DetailDetailPageCurrentPath");
								previousKey = sPath.split("(")[0].split("_PRX")[0];
							}
							oSource.setSelectedKey(previousKey);
						}
					}
				});
			} else {
				oController.performSummarySwitch(selectedKey);
			}
		},
		performSummarySwitch: function (selectedKey) {
			var oController = this;
			var oRouter = oController.getOwnerComponent().getRouter();
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var bundle = oController.getOwnerComponent().getModel("i18n").getResourceBundle();
			var modelChanged = viewModel.getProperty("/modelChanged");
			var navigationPath;
			if (viewModel.getProperty("/currentRoute") == "Detail") {
				navigationPath = viewModel.getProperty("/DetailPageCurrentPath");
			} else {
				navigationPath = viewModel.getProperty(
					"/DetailDetailPageCurrentPath"
				);
			}
			var level = viewModel.getProperty("/currentDetailPageLevel");
			if (navigationPath.split("_PRX")[1]) {
				navigationPath = selectedKey + "_PRX" + navigationPath.split("_PRX")[1];
			} else if (viewModel.getProperty("/currentRoute") == "Detail") {
				//				viewModel.setProperty("/summaryVariantDetailEntity", selectedKey);
			} else {
				navigationPath = selectedKey + "_PRX";
			}
			var functionImport = oMetaModel.getODataFunctionImport('SummSwitch');
			var currentPage;
			if (viewModel.getProperty("/currentRoute") == "Detail") {
				currentPage = oController.getView().getContent()[0].getContent()[0];
			} else {
				currentPage = oController.getView().getContent()[0].getContent()[
					level
				];
			}
			if (!functionImport)
				return;

			var urlParameters = {};
			urlParameters["entity_name"] = selectedKey;
			sap.ui.core.BusyIndicator.show(0);
			oModel.callFunction("/" + functionImport.name, {
				method: "POST",
				batchGroupId: "changes",
				urlParameters: urlParameters,
				success: function (oData, response) {
					viewModel.setProperty("/fromSummaryVariant", true);
					viewModel.setProperty("/doNotHideBusyIndicator", true);
					viewModel.setProperty("/skipPageRefresh", false);
					viewModel.setProperty("/KPITagsEntity", undefined);
					sap.ui.core.BusyIndicator.show(0);
					if (viewModel.getProperty("/currentRoute") == "Detail") {
						var oEntitySet = oMetaModel.getODataEntitySet(selectedKey);
						var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
						if (oEntityType["vui.bodc.workspace.RootEntity"] && oEntityType["vui.bodc.workspace.RootEntity"].Bool) {
							viewModel.setProperty("/fromSummaryVariant", false);
							oRouter.navTo("Detail", {
								path: navigationPath
							}, true);
						} else {
							oRouter.navTo("Detail", {
								path: navigationPath,
								entity: selectedKey
							}, true);
						}
					} else {
						currentPage.addStyleClass("vistex-display-none");
						oRouter.navTo("DetailDetail", {
							path: viewModel.getProperty("/navigationPath"),
							path1: navigationPath,
							level: level
						}, true);
					}
				}
			});
			oModel.submitChanges({
				batchGroupId: "changes"
			});
		},
		navigateToInprocessPage: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var navigationPath = viewModel.getProperty("/navigationPath");
			var objectPage, sText = "";
			objectPage = oController.getView().getContent()[0].getContent()[0];
			/** * Flexible column layout changes - start ** */
			if (objectPage && objectPage.getHeaderTitle && objectPage.getHeaderTitle().getHeading &&
				objectPage.getHeaderTitle().getHeading().getItems &&
				objectPage.getHeaderTitle().getHeading().getItems()[0].getItems &&
				objectPage.getHeaderTitle().getHeading().getItems()[0].getItems()[1] &&
				objectPage.getHeaderTitle().getHeading().getItems()[0].getItems()[1].getItems &&
				objectPage.getHeaderTitle().getHeading().getItems()[0].getItems()[1].getItems()[0] &&
				objectPage.getHeaderTitle().getHeading().getItems()[0].getItems()[1].getItems()[0].getSelectedItem &&
				objectPage.getHeaderTitle().getHeading().getItems()[0].getItems()[1].getItems()[0].getSelectedItem().getText) {
				sText = objectPage.getHeaderTitle().getHeading().getItems()[0].getItems()[1].getItems()[0].getSelectedItem().getText();
			} else if (objectPage && objectPage.getHeaderTitle && objectPage.getHeaderTitle().getHeading &&
				objectPage.getHeaderTitle().getHeading().getItems &&
				objectPage.getHeaderTitle().getHeading().getItems()[1].getItems &&
				objectPage.getHeaderTitle().getHeading().getItems()[1].getItems()[0] &&
				objectPage.getHeaderTitle().getHeading().getItems()[1].getItems()[0].getItems &&
				objectPage.getHeaderTitle().getHeading().getItems()[1].getItems()[0].getItems()[0] &&
				objectPage.getHeaderTitle().getHeading().getItems()[1].getItems()[0].getItems()[0].getText) {
				sText = objectPage.getHeaderTitle().getHeading().getItems()[1].getItems()[0].getItems()[0].getText();
			}
			if (!sText) {
				var dynamicSideContent = oController.getResponsiveSplitter(objectPage._oCurrentTabSection.getSubSections()[0].getBlocks()[0].getContent()[0]);
				var oSmartTable = dynamicSideContent.getMainContent()[0];
				sText = oSmartTable.getHeader().split("(")[0];
			}
			viewModel.setProperty("/inprocessParentTitle", sText);
			/** * Flexible column layout changes - End ** */
			if (viewModel.getProperty("/currentRoute") == "Detail") {
				if (viewModel.setProperty("/toInprocessFromDetail", true));
			}
			oController.getOwnerComponent().getRouter().navTo("Inprocess", { path: navigationPath }, false);
		},
		refreshKPITagEntity: function () {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			// Multiple KPI Entity Request --Start
			var KPIEntites = viewModel.getProperty("/KPITagsEntity");
			if (viewModel.getProperty("/currentRoute") == 'DetailDetail' && KPIEntites) {
				if (KPIEntites.length > 0) {
					for (var i = 0; i < KPIEntites.length; i++) {
						oMetaModel.getODataEntitySet(KPIEntites[i])
						var parentPath = viewModel.getProperty("/DetailDetailPageCurrentPath");
						var sPath = "/" + parentPath + "/to_" + KPIEntites[i];
						oController.readPath(KPIEntites[i], sPath);
					}
				}

			}
			// Multiple KPI Entity Request --End
		},
		prepareControlBindingPath: function (oProperty, fieldname, modelName) {
			if (modelName) {
				modelName = modelName + ">";
			} else {
				modelName = "";
			}
			var sPath;
			if (oProperty && oProperty["sap:unit"]) {
				sPath =
					"{parts:[{path: '" +
					modelName +
					fieldname +
					"'},{value: '2'}],formatter: 'zvui.work.controller.AnnotationHelper.formatDeimalValue'}";
			} else if (oProperty && oProperty.type == "Edm.DateTime") {
				sPath =
					"{path:'" +
					modelName +
					fieldname +
					"', formatter:'zvui.work.controller.AnnotationHelper.getChangeDateFormat'}";
			} else {
				if (fieldname) {
					var sTextArrangement;
					if (oProperty &&
						oProperty["com.sap.vocabularies.Common.v1.Text"] &&
						oProperty["com.sap.vocabularies.Common.v1.Text"][
						"com.sap.vocabularies.UI.v1.TextArrangement"
						] &&
						oProperty["com.sap.vocabularies.Common.v1.Text"][
							"com.sap.vocabularies.UI.v1.TextArrangement"
						].EnumMember
					) {
						sTextArrangement =
							zvui.work.controller.AnnotationHelper._mapTextArrangement4smartControl(
								oProperty["com.sap.vocabularies.Common.v1.Text"][
									"com.sap.vocabularies.UI.v1.TextArrangement"
								].EnumMember
							);
						var sTextArrangementPath;
						switch (sTextArrangement) {
							case "idAndDescription":
								sTextArrangementPath =
									"{parts: [{path: '" +
									modelName +
									fieldname +
									"'} , {path: '" +
									modelName +
									oProperty["com.sap.vocabularies.Common.v1.Text"].Path +
									"'}], formatter: 'zvui.work.controller.AnnotationHelper.getLinkTextBasedOnTextArrangement'}";
								break;
							case "idOnly":
								sPath = "{" + modelName + fieldname + "}";
								break;
							case "descriptionOnly":
								if (oProperty["com.sap.vocabularies.Common.v1.Text"]) {
									sTextArrangementPath =
										"{" +
										modelName +
										oProperty["com.sap.vocabularies.Common.v1.Text"].Path +
										"}";
								} else {
									sPath = "{" + modelName + fieldname + "}";
								}
								break;
							case "descriptionAndId":
								sTextArrangementPath =
									"{parts: [ {path: '" +
									modelName +
									oProperty["com.sap.vocabularies.Common.v1.Text"].Path +
									"'} , {path: '" +
									modelName +
									fieldname +
									"'}], formatter: 'zvui.work.controller.AnnotationHelper.getLinkTextBasedOnTextArrangement'}";
								break;
							default:
								sPath = "{" + modelName + fieldname + "}";
								break;
						}
						if (sTextArrangementPath) sPath = sTextArrangementPath;
					} else {
						sPath = "{" + modelName + fieldname + "}";
					}
				}
			}
			return sPath;
		},
		showInitialSummary: function (oEvent) {
			var oController = this;
			var viewModel = oController.getOwnerComponent().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var smartTable = oEvent.getSource().getParent().getParent().getParent();
			var entityName = oEvent.getSource().data("entitySet");
			var functionImport = oMetaModel.getODataFunctionImport(entityName + "_SHW_INITIAL_SUMM");
			if (!functionImport) {
				return;
			}
			var urlParameters = {};
			if (oEvent.getParameter("state")) {
				urlParameters["show_initial_summ"] = true;
			} else {
				urlParameters["show_initial_summ"] = false;
			}

			oModel.callFunction("/" + functionImport.name, {
				method: "POST",
				batchGroupId: "changes",
				urlParameters: urlParameters
			});
			oModel.submitChanges({
				batchGroupId: "changes",
				success: function (oData, response) {
					oController.showMessagePopover(oController.messageButtonId);
					//					oController.refreshSmartTable(smartTable);
					oModel.refresh();
				}
			});
		},
		onAggrAction: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var oSource = oEvent.getSource();
			var oEntity = oSource.data("entity");
			var field = oSource.data("field");
			var text = oSource.data("text");
			var operation = oSource.data("operation");
			var oSmartTable = sap.ui.getCore().getElementById(oSource.data("tableId"));
			var oTable = oSmartTable.getTable();
			if (!oSource.data("selected")) {
				var AggregateEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet("Aggregate_Data").entityType);
				if (AggregateEntityType) {
					var urlParameters = {};
					urlParameters['field'] = field;
					urlParameters['operation'] = operation;
					urlParameters['entity'] = oEntity;
					sap.ui.core.BusyIndicator.show(0);
					oModel.read("/" + "Aggregate_Data", {
						urlParameters: urlParameters,
						success: function (oData, response) {
							if (oData.results && oData.results.length > 0) {
								var footerData = viewModel.getProperty("/footerData_" + oEntity + "/data");
								footerData.push({
									column: field,
									label: text,
									operation: operation,
									value: oData.results[0].agg_val
								});
								viewModel.setProperty("/footerData_" + oEntity + "/data", []);
								viewModel.setProperty("/footerData_" + oEntity + "/data", footerData);
								if (!oTable.getFooter()) {
									var footerText = new sap.m.Text({
										wrapping: true,
										text: {
											parts: [{ path: "viewModel>/footerData_" + oEntity + "/data" }],
											formatter: function (values) {
												var text = "";
												if (values && values.length > 0) {

													values.forEach(function (obj, index) {
														if (obj.operation == 'total') {
															text = text + "Σ.";
														} else {
															text = text + "Avg.";
														}
														text = text + obj.label + ": ";
														if (values.length !== index + 1) {
															text = text + obj.value + ", ";
														} else {
															text = text + obj.value;
														}
													});
												} else {
													oTable.destroyFooter();
												}
												return text;
											}
										}
									});
									oTable.setFooter(footerText);
								}
								oSource.setIcon("sap-icon://accept");
								oSource.data("selected", true);
							}
							sap.ui.core.BusyIndicator.hide();
						},
						error: function (oData, response) {
							sap.ui.core.BusyIndicator.hide();
						}
					});
				}
			} else {
				var footerData = viewModel.getProperty("/footerData_" + oEntity + "/data");
				var selectedProp = footerData.filter(
					function (obj) {
						if (obj.column != field || obj.operation != operation) {
							return obj;
						}
					}
				);
				viewModel.setProperty("/footerData_" + oEntity + "/data", []);
				if (selectedProp.length == 0) {
					oTable.destroyFooter();
				} else {
					viewModel.setProperty("/footerData_" + oEntity + "/data", selectedProp);
				}
				oSource.setIcon("");
				oSource.data("selected", false);
			}
		},
		getTableFooterText: function (values) {
			var text = "";
			if (values && values.length > 0) {

				values.forEach(function (obj, index) {
					if (obj.operation == 'total') {
						text = text + "Σ.";
					} else {
						text = text + "Avg.";
					}
					text = text + obj.label + ": ";
					if (values.length !== index + 1) {
						text = text + obj.value + ", ";
					} else {
						text = text + obj.value;
					}
				});
			}
			return text;
		},
		onRemoveTableFooter: function (oSmartTable) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			var oTable = oSmartTable.getTable();
			var oEntity = oSmartTable.getEntitySet();
			if (oMetaModel.getODataEntitySet(oEntity)) {
				var oEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(oEntity).entityType);
				var parentEntity = oEntityType.navigationProperty.find(function (obj) { if (obj.fromRole.startsWith("ToRole")) { return obj } });
				if (parentEntity) {
					parentEntity = parentEntity.name.split("to_")[1];
					var parentTable = oController.getFacetParentTable(parentEntity, true);
					if (viewModel.getProperty("/saveOnDetailDetailPerformed")) {
						viewModel.setProperty("/footerData_" + parentEntity + "/data", []);
					}
				}
				if (oTable.destroyFooter) {
					oTable.destroyFooter();
				}
				viewModel.setProperty("/footerData_" + oEntity + "/data", []);
			}
		},
		readPath: function (entitySet, sPath) {
			var oController = this;

			var oModel = oController.getView().getModel();
			if (oModel) {
				var oMetaModel = oModel.getMetaModel();
				if (!oMetaModel.getODataEntitySet(entitySet)) {
					oModel = oController.getOwnerComponent().getModel();
				}
			}

			//			var oModel = oController.getOwnerComponent().getModel();
			oModel.read(sPath, {
				urlParameters: oController.readQueryPrepare(entitySet)
			});
		},

		//

		//	#164828 -> Approval Integration via Action code(GTM sync ) --Start		
		onBulkeditChanges: function (oEvent, fromCodes) {
			var oController = this;
			var customData = {};
			if (fromCodes) {
				customData["codes"] = true;
				customData["codeEntity"] = oEvent.getSource().data("entity");
				customData["DSCId"] = oEvent.getSource().data("DSCId");
			}
			oController.onDscApply(oEvent, customData);
		},
		//	#164828 -> Approval Integration via Action code(GTM sync ) --End
		//	#164828 -> Approval Integration via Action code(GTM sync ) --Start
		displayCodesInDetail: function (
			DSCId,
			selectedRows,
			dynamicSideContent,
			oSmartTable,
			editingStatusDSC
		) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var sideContentTable = oController.getView().byId(DSCId + "::Table");
			if (!sideContentTable) {
				var sideContentTable = sap.ui.getCore().byId(DSCId + "::Table");
			}
			var oTargetEntity, segmentedButton;
			var bundle = oController.getView().getModel("i18n").getResourceBundle();

			var oTable = oSmartTable.getTable();
			var oneRowSelected = true;
			if (oTable.getSelectedIndices) {
				oneRowSelected =
					oTable.getSelectedIndices().length == 1 ? true : false;
			} else {
				oneRowSelected = oTable.getSelectedItems().length == 1 ? true : false;
			}
			var viewModel = oController.getView().getModel("viewModel");
			var sEntitySet = oSmartTable.getEntitySet();
			var entity = oModel
				.getMetaModel()
				.getODataEntityType(
					oModel.getMetaModel().getODataEntitySet(sEntitySet).entityType
				);

			var oPanel = sideContentTable
				.getParent()
				.getParent()
				.getContentAreas()[1];
			oPanel.removeAllContent();
			var oItems = [],
				oCodeListItems = [];
			if (entity.navigationProperty && entity.navigationProperty.length > 0) {
				for (var i = 0; i < entity.navigationProperty.length; i++) {
					oTargetEntity = oMetaModel.getODataEntityType(
						oMetaModel.getODataAssociationEnd(
							entity,
							entity.navigationProperty[i].name
						).type
					);
					if (oTargetEntity && oTargetEntity["vui.bodc.workspace.CodesEditable"] && oTargetEntity["vui.bodc.workspace.DisplayCodesInDetail"]) {
						var oCells = [];
						var listEntity = oMetaModel.getODataAssociationSetEnd(
							entity,
							entity.navigationProperty[i].name
						).entitySet;
						var valueFieldProp = _.find(oTargetEntity["property"], {
							name: "value",
						});

						var codeListItemPath = "/" + listEntity;
						var oFilters = [];
						oFilters.push(
							new sap.ui.model.Filter(
								"seltd",
								sap.ui.model.FilterOperator.EQ,
								true
							)
						);
						// if codes entity is of single select type can we show it as like a dropdown field in stead of multi select
						// VHD#740535->Error as Workspace encountered internal server error on cal run post
						if (!(oTargetEntity['vui.bodc.workspace.SingleSelect'] && oTargetEntity['vui.bodc.workspace.SingleSelect'].Bool)) {
							var actionCodeMultiInput = new sap.m.MultiInput({
								editable: false,
								width: "100%",
							}).addStyleClass("actionCodeMultiInputField");

							var tokenTemplate = new sap.m.Token({
								key: "{value}",
								text: "{text}",
							});

							actionCodeMultiInput.bindAggregation("tokens", {
								path: codeListItemPath,
								template: tokenTemplate,
								filters: oFilters,
							});

							actionCodeMultiInput.attachTokenChange(function (oEvent) {
								var tokens = oEvent.getSource().getTokens();
								var sPath;
								for (var i = 0; i < tokens.length; i++) {
									if (
										tokens[i]
											.getModel()
											.getProperty(tokens[i].getBindingContext().getPath())
											.seltd
									) {
										sPath = tokens[i].getBindingContext().getPath();
										break;
									}
								}
								if (sPath) {
									oController.setBindingPathToCodeEntityFields(
										sPath,
										oEvent.getSource().data("entity"),
										oEvent.getSource().data("DSCId")
									);
								}
							}, oController);

							var actionCodeMultiInputButton = new sap.m.Button({
								icon: "sap-icon://slim-arrow-down",
								tooltip: "",
								press: [oController.actionCodePopover, oController],
							}).addStyleClass("actionCodeMultiInputButton");
							actionCodeMultiInputButton.destroyTooltip();
							actionCodeMultiInputButton.data({
								entity: listEntity,
								DSCId: DSCId,
								label:
									oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"][
										"TypeName"
									].String,
							});
						}
						else {
							//#117-Approval Codes : When there is a Lock on Document we aren't disabling respective approval Codes
							var actionEnable;
							if (editingStatusDSC == "1") {
								actionEnable = true;
							} else {
								actionEnable = false;
							}
							var actionCodeMultiInput = new sap.m.Select({

								width: "auto",
								enabled: actionEnable

								//change : oController.onCodesSelectionChange.bind(oController),

							}).addStyleClass("actionCodeMultiInputField");
							//#117-Approval Codes : When there is a Lock on Document we aren't disabling respective approval Codes
							var tokenTemplate = new sap.ui.core.Item({
								key: "{viewModel>value}",
								text: "{viewModel>text}",
							});
							// actionCodeMultiInput.addItem(new sap.ui.core.Item({
							// 	key: "",
							// 	text: "",
							// }));
							actionCodeMultiInput.bindAggregation("items", "viewModel>/codeInDetail" + listEntity + "itemsData", tokenTemplate);
							var selectedKey;

							oModel.read("/" + listEntity, {

								success: function (oData, response, test) {
									if (oData.results[0]) {
										var responseEntity = oData.results[0].__metadata.type
											.split(".")
										[
											oData.results[0].__metadata.type.split(".").length - 1
										].split("Type")[0];
										oData.results.splice(0, 0, { value: "", text: "" });
										viewModel.setProperty(
											"/codeInDetail" + responseEntity + "itemsData",
											$.extend(true, {}, oData.results)
										);
										if (oData.results && oData.results.length > 0) {
											var selectedItem = oData.results.find(function (obj) { return obj.seltd });
											if (selectedItem) {
												actionCodeMultiInput.setSelectedKey(selectedItem.value);
											} else {
												actionCodeMultiInput.setSelectedKey("");
											}
										} else {
											actionCodeMultiInput.setSelectedKey("");
										}
									}
								},
							});
							actionCodeMultiInput.attachChange(function (oEvent) {
								var oParent = oEvent.getSource();
								oModel.resetChanges();
								var sPath = oEvent.getParameter("selectedItem").getBindingContext("viewModel").getPath();
								var item = viewModel.getProperty(sPath);
								sPath = item.__metadata.id.split(oEvent.getSource().data("entity"))[1];
								sPath = "/" + oEvent.getSource().data("entity") + sPath;
								if (sPath) {
									oController.setBindingPathToCodeEntityFields(
										sPath,
										oEvent.getSource().data("entity"),
										oEvent.getSource().data("DSCId")
									);
								}

								//actionCodeMultiInput.getBindingInfo("items").binding.refresh();



								var urlParameters = {};
								var selected = oModel.getProperty(sPath);
								selected.seltd = true;

								// selectedKey = oModel.getProperty(sPath + "/value");
								// oParent.getParent().getItems()[0].setSelectedKey(selectedKey);


								oModel.update(sPath, { "seltd": true }, {
									method: "PUT",
									batchGroupId: "changes",
									success: function (data) {
										oParent.getParent().getItems()[0].getBindingInfo("items").binding.refresh()
										var urlParameters = oController.readQueryPrepare(sEntitySet);
										urlParameters["$skip"] = 0;
										urlParameters["$top"] = 100;
										oModel.read("/" + sEntitySet, {

											urlParameters: urlParameters,
											success: function (oData, response) {

											},
										});
									},
									error: function (e) {
										//					alert("error");
									}
								});
								viewModel.setProperty("/modelChanged", true);
								// confirmation popup changes nav from launchpad
								if (parent && parent.commonUtils && parent.commonUtils.dataChanged) {
									parent.commonUtils.dataChanged = true;
								}
								// confirmation popup changes nav from launchpad
								oModel.submitChanges({
									batchGroupId: "changes",
									// success: function (oData, response) {
									// 	sap.ui.core.BusyIndicator.hide();
									// 	oController.showMessagePopover(oController.messageButtonId);
									// 	oController.optimizedUpdateCalls(entity, sPath);
									// 	//						oModel.refresh();
									// },
									// error: function (data, response) {
									// 	oController.showMessagePopover(oController.messageButtonId);
									// 	sap.ui.core.BusyIndicator.hide();
									// }
								});
							}, oController);

							var actionCodeMultiInputButton = "";

						}

						// if codes entity is of single select type can we show it as like a dropdown field in stead of multi select

						actionCodeMultiInput.data({
							entity: listEntity,
							DSCId: DSCId,
							label:
								valueFieldProp["com.sap.vocabularies.Common.v1.Label"].String,
						});




						//						actionCodeMultiInput.bindAggreation
						oController.sidePanelDSC[listEntity + "_popover"] = {};
						var hbox = new sap.m.HBox({
							width: "100%",
							alignItems: sap.m.FlexAlignItems.Center,
							items: [actionCodeMultiInput, actionCodeMultiInputButton],
						}).addStyleClass("actionCodeMultiInputHBox");

						var smartFormGroup = new sap.ui.comp.smartform.Group({
							label:
								oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"][
									"TypeName"
								].String,
							alignItems: sap.m.FlexAlignItems.Center,
							groupElements: [
								new sap.ui.comp.smartform.GroupElement({
									label:
										valueFieldProp["com.sap.vocabularies.Common.v1.Label"]
											.String,
									elements: [hbox],

								})
							],
						});
						//						oCodeListItems.push({
						//							codeEntity: listEntity,
						//							label: oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"]["TypeName"].String,
						//							inputControl: actionCodeMultiInput,
						//							buttonControl: actionCodeMultiInputButton
						//						});

						if (oTargetEntity["com.sap.vocabularies.UI.v1.Identification"]) {
							_.each(
								oTargetEntity["com.sap.vocabularies.UI.v1.Identification"],
								function (codeLineItem) {
									var cellProperties = _.find(oTargetEntity["property"], {
										name: codeLineItem.Value.Path,
									});
									//								var obj = { "row1": cellProperties["com.sap.vocabularies.Common.v1.Label"].String, "field": cellProperties.name, "codeEntity": listEntity };
									var input;
									if (codeLineItem.NotesField) {
										if (oneRowSelected) {
											if (oController.codesDataEnabled === "1") {
												input = new sap.m.TextArea({
													value: "{" + cellProperties.name + "}",
													editable: "{= ${seltd_fc} === 3}",
													rows: 3,
												});
											} else {
												input = new sap.m.TextArea({
													value: "{" + cellProperties.name + "}",
													editable: false,
													rows: 3,
												});
											}
										} else {
											if (oController.codesDetails.allRowsLocked) {
												input = new sap.m.TextArea({
													value: "{" + cellProperties.name + "}",
													editable: false,
													rows: 3,
												});
											} else {
												input = new sap.m.TextArea({
													value: "{" + cellProperties.name + "}",
													rows: 3,
												});
											}
										}
									} else {
										input = oController.prepareSideContentTableInput(
											codeLineItem,
											cellProperties,
											oTargetEntity,
											listEntity,
											""
										);
									}
									var groupElement = new sap.ui.comp.smartform.GroupElement({
										label:
											cellProperties["com.sap.vocabularies.Common.v1.Label"]
												.String,
										elements: [input],
									});
									groupElement.data("codeEntity", listEntity);
									groupElement.data("codeEntityField", true);
									smartFormGroup.addGroupElement(groupElement);
								}
							);
						}
					}

				}
			}
			var editable = true;
			if (oneRowSelected) {
				editable = oController.codesDataEnabled === "1";
			} else {
				editable = !oController.codesDetails.allRowsLocked;
			}
			var oForm = new sap.ui.comp.smartform.SmartForm({
				editable: editable,
				groups: [smartFormGroup],
				//#164828 -> Approval Integration via Action code(GTM sync )
			}).addStyleClass("actionCodeMultiInputSmartForm");
			//#164828 -> Approval Integration via Action code(GTM sync )
			//			var oTable = new sap.m.Table({
			//				columns: [
			//					new sap.m.Column({
			//						visible: true
			//					}),
			//					new sap.m.Column({
			//						visible: true
			//					})
			//				],
			//				items: oItems
			//			}).addStyleClass("DSCDetailsTable vistexCompactStyle");
			oPanel.addContent(oForm);
			//			return oCodeListItems;
		},
		onMatchFieldValueSearch: function (oEvent) {
			var oController = this;
			var bundle = oController
				.getOwnerComponent()
				.getModel("i18n")
				.getResourceBundle();
			var fromSuggestions = oEvent.getParameter("fromSuggestions");
			var viewModel = oController.getView().getModel("viewModel"),
				matchEntities = [],
				oMatchPaths = [];
			//11500 Payment Manual Match suggestions search level dropdown issue
			viewModel.setProperty("/menuButtonVisibility", true);
			//11500 Payment Manual Match suggestions search level dropdown issue
			if (!window.fuzzyMatch) {
				oController.openMatchToolsDialog(oEvent);
				return;
			}
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var sEntity = oEvent.getSource().data("parentEntity");
			var label =
				bundle.getText("SELECTF4LABEL") +
				" " +
				oEvent.getSource().data("label");
			var entity = oMetaModel.getODataEntityType(
				oMetaModel.getODataEntitySet(sEntity).entityType
			);
			var matchField = oMetaModel.getODataProperty(
				entity,
				oEvent.getSource().data("fname")
			);
			var matchPaths,
				matchData = [];
			if (matchField) {
				matchPaths = matchField["vui.bodc.Workspace.MatchSteps"];
			} else {
				matchPaths = oEvent.getSource().data("matchSteps");
			}
			if (!matchPaths) {
				matchPaths = [];
				matchPaths.push({ String: "--" });
			}
			var matchEntity = oEvent.getSource().data("matchEntity");
			var matchEntityType = oMetaModel.getODataEntityType(
				oMetaModel.getODataEntitySet(matchEntity).entityType
			);
			matchPaths.forEach(function (match) {
				var fuzzyFields = [],
					id;
				if (match.String.split("--")[0] == "ALL") {
					id = "All";
				} else {
					id = match.String.split("--")[0];
				}
				if (
					matchEntityType["vui.bodc.workspace.ManualMatchMapping/" + id] &&
					matchEntityType["vui.bodc.workspace.ManualMatchMapping/" + id][
					"FuzzyFields"
					]
				) {
					fuzzyFields =
						matchEntityType["vui.bodc.workspace.ManualMatchMapping/" + id][
						"FuzzyFields"
						];
				}
				matchData.push({
					match_stpid: match.String.split("--")[0],
					stpid_descr: match.String.split("--")[1],
					parentEntity: oEvent.getSource().data("parentEntity"),
					headerField: oEvent.getSource().data("headerField"),
					matchEntity: matchEntity,
					fuzzyFields: fuzzyFields,
				});
			});
			viewModel.setProperty("/suggestionsMatchList", matchData);
			viewModel.setProperty("/selectedMatch", matchData[0]);
			if (oEvent.getSource().data("sourceInputId")) {
				//				fromSuggestions = true;
			}
			viewModel.setProperty("/matchDialogFromSuggestions", fromSuggestions);
			viewModel.setProperty(
				"/matchDialogUserInputValue",
				oEvent.getParameter("_userInputValue")
			);
			viewModel.setProperty("/matchDialogLabel", label);
			// viewModel.setProperty("/matchData", oEvent.getSource().data());
			if (oController._oMatchDialog) {
				oController._oMatchDialog.removeAllContent();
				delete oController._oMatchDialog;
			}
			oController._oMatchDialog = sap.ui.jsfragment(
				"vui.workspace.fragment.SuggestionsDialog",
				oController
			);
			jQuery.sap.syncStyleClass(
				oController.getOwnerComponent().getContentDensityClass(),
				oController.getView(),
				oController._oMatchDialog
			);
			oController._oMatchDialog.data(
				"matchSourceField",
				oEvent.getSource().data("matchSourceField")
			);
			if (oEvent.getSource().data("sourceInputId")) {
				oController._oMatchDialog.data(
					"sourceInputId",
					oEvent.getSource().data("sourceInputId")
				);
			} else {
				oController._oMatchDialog.data(
					"sourceInputId",
					oEvent.getSource().getId()
				);
			}
			if (fromSuggestions && matchData[0]) {
				oModel.callFunction("/" + matchData[0].match_stpid + "_VH_OPEN", {
					method: "POST",
					groupId: "postMethod",
					success: function (oData, response) {
						oController.getView().addDependent(oController._oMatchDialog);
						oController._oMatchDialog.open();
					},
				});
			} else {
				oController.getView().addDependent(oController._oMatchDialog);
				oController._oMatchDialog.open();
			}
		},
		actionCodePopover: function (oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var oSource = oEvent.getSource();
			var hbox = oSource.getParent();
			var oCustomData = oSource.data();

			if (
				oController.sidePanelDSC[oCustomData.entity + "_popover"] &&
				oController.sidePanelDSC[oCustomData.entity + "_popover"].content
			) {
				oController.sidePanelDSC[
					oCustomData.entity + "_popover"
				].content.openBy(hbox);
			} else {
				oController.sidePanelDSC[oCustomData.entity + "_popover"] = {};
				var codesList = oController.onEditableCodeSectionPrepare(
					oCustomData.entity,
					oCustomData.DSCId,
					false
				);
				oController.sidePanelDSC[oCustomData.entity + "_popover"].content =
					new sap.m.Popover({
						//					title: oCustomData.label,
						contentWidth: "210px",
						showHeader: false,
						showArrow: false,
						placement: sap.m.PlacementType.Top,
						content: [codesList],
					}).data({ sourceId: hbox.getItems()[0].getId() });
				oController
					.getView()
					.addDependent(
						oController.sidePanelDSC[oCustomData.entity + "_popover"].content
					);
				setTimeout(function () {
					oController.sidePanelDSC[
						oCustomData.entity + "_popover"
					].content.openBy(hbox);
				}, 1000);
			}
		},
		onEditableCodeSectionPrepare: function (listEntity, DSCId, showHeader) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var bundle = oController.getView().getModel("i18n").getResourceBundle();
			var oTargetEntity = oMetaModel.getODataEntityType(
				oMetaModel.getODataEntitySet(listEntity).entityType
			);

			var workspaceviewEntity = oMetaModel.getODataEntityType(
				oMetaModel.getODataEntitySet("WorkspaceView").entityType
			),
				autoUpdate;
			if (
				workspaceviewEntity["vui.bodc.workspace.AutoUpdateDisable"] &&
				workspaceviewEntity["vui.bodc.workspace.AutoUpdateDisable"].Bool &&
				workspaceviewEntity["vui.bodc.workspace.AutoUpdateDisable"].Bool ==
				"true"
			) {
				autoUpdate = false;
			} else {
				autoUpdate = true;
			}

			var sideContentTable = oController.getView().byId(DSCId + "::Table");
			if (!sideContentTable) {
				var sideContentTable = sap.ui.getCore().byId(DSCId + "::Table");
			}
			var oSmartTable, oTargetEntity, segmentedButton;
			var dynamicSideContent =
				oController.getResponsiveSplitter(sideContentTable);

			if (dynamicSideContent.getMainContent()[1]) {
				oSmartTable = dynamicSideContent.getMainContent()[1];
			} else {
				oSmartTable = dynamicSideContent.getMainContent()[0];
			}

			var oTable = oSmartTable.getTable();
			var oneRowSelected = true;
			if (oTable.getSelectedIndices) {
				oneRowSelected =
					oTable.getSelectedIndices().length == 1 ? true : false;
			} else {
				oneRowSelected = oTable.getSelectedItems().length == 1 ? true : false;
			}
			var sEntitySet = oSmartTable.getEntitySet();

			if (oneRowSelected) {
				var singleSelect = false;
				if (
					oTargetEntity["vui.bodc.workspace.SingleSelect"] &&
					oTargetEntity["vui.bodc.workspace.SingleSelect"].Bool
				) {
					singleSelect = true;
				}
				var oAcgrpField = oTargetEntity.property.find(function (obj) {
					return obj.name == "acgrp";
				});
				if (oAcgrpField) {
					var customListItem;
					if (oController.codesDataEnabled === "1") {
						customListItem = new sap.m.CustomListItem({
							content: new sap.m.CheckBox({
								selected: "{seltd}",
								enabled: "{= ${seltd_fc} === 3}",
								partiallySelected: "{psltd}",
								text: "{text}",
							}),
						});
					} else {
						customListItem = new sap.m.CustomListItem({
							content: new sap.m.CheckBox({
								selected: "{seltd}",
								enabled: false,
								partiallySelected: "{psltd}",
								text: "{text}",
							}),
						});
					}
					var codesList = new sap.m.List().data({
						entity: listEntity,
						refresh: true,
						noDataText: "{i18n>NOITEMS_SMARTTABLE}",
					});
					var codeListItemPath = "/" + listEntity;
					var sorter = new sap.ui.model.Sorter("acgrp_txt", false, true);
					codesList.bindAggregation("items", {
						path: codeListItemPath,
						template: customListItem,
						sorter: sorter,
					});
					if (showHeader) {
						var oCodesToolbar = new sap.m.Toolbar();
						oCodesToolbar.addContent(
							new sap.m.Title({
								text: oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"][
									"TypeName"
								].String,
							})
						);
						//							QA#11548 - Apply button is missing in the action codes for pos claims
						if (!autoUpdate && oController.codesDataEnabled === "1") {
							oCodesToolbar.addContent(new sap.m.ToolbarSpacer());
							var oCodesApplyButton = new sap.m.Button({
								type: "Emphasized",
								press: [oController.onDscApply, oController],
								text: "{i18n>APPLY}",
								visible: "{viewModel>/" + sEntitySet + "showDscApply}"
							}).data("codes", true);
							oCodesApplyButton.data("codeEntity", listEntity);
							oCodesToolbar.addContent(oCodesApplyButton);
						}
						//							
						codesList.setHeaderToolbar(oCodesToolbar);
					}
				} else {
					var codesList = new sap.ui.comp.smartlist.SmartList({
						entitySet: listEntity,
						header:
							oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"][
								"TypeName"
							].String,
						showRowCount: false,
						enableAutoBinding: true,
					});

					var customListItem;
					if (oController.codesDataEnabled === "1") {
						customListItem = new sap.m.CustomListItem({
							content: new sap.m.CheckBox({
								selected: "{seltd}",
								enabled: "{= ${seltd_fc} === 3}",
								partiallySelected: "{psltd}",
								text: "{text}",
							}),
						});
					} else {
						customListItem = new sap.m.CustomListItem({
							content: new sap.m.CheckBox({
								selected: "{seltd}",
								enabled: false,
								partiallySelected: "{psltd}",
								text: "{text}",
							}),
						});
					}
					if (!autoUpdate && singleSelect) {
						customListItem
							.getContent()[0]
							.attachSelect(
								oController.onCodesSelectionChange.bind(oController)
							);
					}
					codesList.setListItemTemplate(customListItem);
					if (showHeader) {
						//							QA#11548 - Apply button is missing in the action codes for pos claims
						if (!autoUpdate && codesList._oToolbar && codesList._oToolbar.addContent &&
							oController.codesDataEnabled === "1") {
							codesList._oToolbar.addContent(new sap.m.ToolbarSpacer());
							var oCodesApplyButton = new sap.m.Button({
								type: "Emphasized",
								press: [oController.onDscApply, oController],
								text: "{i18n>APPLY}",
								visible: "{viewModel>/" + sEntitySet + "showDscApply}"
							}).data("codes", true);
							oCodesApplyButton.data("codeEntity", listEntity);
							codesList._oToolbar.addContent(oCodesApplyButton);
						}
						//							
					} else {
						codesList._oToolbar.addStyleClass("vistex-display-none");
					}
					codesList.attachDataReceived(function (oEvent) {
						oEvent
							.getSource()
							.getList()
							.setNoDataText(bundle.getText("NOITEMS_SMARTTABLE"));
						//						if (oController.sidePanelDSC && oController.sidePanelDSC[oEvent.getSource().getEntitySet() + "_popover"]) {
						//							var oList = oEvent.getSource().getList();
						//							if(oList.getItems().length > 0){
						//								var sPath;
						//								for(var i=0; i< oList.getItems().length; i++){
						//									if(oList.getItems()[i].getModel().getProperty(oList.getItems()[i].getBindingContextPath()).seltd){
						//										sPath = oList.getItems()[i].getBindingContextPath();
						//										break;
						//									}
						//								}
						//								if(sPath){
						//									oController.setBindingPathToCodeEntityFields(sPath, oEvent.getSource().getEntitySet(), DSCId);
						//								}
						//							}
						//						}
					});
				}
			} else {
				viewModel.setProperty("/bulkEditCode/" + listEntity, {});
				viewModel.setProperty(
					"/bulkEditCode/" + listEntity + "/entityName",
					listEntity
				);
				var codesList = new sap.m.List({
					noDataText: "{i18n>NOITEMS_SMARTTABLE}",
				});
				var singleSelect = false;
				if (
					oTargetEntity["vui.bodc.workspace.SingleSelect"] &&
					oTargetEntity["vui.bodc.workspace.SingleSelect"].Bool
				) {
					singleSelect = true;
				}
				var sorter = null;
				var oAcgrpField = oTargetEntity.property.find(function (obj) {
					return obj.name == "acgrp";
				});
				if (oAcgrpField) {
					sorter = new sap.ui.model.Sorter("acgrp_txt", false, true);
				}
				var codeListItemPath =
					"viewModel>/bulkEditCode/" + listEntity + "/itemsData";
				codesList.bindAggregation("items", {
					path: codeListItemPath,
					factory: function (sId, oContext) {
						//						if (oController.codesDetails.allRowsLocked) {
						//							return new sap.m.CustomListItem({
						//								content: new sap.m.CheckBox({
						//									selected: "{viewModel>seltd}",
						//									enabled: false,
						//									partiallySelected: "{viewModel>psltd}",
						//									text: "{viewModel>text}",
						//								}),
						//							});
						//						} else {
						return new sap.m.CustomListItem({
							content: new sap.m.CheckBox({
								select: [
									oController.onCodeListSelectionChange,
									oController,
								],
								selected: "{viewModel>seltd}",
								enabled: "{= ${viewModel>seltd_fc} === 3 }",
								partiallySelected: "{viewModel>psltd}",
								text: "{viewModel>text}",
							})
								.data({ singleSelect: singleSelect, DSCId: DSCId })
								.data("entity", listEntity),
						});
						//						}
					},
					sorter: sorter,
				});
				if (showHeader) {
					var oCodesToolbar = new sap.m.Toolbar();
					oCodesToolbar.addContent(
						new sap.m.Title({
							text: oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"][
								"TypeName"
							].String,
						})
					);
					oCodesToolbar.addContent(new sap.m.ToolbarSpacer());
					//					Changes to remove apply button and send apply action directly on change
					//						QA#11548 - Apply button is missing in the action codes for pos claims
					if (!autoUpdate && oController.codesDetails && !oController.codesDetails.allRowsLocked) {
						var oCodesApplyButton = new sap.m.Button({
							type: "Emphasized",
							press: [oController.onDscApply, oController],
							text: "{i18n>APPLY}",
							visible: "{viewModel>/" + sEntitySet + "showDscApply}"
						}).data("codes", true);
						oCodesApplyButton.data("codeEntity", listEntity);
						oCodesToolbar.addContent(oCodesApplyButton);
					}
					//
					codesList.setHeaderToolbar(oCodesToolbar);
				}
				//										codesList.bindElement("/" + listEntity);
				oModel.read("/" + listEntity, {
					urlParameters: oController.codesDetails.urlParameters,
					success: function (oData, response, test) {
						if (oData.results[0]) {
							var responseEntity = oData.results[0].__metadata.type
								.split(".")
							[
								oData.results[0].__metadata.type.split(".").length - 1
							].split("Type")[0];
							viewModel.setProperty(
								"/bulkEditCode/" + responseEntity + "/itemsData",
								$.extend(true, {}, oData.results)
							);
							viewModel.setProperty(
								"/bulkEditCode/" + responseEntity + "/referenceItemsData",
								$.extend(true, {}, oData.results)
							);
						}
					},
				});
			}
			//	itemTabBar.getItems()[1].addContent(codesList);
			return codesList;
		},
		setBindingPathToCodeEntityFields: function (sPath, listEntity, DSCId) {
			var oController = this;
			var sideContentTable = oController.getView().byId(DSCId + "::Table");
			if (!sideContentTable) {
				var sideContentTable = sap.ui.getCore().byId(DSCId + "::Table");
			}

			if (sideContentTable.getItems().length > 0) {
				_.each(sideContentTable.getItems(), function (item) {
					if (
						item.data("codeEntityField") &&
						item.data("codeEntity") == listEntity
					) {
						item.unbindElement();
						item.bindElement(sPath);
					}
				});
			}
			var oLowerPanel = sideContentTable
				.getParent()
				.getParent()
				.getContentAreas()[1];
			if (oLowerPanel.getContent()[0]) {
				var oLowerForm = oLowerPanel.getContent()[0];
				var oItems = oLowerForm.getGroups()[0].getGroupElements();
				if (oItems.length > 1) {
					_.each(oItems, function (item) {
						if (
							item.data("codeEntityField") &&
							item.data("codeEntity") == listEntity
						) {
							item.unbindElement();
							item.bindElement(sPath);
						}
					});
				}
			}
		},
		prepareSideContentTableInput: function (
			field_propLineItem,
			field_prop,
			oEntityType,
			sEntitySet,
			selectedPath
		) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			var workspaceviewEntity = oMetaModel.getODataEntityType(
				oMetaModel.getODataEntitySet("WorkspaceView").entityType
			);
			var autoUpdate;
			if (
				workspaceviewEntity &&
				workspaceviewEntity["vui.bodc.workspace.AutoUpdateDisable"] &&
				workspaceviewEntity["vui.bodc.workspace.AutoUpdateDisable"].Bool &&
				workspaceviewEntity["vui.bodc.workspace.AutoUpdateDisable"].Bool ==
				"true"
			) {
				autoUpdate = false;
			} else {
				autoUpdate = true;
			}
			var editable;
			if (oEntityType["vui.bodc.workspace.CodesEditable"]) {
				editable = true;
			} else {
				editable = "{= ${edtst} === '1' }";
			}
			var input;
			if (
				field_propLineItem.NoOfDecimals ||
				field_propLineItem["ManualUnitField"] ||
				field_prop["sap:unit"]
			) {
				var noofDecimals = 2;
				if (field_propLineItem.NoOfDecimals) {
					noofDecimals = field_propLineItem.NoOfDecimals.String;
				}
				if (
					(field_prop["com.sap.vocabularies.UI.v1.ReadOnly"] &&
						field_prop["com.sap.vocabularies.UI.v1.ReadOnly"].Bool &&
						field_prop["com.sap.vocabularies.UI.v1.ReadOnly"].Bool ==
						"true") ||
					(field_prop["com.sap.vocabularies.Common.v1.FieldControl"] &&
						field_prop["com.sap.vocabularies.Common.v1.FieldControl"]
							.EnumMember &&
						field_prop["com.sap.vocabularies.Common.v1.FieldControl"]
							.EnumMember ==
						"com.sap.vocabularies.Common.v1.FieldControlType/ReadOnly")
				) {
					input = new sap.m.Text({
						wrapping: false,
						text:
							"{parts:[{path:'" +
							field_prop.name +
							"'},{path:'" +
							field_prop["sap:unit"] +
							"'},{value: '" +
							noofDecimals +
							"'}],formatter: 'zvui.work.controller.AnnotationHelper.formatDecimalField'}",
					});
				} else {
					//					Consider No. of decimals in edit mode
					var scaleLength = 3;
					if (field_prop["scale"]) {
						scaleLength = field_prop["scale"].length;
					}

					field_prop["scale"] = oController.zeroPadding(
						noofDecimals,
						scaleLength
					);
					if (field_propLineItem["ManualUnitField"]) {
						input = new sap.m.HBox({
							justifyContent: "End",
							alignItems: "Center",
							items: [
								new sap.ui.comp.smartfield.SmartField({
									value: "{" + field_prop.name + "}",
									editable: editable,
									change: [oController.onTableFieldChange, oController],
								}),
								new sap.ui.comp.smartfield.SmartField({
									value: "{" + field_prop["sap:unit"] + "}",
									editable: editable,
									change: [oController.onTableFieldChange, oController],
								}).addStyleClass("UnitFieldMarginLeft"),
							],
						});
					} else {
						input = new sap.ui.comp.smartfield.SmartField({
							value: "{" + field_prop.name + "}",
							editable: editable,
							change: [oController.onTableFieldChange, oController],
							configuration: [
								new sap.ui.comp.smartfield.Configuration({
									displayBehaviour:
										oController.getTextArrangementForSmartControl(
											field_propLineItem,
											oEntityType
										),
								}),
							],
						});
					}
				}
			} else {
				if (
					field_prop["sap:value-list"] &&
					field_prop["sap:value-list"] == "standard"
				) {
					//*** new match changes - start
					if (
						field_prop["vui.bodc.Workspace.MatchUpdateField"] &&
						field_prop["vui.bodc.Workspace.MatchUpdateField"].Bool &&
						field_prop["vui.bodc.Workspace.MatchUpdateField"].Bool == "true"
					) {
						input = new sap.m.HBox();

						var inputField = new sap.ui.comp.smartfield.SmartField({
							value: "{" + field_prop.name + "}",
							editable: editable,
							change: [oController.onTableFieldChange, oController],
							textInEditModeSource: "ValueListNoValidation",
							configuration: [
								new sap.ui.comp.smartfield.Configuration({
									displayBehaviour:
										oController.getTextArrangementForSmartControl(
											field_propLineItem,
											oEntityType
										),
								}),
							],
						}).data({
							selectedPath: selectedPath,
							parentEntity: sEntitySet,
							matchEntity: field_prop["vui.bodc.Workspace.MatchEntityName"]
								? field_prop["vui.bodc.Workspace.MatchEntityName"][0].String
								: "",
							matchSteps: field_prop["vui.bodc.Workspace.MatchSteps"],
							matchSourceField:
								field_prop["vui.bodc.workspace.MatchSourceFields"].String,
							F4Entity:
								field_prop["com.sap.vocabularies.Common.v1.ValueList"]
									.CollectionPath.String,
							f4DescrField:
								field_prop["com.sap.vocabularies.Common.v1.Text"].Path.split(
									"/"
								)[1],
							fname: field_prop.name,
							label:
								field_prop["com.sap.vocabularies.Common.v1.Label"].String,
							headerField: field_prop[
								"vui.bodc_workspace.MatchHeaderFieldGroup"
							]
								? field_prop["vui.bodc_workspace.MatchHeaderFieldGroup"]
								: "",
						});
						input.addItem(inputField);
						//						QA#8773 -  Action codes are not showing the data
						if (
							field_prop["com.sap.vocabularies.Common.v1.FieldControl"] &&
							field_prop["com.sap.vocabularies.Common.v1.FieldControl"].Path
						) {
							input.addItem(
								new sap.m.Button({
									type: "Transparent",
									icon: "sap-icon://sys-find",
									tooltip: "{i18n>MATCHSUGGESTION}",
									visible: {
										path: field_prop[
											"com.sap.vocabularies.Common.v1.FieldControl"
										].Path,
										formatter: function (value) {
											if (value == 3) {
												return true;
											}
											return false;
										},
									},
									//								press: [oController.onDscMatchFieldFireValueHelp, oController]
									press: [oController.onMatchFieldValueSearch, oController],
								}).data({
									selectedPath: selectedPath,
									parentEntity: sEntitySet,
									matchEntity: field_prop[
										"vui.bodc.Workspace.MatchEntityName"
									]
										? field_prop["vui.bodc.Workspace.MatchEntityName"][0]
											.String
										: "",
									matchSteps: field_prop["vui.bodc.Workspace.MatchSteps"],
									matchSourceField:
										field_prop["vui.bodc.workspace.MatchSourceFields"].String,
									F4Entity:
										field_prop["com.sap.vocabularies.Common.v1.ValueList"]
											.CollectionPath.String,
									f4DescrField:
										field_prop[
											"com.sap.vocabularies.Common.v1.Text"
										].Path.split("/")[1],
									fname: field_prop.name,
									label:
										field_prop["com.sap.vocabularies.Common.v1.Label"].String,
									headerField: field_prop[
										"vui.bodc_workspace.MatchHeaderFieldGroup"
									]
										? field_prop["vui.bodc_workspace.MatchHeaderFieldGroup"]
										: "",
									sourceInputId: inputField.getId(),
								})
							);
						}

						if (input.getItems().length == 1) {
							input = inputField;
						}
						//*** new match changes - end
					} else {
						if (!autoUpdate) {
							input = new sap.ui.comp.smartfield.SmartField({
								value: "{" + field_prop.name + "}",
								editable: editable,
								change: [oController.onTableFieldChange, oController],
								textInEditModeSource: "ValueListNoValidation",
								configuration: [
									new sap.ui.comp.smartfield.Configuration({
										displayBehaviour:
											oController.getTextArrangementForSmartControl(
												field_propLineItem,
												oEntityType
											),
									}),
								],
							});
						} else {
							input = new sap.ui.comp.smartfield.SmartField({
								value: "{" + field_prop.name + "}",
								editable: editable,
								changeModelValue: [
									oController.onTableFieldChange,
									oController,
								],
								// change: [oController.onTableFieldChange, oController],
								textInEditModeSource: "ValueListNoValidation",
								configuration: [
									new sap.ui.comp.smartfield.Configuration({
										displayBehaviour:
											oController.getTextArrangementForSmartControl(
												field_propLineItem,
												oEntityType
											),
									}),
								],
							});
						}
					}
				} else if (
					field_prop["sap:value-list"] &&
					field_prop["sap:value-list"] == "fixed-values"
				) {
					if (
						field_prop["vui.bodc.Workspace.MatchUpdateStatus"] &&
						field_prop["vui.bodc.Workspace.MatchUpdateStatus"].Bool &&
						field_prop["vui.bodc.Workspace.MatchUpdateStatus"].Bool == "true"
					) {
						input = new sap.m.HBox();
						input.addItem(
							new sap.m.ObjectStatus({
								text: {
									parts: [
										{ path: field_prop.name },
										{
											path: field_prop["com.sap.vocabularies.Common.v1.Text"]
												.Path,
										},
									],
									formatter: function (value, text) {
										if (text) {
											return text;
										} else {
											return value;
										}
									},
								},
								wrapping: false,
								inverted: true,
								state: field_propLineItem["Criticality"]
									? {
										path: field_propLineItem["Criticality"].Path,
										formatter: function (value) {
											if (value == 0) {
												return "None";
											} else if (value == 1) {
												return "Error";
											} else if (value == 2) {
												return "Warning";
											} else if (value == 3) {
												return "Success";
											}
										},
									}
									: "None",
								visible: {
									path: field_prop[
										"com.sap.vocabularies.Common.v1.FieldControl"
									].Path,
									formatter: function (value) {
										if (value != 3) {
											return true;
										}
										return false;
									},
								},
							})
						);
						input.addItem(
							new sap.ui.comp.smartfield.SmartField({
								value: "{" + field_prop.name + "}",
								editable: editable,
								innerControlsCreated: [
									oController.onDSCDropDownFieldCreated,
									oController,
								],
								configuration: [
									new sap.ui.comp.smartfield.Configuration({
										displayBehaviour:
											oController.getTextArrangementForSmartControl(
												field_propLineItem,
												oEntityType
											),
									}),
								],
								visible: {
									path: field_prop[
										"com.sap.vocabularies.Common.v1.FieldControl"
									].Path,
									formatter: function (value) {
										if (value == 3) {
											return true;
										}
										return false;
									},
								},
							})
						);
					} else {
						input = new sap.ui.comp.smartfield.SmartField({
							value: "{" + field_prop.name + "}",
							editable: editable,
							innerControlsCreated: [
								oController.onDSCDropDownFieldCreated,
								oController,
							],
							configuration: [
								new sap.ui.comp.smartfield.Configuration({
									displayBehaviour:
										oController.getTextArrangementForSmartControl(
											field_propLineItem,
											oEntityType
										),
								}),
							],
						});
					}
				} else if (field_prop["vui.bodc.Workspace.MatchRatingField"]) {

					//Displaying status and score Fields in Side content Data
					var statusField = oEntityType["property"].find(function (obj) {
						return obj["vui.bodc.Workspace.MatchUpdateStatus"];
					});
					var matchField = oEntityType["property"].find(function (obj) {
						return obj["vui.bodc.Workspace.MatchSteps"];
					});
					//Displaying status and score Fields in Side content Data
					input = new sap.m.HBox({
						alignItems: "Center",
						items: [
							new sap.m.RatingIndicator({
								maxValue: 5,
								visible: {
									path: field_prop.name,
									formatter: function (value) {
										if (value > 0) {
											return true;
										}
										return false;
									},
								},
								value: "{" + field_prop.name + "}",
								editable: false,
								displayOnly: {
									path: statusField.name,
									formatter: function (status) {
										if (status == "M") return true;
										return false;
									},
								},
							}),
						],
					});
					var infoButton = new sap.m.Button({
						type: "Transparent",
						icon: "sap-icon://hint",
						tooltip: "{i18n>ScoreCalculation}",
						visible: {
							path: field_prop.name,
							formatter: function (value) {
								if (value > 0) {
									return true;
								}
								return false;
							},
						},
						press: [oController.displayMatchScoreInfo, oController],
					}).addStyleClass("informationIcon");
					if (
						matchField["vui.bodc.Workspace.MatchEntityName"] &&
						matchField["vui.bodc.Workspace.MatchEntityName"].length > 0
					) {
						input.addItem(infoButton);
						var matchEntity =
							matchField["vui.bodc.Workspace.MatchEntityName"][0].String;
						infoButton.data("entity", matchEntity);
					}
				} else if (field_prop.type == "Edm.DateTime") {
					input = new sap.m.HBox();
					var dateFormat = window.dateFormat
						.toLowerCase()
						.replaceAll("m", "M");
					var dateEditField = new sap.m.DatePicker({
						editable: editable,
						displayFormat: dateFormat,
						valueFormat: dateFormat,
						value: {
							path: field_prop.name,
							type: "sap.ui.model.odata.type.DateTime",
							constraints: { displayFormat: "Date" },
							formatOptions: { pattern: dateFormat },
						},
						change: [oController.onTableFieldChange, oController],
					});
					input.addItem(dateEditField);
					var dateDisplayField = new sap.m.Text({
						text:
							"{parts:[{path:'" +
							field_prop.name +
							"'}],formatter: 'zvui.work.controller.AnnotationHelper.getChangeDateFormat'}",
					});
					input.addItem(dateDisplayField);
					if (
						field_prop["com.sap.vocabularies.Common.v1.FieldControl"] &&
						field_prop["com.sap.vocabularies.Common.v1.FieldControl"]
							.EnumMember &&
						field_prop["com.sap.vocabularies.Common.v1.FieldControl"]
							.EnumMember ==
						"com.sap.vocabularies.Common.v1.FieldControlType/ReadOnly"
					) {
						dateEditField.setVisible(false);
						dateDisplayField.setVisible(true);
					} else if (
						field_prop["com.sap.vocabularies.Common.v1.FieldControl"] &&
						field_prop["com.sap.vocabularies.Common.v1.FieldControl"]
							.EnumMember &&
						field_prop["com.sap.vocabularies.Common.v1.FieldControl"]
							.EnumMember ==
						"com.sap.vocabularies.Common.v1.FieldControlType/Hidden"
					) {
						dateEditField.setVisible(false);
						dateDisplayField.setVisible(false);
					} else if (
						field_prop["com.sap.vocabularies.Common.v1.FieldControl"] &&
						field_prop["com.sap.vocabularies.Common.v1.FieldControl"].Path
					) {
						dateEditField.bindProperty(
							"visible",
							field_prop["com.sap.vocabularies.Common.v1.FieldControl"].Path,
							function (value) {
								if (value == 3 || value == 7) {
									return true;
								}
								return false;
							}
						);
						dateDisplayField.bindProperty(
							"visible",
							field_prop["com.sap.vocabularies.Common.v1.FieldControl"].Path,
							function (value) {
								if (value == 1) {
									return true;
								}
								return false;
							}
						);
					} else {
						dateEditField.setVisible(true);
						dateDisplayField.setVisible(false);
					}
				} else {
					input = new sap.ui.comp.smartfield.SmartField({
						value: "{" + field_prop.name + "}",
						editable: editable,
						change: [oController.onTableFieldChange, oController],
						configuration: [
							new sap.ui.comp.smartfield.Configuration({
								displayBehaviour:
									oController.getTextArrangementForSmartControl(
										field_propLineItem,
										oEntityType
									),
							}),
						],
					});
				}
				if (field_propLineItem["Criticality"]) {
					if (input.setControlProposal) {
						input.setControlProposal(
							new sap.ui.comp.smartfield.ControlProposal({
								objectStatus: new sap.ui.comp.smartfield.ObjectStatus({
									criticality:
										"{" + field_propLineItem["Criticality"].Path + "}",
									criticalityRepresentationType: "WithoutIcon",
								}),
							})
						);
					} else if (
						input.getItems &&
						input.getItems()[1] &&
						input.getItems()[1].setControlProposal
					) {
						input.getItems()[1].setControlProposal(
							new sap.ui.comp.smartfield.ControlProposal({
								objectStatus: new sap.ui.comp.smartfield.ObjectStatus({
									criticality:
										"{" + field_propLineItem["Criticality"].Path + "}",
									criticalityRepresentationType: "WithoutIcon",
								}),
							})
						);
					}
				}
			}
			input.setWidth("100%");
			return input;
		},
		onDSCDropDownFieldCreated: function (oEvent) {
			var oController = this;
			var innerControl = oEvent.getSource().getInnerControls();
			if (
				innerControl &&
				innerControl.length > 0 &&
				innerControl[0] instanceof sap.m.ComboBox
			) {
				var comboBox = innerControl[0];
				comboBox.attachChange(oController.onTableFieldChange, oController);
			}
		},
		displayMatchScoreInfo: function (oEvent, manualMatch) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oSource = oEvent.getSource();
			var oMetaModel = oModel.getMetaModel();
			var sTableItemPath = oEvent
				.getSource()
				.getParent()
				.getParent()
				.getBindingContext()
				.getPath();
			var sourceEntity = sTableItemPath.split("(")[0].slice(1);
			var targetEntity = oEvent.getSource().data("entity");
			var oTableItemData = oModel.getProperty(sTableItemPath);
			var urlParameters = {};
			urlParameters["row_id"] = oTableItemData["row_id"];
			urlParameters["match_comparison"] = true;
			oModel.read("/" + targetEntity, {
				urlParameters: urlParameters,
				success: function (oData, response) {
					if (oData.results && oData.results.length > 0) {
						var targetPath =
							"/" +
							oData.results[0].__metadata.id.split("/")[
							oData.results[0].__metadata.id.split("/").length - 1
							];
						//						oController.matchCompareDialogPrepare(oSource, sourceEntity, targetEntity, sTableItemPath, targetPath);
						oController.matchCompareDialogPrepare(
							oSource,
							sourceEntity,
							targetEntity,
							oTableItemData,
							targetPath,
							oData.results[0].stpid
						);
					}
				},
			});
		},
		displayManualMatchScoreInfo: function (oEvent) {
			var oController = this;
			var sourcePath = oController.DSCSourcePath;
			var oModel = oController.getView().getModel();
			var viewModel = oController.getView().getModel("viewModel");
			var targetPath;
			if (oEvent.getSource().getParent().getParent().getBindingContextPath) {
				targetPath = oEvent
					.getSource()
					.getParent()
					.getParent()
					.getBindingContextPath();
			} else if (
				oEvent.getSource().getParent().getParent().getBindingContext().getPath
			) {
				targetPath = oEvent
					.getSource()
					.getParent()
					.getParent()
					.getBindingContext()
					.getPath();
			}
			var oSource = oEvent.getSource();
			var targetEntity = oEvent.getSource().data("entity");
			var sourceEntity = sourcePath.split("(")[0].slice(1);
			//			var oSourceData = oModel.getProperty(sourcePath);
			var oSourceData = viewModel.getProperty("/matchFilterData");
			//			oController.matchCompareDialogPrepare(oSource, sourceEntity, targetEntity, sourcePath, targetPath);
			oController.matchCompareDialogPrepare(
				oSource,
				sourceEntity,
				targetEntity,
				oSourceData,
				targetPath,
				"",
				true
			);
		},
		matchCompareDialogPrepare: function (
			oSource,
			sourceEntity,
			targetEntity,
			sourcedata,
			targetPath,
			stepId,
			fromManualMatch
		) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var oTableEntity = oMetaModel.getODataEntityType(
				oMetaModel.getODataEntitySet(targetEntity).entityType
			);
			var oSourceEntity = oMetaModel.getODataEntityType(
				oMetaModel.getODataEntitySet(sourceEntity).entityType
			);
			//			viewModel.setProperty("/" + oEvent.getSource().data("entity") + "Line")
			var tableData = [];
			//stepId = "003";
			if (stepId) {
				if (
					oTableEntity["vui.bodc.workspace.ManualMatchMapping/" + stepId] &&
					oTableEntity["vui.bodc.workspace.ManualMatchMapping/" + stepId][
					stepId
					]
				) {
					_.each(
						oTableEntity["vui.bodc.workspace.ManualMatchMapping/" + stepId][
						stepId
						],
						function (item) {
							var sourceField = item.PropertyPath.split("/")[1];
							var targetField = item.PropertyPath.split("/")[3];
							var cellProperties = _.find(oSourceEntity.property, {
								name: sourceField,
							});
							if (cellProperties && sourcedata[sourceField]) {
								tableData.push({
									field:
										cellProperties["com.sap.vocabularies.Common.v1.Label"]
											.String,
									source: sourceField,
									target: targetField,
								});
							}
						}
					);
				}
			} else {
				// Triggering Metadata request
				_.each(
					oTableEntity["vui.bodc.workspace.MatchSourceFields"],
					// Triggering Metadata request
					function (item) {
						var sourceField = item.PropertyPath.split("/")[1];
						var targetField = item.PropertyPath.split("/")[3];
						var cellProperties = _.find(oSourceEntity.property, {
							name: sourceField,
						});
						if (cellProperties && sourcedata[targetField]) {
							tableData.push({
								field:
									cellProperties["com.sap.vocabularies.Common.v1.Label"]
										.String,
								source: sourceField,
								target: targetField,
							});
						}
					}
				);
			}

			viewModel.setProperty("/matchItemsData" + oTableEntity.name, tableData);
			var columnData = [
				{ col: "field", label: "Field" },
				{ col: "source", label: "Source" },
				{ col: "target", label: "Target" },
			];
			viewModel.setProperty("/matchColumnData", columnData);

			var oTable = new sap.m.Table({
				autoPopinMode: false,
				columns: [
					new sap.m.Column({
						visible: true,
						header: new sap.m.Text({
							text: "{i18n>MATCHINGFIEDS}",
						}),
					}),
					new sap.m.Column({
						visible: true,
						header: new sap.m.Text({
							text: "{i18n>SOURCE}",
						}),
					}),
					new sap.m.Column({
						visible: true,
						header: new sap.m.Text({
							text: "{i18n>SUGGESTED}",
						}),
					}),
				],
			});

			oTable.bindAggregation(
				"items",
				"viewModel>/matchItemsData" + oTableEntity.name,
				function (sId, oContext) {
					var contextObject = oContext.getObject();
					var fcat_data = viewModel.getProperty("/matchColumnData");
					var cells = [];
					_.each(fcat_data, function (obj) {
						var sourceValue;
						if (fromManualMatch) {
							sourceValue = sourcedata[contextObject.target];
						} else {
							sourceValue = sourcedata[contextObject.source];
						}
						if (sourceValue == undefined) sourceValue = "";
						if (obj.col == "field") {
							var text = new sap.m.Label({
								design: "Bold",
								wrapping: true,
							}).bindProperty(
								"text",
								"viewModel" + ">" + obj["col"],
								null,
								sap.ui.model.BindingMode.OneWay
							);
							cells.push(text);
						} else if (obj.col == "source") {
							var input = new sap.m.Text({
								text: sourceValue,
								wrapping: true,
							});
							//						input.bindElement(oController.DSCSourcePath);
							cells.push(input);
						} else if (obj.col == "target") {
							//						var input = new sap.m.Text({text: "{viewModel>" + sPath + "/" + contextObject.target + "}", wrapping: true});
							var input = new sap.m.FormattedText({
								htmlText: {
									parts: [
										{ value: sourceValue },
										{ path: targetPath + "/" + contextObject.target },
									],
									formatter: function (source, target) {
										return oController.getHighlightedText(source, target);
									},
								},
							});
							cells.push(input);
						}
					});
					return new sap.m.ColumnListItem({
						cells: cells,
						type: "Active",
					}).addStyleClass("noPadding");
				}
			);
			//			oTable.bindElement(sourcePath);
			var oPopover = new sap.m.Popover({
				title: "{i18n>ScoreCalculation}",
				contentWidth: "500px",
				placement: "Auto",
				content: [oTable],
			});
			oController.getView().addDependent(oPopover);
			//			var oSource = oEvent.getSource();
			oPopover.openBy(oSource);
		},
		//	#164828 -> Approval Integration via Action code(GTM sync ) --End
		// #188496 - Conditions are not diplayed - start
		onCalcDataReceived: function (oEvent) {
			var oController = this;
			var oSmarTable = oEvent.getSource();
			if (oSmarTable.getTable() instanceof sap.ui.table.Table) {
				oController.optimizeSmartTable(oSmarTable);
			}
			// calc table changes
			var columnListItems = oSmarTable.getTable().getItems()
			columnListItems.forEach(item => {
				if (item.data("classCondition") === 'InactiveList') {
					item.addStyleClass("InactiveRow");
				} else {
					item.removeStyleClass("InactiveRow");
				}
			});
			// calc table changes
		},
		groupHeaderFormatter: function (value) {
			var oController = this;
			var analytical = AnalyticalBindingInfo;
			// return  vui.workspace.controller.AnnotationHelper.getChangeDateFormat(
			// 	oEvent,
			// );
			return value;

		}
		// #188496 - Conditions are not diplayed - end

	});

});
//# sourceURL=https://usegsaplds4d.vistex.com/sap/bc/ui5_ui5/vui/bwsm/controller/BaseController.js?eval