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
	"zvui/work/control/AggregationPanel",
	"sap/ui/model/analytics/AnalyticalBinding"
], function (Controller, ResponsiveTable, JSONModel, MessageBox, XMLTemplateProcessor, XMLPreprocessor, Element, MessageToast, SmartField, ODataType, MetadataAnalyser, FormatUtil, Component, SmartDecimalField, AggregationPanel, AnalyticalBindingInfo) {
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
			//			var route = oViewModel.getProperty("/cuttentRoute");
			//			var currentView = oContext.getPath().split("(")[0].replace(/x/g,"/");
			//			currentView = currentView.substr(1,currentView.length-1);
			//			var currentViewDetails = _.find(NavigationTreeData,{cdsvw : currentView});
			//			var viewPosition;
			//			if(currentViewDetails)
			//			viewPosition = parseInt(currentViewDetails.contr) - 1;
			// for parameters of function imports special paths are introduced in the model, that are not known in the metamodel
			// as we don't need a merge call for changes to these properties, we can just ignore them

			oController.removeMessages(oController);

			if (oEvent.getParameter("path") == "thldp")
				return;

			var onSkipFiledChange = oViewModel.getProperty("/skipFiledChange");
			if (!onSkipFiledChange) {
				if (!oMetaModel.getODataEntitySet(oContext.getPath().split("(")[0].substring(1))) {
					return;
				}

				oController.removeTransientMessages();
				//				sap.ui.core.BusyIndicator.show(0);

				if (oEvent.getParameter("path")) {
					entityName = oEvent.getParameter("context").getPath().split("(")[0].split("/")[1];
					changedPath = oEvent.getParameter("context").getPath();
					if (entityName) {
						var entitySet = oMetaModel.getODataEntitySet(entityName);
						var entityType = oMetaModel.getODataEntityType(entitySet.entityType);
						var property = oMetaModel.getODataProperty(entityType, oEvent.getParameter("path"));
						var isKey = entityType.key.propertyRef.find(function (key) { return key.name == property.name });
						var value = oEvent.getParameter("value");
						var linItemProperty;
						if (property && (property["com.sap.vocabularies.Common.v1.ValueList"]
							//						||	property["com.sap.vocabularies.Common.v1.ValueListWithFixedValues"]
							//						&& property["sap:value-list"] !==  "fixed-values" 
							&& oEvent.getParameter("value")
						)) {
							oViewModel.setProperty("/modelChanged", true);
							return;
						}
					}
				}

				oViewModel.setProperty("/modelChanged", true);
				if (oViewModel.getProperty("/cuttentRoute") == 'Detail') {
					oController.noBackPlease(); //for preventing the browser back
				}
				oModel.submitChanges({
					batchGroupId: "changes",
					success: function (oData, response) {
						//						sap.ui.core.BusyIndicator.hide();
						oController.optimizedUpdateCalls(entityName, changedPath);
						//						oModel.refresh();
					},
					error: function (data, response) {
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
			//			sap.ui.core.BusyIndicator.show(0);

			var oViewModel = oController.getView().getModel("viewModel");
			oViewModel.setProperty("/modelChanged", true);

			oModel.submitChanges({
				batchGroupId: "changes",
				success: function (data, resonse) {
					//					sap.ui.core.BusyIndicator.hide();
					oModel.refresh();
				},
				error: function (data, response) {
					sap.ui.core.BusyIndicator.hide();
				}
			});
		},

		showMessagePopover: function (buttonId) {
			var oController = this;
			var messageModel = oController.getOwnerComponent().getModel("message");
			var messageData = messageModel.getData();
			var messageCount = messageData.length;
			if (messageCount == 1 && messageData[0].type == "Success") {
				var myMessage = messageData[0].message;
				MessageToast.show(myMessage, { duration: 5000, width: "30em" });
				oController.removeMessages(oController);
			} else {
				var button = oController.getView().byId(buttonId);
				oController._getMessagePopover().openBy(button);
			}
		},

		onMessagePopover: function (oEvent) {
			this._getMessagePopover().toggle(oEvent.getSource());
		},

		//################ Private APIs ###################

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
			// Such a hook can be used by the application to determine if a control can be found/reached on the page and navigated to.
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

			//			sap.ui.core.BusyIndicator.show(0);

			oModel.callFunction("/" + functionImport.name, {
				method: "POST",
				batchGroupId: "changes",
				urlParameters: urlParameters
			});
			oModel.submitChanges({
				batchGroupId: "changes",
				success: function (oData, response) {

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
			// in future we want to return only the transient messages that are returned by the given response
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
			var count = oSmartTable._getRowCount();
			var text = oSmartTable.getHeader();
			//			var oBindingInfo = oController.getTableBindingInfo(oSmartTable.getTable());
			//			if(oBindingInfo.binding && oBindingInfo.binding.getLength)
			//			count = oBindingInfo.binding.getLength();			

			if (oSmartTable._getTablePersonalisationData && oSmartTable._getTablePersonalisationData().sorters) {
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
			var title = oSubSection.data("Label");
			if (oSmartTable.getTable() instanceof sap.ui.table.TreeTable) {
				if (count > 0 && oEvent.getParameter("mParameters") && oEvent.getParameter("mParameters").data) {
					if (oEvent.getParameter("mParameters").data.__count == count) {
						oSmartTable.setHeader(title + " (" + count + ")");
					}
				} else {
					oSmartTable.setHeader(title);
				}
			} else {
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
				if ((section.getParent().getSections()[0] === section || typeChanged) && oSmartTable._getRowCount() > 0) {
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
								if (viewModel.getProperty("/cuttentRoute") == 'Detail') {
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
			if (oSmartTable._getRowCount() <= 0)
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
						oTable.autoResizeColumn(i);
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
			var oModel = this.getView().getModel();
			var oMetaModel = oModel.getMetaModel();

			this.changeSmartTableColumnVisibility(oSmartTable, oMetaModel, oUIState, oController.columnPosition);

			oSmartTable.getTable().expand = function (oEvent) {
				sap.ui.table.AnalyticalTable.prototype.expand.apply(oSmartTable.getTable(), arguments);
			};

			// oSmartTable.getTable().attachGroup(function (oEvent) {
			// 	oController.onGrouping(oEvent);
			// 	// debugger;
			// });


			var toolbarElements = oSmartTable.getToolbar().getContent();
			var searchString = null;
			oSmartTable._oTablePersonalisationButton.attachPress(function (oEvent) {
				var personalisationDialog = oSmartTable._oPersController._oDialog;
				personalisationDialog.attachBeforeOpen(oController.perDialogBeforeOpen, oController);

			});
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
			if (oController.isControlOfType(oSmartTable.getTable(), "sap/ui/table/TreeTable")) {
				var oBindingParams = oEvent.getParameter("bindingParams");

				//	           oBindingParams.parameters.threshold = 50000;
				oBindingParams.parameters.countMode = 'Inline';
				oBindingParams.parameters.operationMode = 'Server';
				//		         oBindingParams.parameters.numberOfExpandedLevels = 0;
				//		         oBindingParams.parameters.treeAnnotationProperties = {};
				//		         oBindingParams.parameters.treeAnnotationProperties.hierarchyLevelFor = "_level";
				//		         oBindingParams.parameters.treeAnnotationProperties.hierarchyParentNodeFor = "rowid_h";
				//		         oBindingParams.parameters.treeAnnotationProperties.hierarchyNodeFor = "row_id";
				//		         oBindingParams.parameters.treeAnnotationProperties.hierarchyDrillStateFor = "drilldown_state";
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
		groupHeaderFormatter: function (value) {
			var oController = this;
			var analytical = AnalyticalBindingInfo;
			// return  vui.workspace.controller.AnnotationHelper.getChangeDateFormat(
			// 	oEvent,
			// );
			return value;

		},
		HeaderFormatterForTable: function (oEvent) {
			var oController = this;
			var viewModel = oController.getOwnerComponent().getModel("viewModel");
			return oEvent + "-100";
		},

		perDialogBeforeOpen: function (oEvent) {
			var oController = this;
			var personalisationDialog = oEvent.getSource();
			var aggrPanel = new AggregationPanel();
			aggrPanel.getPanelContent();
			if (!personalisationDialog.data("aggrPanelAdded")) {
				personalisationDialog.addPanel(aggrPanel);
				personalisationDialog.data("aggrPanelAdded", true);
			}
		},

		onSectionChange: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var section = oEvent.getParameter("section");
			var subSections = section.getSubSections();
			//			var dynamicSideContent = subSections[0].getBlocks()[0].getContent()[0];
			//			oController.onClosingDscSideContent(dynamicSideContent);

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
					// on list, support only one entityset mapped to the root component
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
			var uiTabel = this.isControlOfType(oControl, "sap/ui/table/Table");
			if (!uiTabel)
				uiTabel = this.isControlOfType(oControl, "sap/ui/table/AnalyticalTable");
			return uiTabel;
		},

		isMTable: function (oControl) {
			return this.isControlOfType(oControl, "sap/m/Table");
		},

		getTableBindingInfo: function (oTable) {
			if (this.isSmartTable(oTable)) {
				oTable = oTable.getTable(); // get SmartTable's inner table first
			}

			if (this.isUiTable(oTable)) {
				return oTable.getBindingInfo("rows");
			} else if (oTable instanceof ResponsiveTable) {
				return oTable.getBindingInfo("items");
			}

			return null;
		},

		refreshSmartTable: function (oSmartTable, bindingRefresh) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var viewModel = this.getOwnerComponent().getModel("viewModel");
			var oBindingInfo = this.getTableBindingInfo(oSmartTable);
			if (!bindingRefresh && oSmartTable && oSmartTable.rebindTable) {
				//				if(oSmartTable.getTable() instanceof sap.ui.table.AnalyticalTable){
				//					var mParameters = oController.readQueryPrepare(oSmartTable.getEntitySet());					
				//					mParameters["$skip"] = 0;
				//					mParameters["$top"] = oSmartTable.getTable().getVisibleRowCount();
				//					oModel.read("/X01", {
				//						urlParameters: mParameters
				//					});
				//				}else{
				oSmartTable.rebindTable();
				//				}
				// var mParameters = oController.readQueryPrepare(oSmartTable.getEntitySet());
				// mParameters["$skip"] = 0;
				// mParameters["$top"] = 25;
				// var sPath = "/WorkspaceView(row_id='0000000001',smrid='',wstyp='WSTZNW',wspvw='DIST04')/to_X01";
				// oSmartTable.bindElement({
				// 	path: sPath,
				// 	parameters: {
				// 		"custom": mParameters
				// 	}
				// });
				// oSmartTable.bindElement("/WorkspaceView(row_id='0000000001',smrid='',wstyp='WSTZNW',wspvw='DIST04')/to_X01");
				// oController.readPath(oSmartTable.getEntitySet(), "/WorkspaceView(row_id='0000000001',smrid='',wstyp='WSTZNW',wspvw='DIST04')/to_X01");
			} else if (oBindingInfo && oBindingInfo.binding) {
				oBindingInfo.binding.refresh();
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
								//									sap.ui.core.BusyIndicator.show(0);
								oRouter.navTo("Worklist");
								location.reload();
								sap.ui.core.BusyIndicator.hide();
							}
							else {
								var data = {};
								//									$.ajax({url: wrkspglobal.server.url.baseURL}).done(function(data){
								//									wrkspglobal.session.scounter = wrkspglobal.session.ccounter = wrkspglobal.session.maxTime;
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
				if (!wrkspglobal.session.counterPause) {
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
						//						wrkspglobal.session.scounter = wrkspglobal.session.ccounter = wrkspglobal.session.maxTime;
						//						});
					}
					wrkspglobal.session.ccounter -= 1;
					wrkspglobal.session.scounter -= 1;
				} else {
					clearInterval(sessionTime);
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
			var viewModel = oController.getView().getModel("viewModel");
			var NavigationTreeData = viewModel.getProperty("/NavigationTreeData");
			var entitySet = oEvent.getSource().data("entitySet");
			var selectedPaths = viewModel.getProperty("/selectedPaths");
			var node = selectedPaths, path, route, level;
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
			if (route) {
				var currentLevel = viewModel.getProperty("/currentDetailPageLevel")
				level = level - currentLevel - 1;
				history.go(level)
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

		openDSCToolbarAction: function (oSmartTable, selectAll, selectedRows, rowSelected, newSelectedPath) {
			var oController = this;
			var viewModel = this.getView().getModel("viewModel");
			var uiModel = oController.getView().getModel("ui");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var oTable = oSmartTable.getTable();
			var sEntitySet = oSmartTable.getEntitySet();
			var entity = oModel.getMetaModel().getODataEntityType(oModel.getMetaModel().getODataEntitySet(sEntitySet).entityType);
			var showingSideContent = viewModel.getProperty("/" + sEntitySet + "showingSideContent");
			//			var dynamicSideContent = oController.getDynamicSideContent(oTable);
			var dynamicSideContent = oController.getResponsiveSplitter(oTable);
			var editingStatusDSC;
			var errorMessages = oController.checkErrorMessageExist(oModel);
			if (!errorMessages) {
				oController.removeMessages(oController);
			}

			if (!showingSideContent) {
				var currentRoute = viewModel.getProperty("/cuttentRoute");
				if (currentRoute == "Detail") {
					viewModel.setProperty("/DetailshowHideDsc", true);
				} else if (currentRoute == "DetailDetail") {
					viewModel.setProperty("/DetailDetailshowHideDsc", true);
				}
				if (viewModel.getProperty("/layout") == "TwoColumnsMidExpanded") {
					//					oController.onCollapse();
					uiModel.setProperty("/showExpand", true);                //changes for -- while opening DSC mid column should be in expanded mode
					viewModel.setProperty("/layout", "MidColumnFullScreen"); //changes for -- while opening DSC mid column should be in expanded mode
					this._updateUIElements();								 //changes for -- while opening DSC mid column should be in expanded mode
				}
				dynamicSideContent.setShowSideContent(true);
				viewModel.setProperty("/" + sEntitySet + "showingSideContent", true);
				viewModel.setProperty("/" + sEntitySet + "showSideContent", true);
				jQuery.sap.delayedCall(100, null, function () {
					oTable.rerender();
				});
			}
			if (selectedRows.length > 1) {
				var urlParameters = {}, rowIDs = [], edtstSpaceRowid = [], lockParameters = {}, showDscCorrectionLines = false;
				urlParameters = oController.readQueryPrepare(sEntitySet);
				_.each(selectedRows, function (context) {
					if (context && context.getPath) {
						var oContextData = oModel.getProperty(context.getPath());
						var rowId = oContextData.row_id;
						rowIDs.push(rowId);
						var correction_row_id;
						if (oController.correction_row_id && oController.correction_row_id[sEntitySet] &&
							oController.correction_row_id[sEntitySet][rowId]) {
							correction_row_id = oController.correction_row_id[sEntitySet][rowId];
						}
						var edtst = oContextData.edtst;
						if (edtst == undefined || edtst == "" || correction_row_id) {
							edtstSpaceRowid.push(rowId);
						}
						if (oContextData && oContextData.pstat == "4" && !oContextData.itcrd) {
							showDscCorrectionLines = true;
						}
					}
				});
				if (showDscCorrectionLines && !viewModel.getProperty("/addCorrectionLines" + sEntitySet)) {
					viewModel.setProperty("/" + sEntitySet + "showDscCorrectionLines", true);
					//					viewModel.setProperty("/addCorrectionLines" + sEntitySet, true);
				} else {
					viewModel.setProperty("/" + sEntitySet + "showDscCorrectionLines", false);
					//					viewModel.setProperty("/addCorrectionLines" + sEntitySet, false);
				}
				if (selectAll) {
					urlParameters["_selal"] = 'X';
					lockParameters["_selal"] = 'X';
				} else {
					urlParameters["_row_id"] = rowIDs.toString();
					lockParameters["_row_id"] = rowIDs.toString();
					var unselected_row_ids = [];
					if (rowIDs.length !== selectedRows.length && oController.rowSelectionData[sEntitySet]) {
						for (var i = 0; i < oController.rowSelectionData[sEntitySet].length; i++) {
							var oContextData = oModel.getProperty(oController.rowSelectionData[sEntitySet][i]);
							if (oContextData) {
								var found = rowIDs.find(function (obj) { return obj == oContextData.row_id });
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
				//				sap.ui.core.BusyIndicator.show(0);
				if (!viewModel.getProperty("/skipLockFunction")) {
					if (!viewModel.getProperty("/addCorrectionLines" + sEntitySet)) {
						oModel.callFunction("/" + sEntitySet + "_LOCK", {
							method: "POST",
							batchGroupId: "changes",
							urlParameters: lockParameters
						});
					}
				} else {
					viewModel.setProperty("/skipLockFunction", false);
				}
				lockParameters["_row_id"] = rowIDs.toString();
				delete lockParameters["unselected"];
				oModel.submitChanges({
					batchGroupId: "changes",
					success: function (d, res) {
						//						sap.ui.core.BusyIndicator.hide();
						if (viewModel.getProperty("/disp_only")) {
							editingStatusDSC = "";
							oController.prepareDynamicSideMultiEditContent(dynamicSideContent, entity, selectedRows, sEntitySet, lockParameters, editingStatusDSC);
						} else if (!selectAll && edtstSpaceRowid && edtstSpaceRowid.length > 0) {
							//							var params = [];
							var correction_rowid = [];
							if (oController.correction_row_id && oController.correction_row_id[sEntitySet][edtstSpaceRowid[0]]) {
								for (var i = 0; i < edtstSpaceRowid.length; i++) {
									correction_rowid.push(oController.correction_row_id[sEntitySet][edtstSpaceRowid[i]]);
								}
								urlParameters["row_id"] = correction_rowid.toString();
								urlParameters["_row_id"] = correction_rowid.toString();
							} else {
								urlParameters["row_id"] = edtstSpaceRowid.toString();
							}
							oModel.read("/" + sEntitySet, {
								urlParameters: urlParameters,
								_refresh: true,
								success: function (oData, response) {
									//									sap.ui.core.BusyIndicator.hide();
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
									oController.prepareDynamicSideMultiEditContent(dynamicSideContent, entity, selectedRows, sEntitySet, lockParameters, editingStatusDSC);
								}
							});
						} else {
							if (selectAll) {
								if (d.__batchResponses && d.__batchResponses[0] && d.__batchResponses[0].__changeResponses && d.__batchResponses[0].__changeResponses[0].data &&
									d.__batchResponses[0].__changeResponses[0].data.edtst) {
									editingStatusDSC = d.__batchResponses[0].__changeResponses[0].data.edtst;
								} else {
									editingStatusDSC = "";
								}
								if (edtstSpaceRowid && edtstSpaceRowid.length > 0) {
									if (oTable.getBinding) {
										var lastEndIndex = oTable.getBinding().iLastEndIndex;
										var startIndex = oTable.getBinding().iStartIndex;
										if (startIndex > lastEndIndex) {
											urlParameters["$top"] = startIndex;
										} else {
											urlParameters["$top"] = lastEndIndex;
										}
										urlParameters["$skip"] = oTable.getBinding().iLastStartIndex;
										urlParameters["$top"] = urlParameters["$top"] - urlParameters["$skip"];
									}
									delete urlParameters["row_id"];
									oModel.read("/" + sEntitySet, {
										urlParameters: urlParameters,
										_refresh: true,
										success: function (oData, response) {
											oController.prepareDynamicSideMultiEditContent(dynamicSideContent, entity, selectedRows, sEntitySet, lockParameters, editingStatusDSC);
										}
									});
								} else {
									oController.prepareDynamicSideMultiEditContent(dynamicSideContent, entity, selectedRows, sEntitySet, lockParameters, editingStatusDSC);
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
								oController.prepareDynamicSideMultiEditContent(dynamicSideContent, entity, selectedRows, sEntitySet, lockParameters, editingStatusDSC);
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
			var oTable = oEvent.getSource().getParent().getTable();
			var sEntitySet = oTable.getParent().getEntitySet();
			var showingSideContent = viewModel.getProperty("/" + sEntitySet + "showingSideContent");
			var rowSelected = true, editingStatusDSC, newSelectedPath, selectAll;
			var listEntitySet = oModel.getMetaModel().getODataEntitySet(sEntitySet);
			var entity = oModel.getMetaModel().getODataEntityType(oModel.getMetaModel().getODataEntitySet(sEntitySet).entityType);
			var selectedRows = [], selectedRow = {};
			//			if(showingSideContent){			
			//			if(listEntitySet['Org.OData.Capabilities.V1.UpdateRestrictions'] &&
			//			listEntitySet['Org.OData.Capabilities.V1.UpdateRestrictions'].Updatable.Bool == "false"	){
			//			return;
			//			}
			if (oEvent.getParameter("rowContext") && oEvent.getParameter("rowContext").getPath
				&& oEvent.getParameter("rowContext").getPath() && oModel.getProperty(oEvent.getParameter("rowContext").getPath()) &&
				oModel.getProperty(oEvent.getParameter("rowContext").getPath()).row_id[0] == "C") {
				var oBundle = oController.getView().getModel("i18n").getResourceBundle();
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
			if (oEvent.getParameter("rowIndex") == -1 && !oEvent.getParameter("selectAll")) {
				delete oController.rowSelectionData[sEntitySet];
			} else if (oEvent.getParameter("selectAll")) {
				oController.rowSelectionData[sEntitySet] = [];
			} else if (oController.rowSelectionData[sEntitySet]) {
				if (oEvent.getParameter("rowContext")) {
					oController.rowSelectionData[sEntitySet].push(oEvent.getParameter("rowContext").getPath());
				}
			}

			if (oTable.getSelectedIndices) {
				var rowindex = oEvent.getParameter("rowIndex");
				var selectedIndices = oTable.getSelectedIndices();
				_.each(selectedIndices, function (index) {
					selectedRows.push(oTable.getContextByIndex(index));
				});
				if (rowindex || rowindex == 0) {
					var index = selectedIndices.find(function (index) { return index == rowindex })
					if (index != undefined) {
						newSelectedPath = oTable.getContextByIndex(rowindex).getPath();
						//						selectedRow = oTable.getContextByIndex(rowindex);
					} else {
						rowSelected = false;
					}
				}
			} else {
				var selectedItems = oTable.getSelectedItems();
				_.each(selectedItems, function (item) {
					selectedRows.push(item.getBindingContext());
				});
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
				segmentedButton = oController.getView().byId(DSCId + "::SegButton");
			}
			//			itemTabBar.getItems()[2].setVisible(false);
			if (segmentedButton.getItems()[2]) {
				segmentedButton.getItems()[2].setVisible(false);
			}
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

					if (mainTable.getSelectedContexts) {
						var selectedContexts = mainTable.getSelectedContexts();
						if (mainTable.getVisibleItems().length == mainTable.getSelectedItems().length) {
							selectAll = true;
						}
					} else {
						if (oEvent.getParameter("selectAll")) {
							selectAll = true;
						}
					}
				}
			}
			if (!oEvent.getParameter("selectAll") && selectedRows.length > 1) {
				var postedLinesWithCorrections = 0, postedLinesWithoutCorrections = 0, notPostedLines = 0;
				_.each(selectedRows, function (context) {
					if (context && context.getPath) {
						var oContextData = oModel.getProperty(context.getPath());
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
				});
				if ((postedLinesWithCorrections && postedLinesWithoutCorrections) ||
					(notPostedLines && postedLinesWithoutCorrections)) {
					if (oTable.clearSelection) {
						oTable.clearSelection();
						oTable.setSelectedIndex(oEvent.getParameter("rowIndex"));
					} else {
						oTable.removeSelections();
					}
					return;
				}
			}
			if (selectedRows.length > 0) {
				oController.openDSCToolbarAction(oTable.getParent(), selectAll, selectedRows);
			} else {
				oController.onCloseTableDSC(oEvent);
			}

			//			if(selectedRows.length > 1){
			//			var urlParameters = {},selectAll, rowIDs=[];

			//			if(dynamicSideContent.getMainContent){
			//			if(dynamicSideContent.getMainContent()[1]){
			//			var mainTable = dynamicSideContent.getMainContent()[1].getTable();
			//			}else{
			//			var mainTable = dynamicSideContent.getMainContent()[0].getTable();
			//			}

			//			if(mainTable.getSelectedContexts){
			//			var selectedContexts = mainTable.getSelectedContexts();
			//			if(mainTable.getVisibleItems().length == mainTable.getSelectedItems().length){
			//			selectAll = true;
			//			}
			//			}else{
			//			if(mainTable.getParent()._getRowCount() == mainTable.getSelectedIndices().length){
			//			selectAll = true;
			//			}
			//			}
			//			}

			//			if(selectAll){
			//			urlParameters["_selal"] = 'X';
			//			}else{
			//			_.each(selectedRows,function(context){
			//			if(context && context.getPath){
			//			var rowId = oModel.getProperty(context.getPath()).row_id;						
			//			rowIDs.push(rowId);
			//			}
			//			});
			//			urlParameters["_row_id"] = rowIDs.toString();
			//			}
			//			urlParameters["_dscen"] = true;
			//			sap.ui.core.BusyIndicator.show(0);
			////			if(!viewModel.getProperty("/disp_only")){
			//			oModel.callFunction("/" + sEntitySet + "_LOCK", {
			//			method: "POST",
			//			batchGroupId: "changes",
			//			urlParameters: urlParameters
			//			});
			////			}

			//			oModel.submitChanges({
			//			batchGroupId: "changes",
			//			success : function(d,res){
			//			sap.ui.core.BusyIndicator.hide();
			//			if(viewModel.getProperty("/disp_only")){
			//			editingStatusDSC = "0";
			//			oController.prepareDynamicSideMultiEditContent(dynamicSideContent, entity, selectedRows, sEntitySet, urlParameters,editingStatusDSC);
			//			}else if(!selectAll && rowSelected){
			//			oModel.read(newSelectedPath,{
			//			_refresh: true,
			//			success : function(oData,response) {
			//			sap.ui.core.BusyIndicator.hide();
			////			oModel.setProperty(newSelectedPath + "/edtst",oData.edtst);
			//			editingStatusDSC = viewModel.getProperty("/editingStatusDSC");
			//			if(editingStatusDSC == "1"){
			//			viewModel.getProperty("/editingStatusDSC",editingStatusDSC);
			//			}else{
			//			viewModel.getProperty("/editingStatusDSC",oData.edtst);
			//			}
			//			oController.prepareDynamicSideMultiEditContent(dynamicSideContent, entity, selectedRows, sEntitySet, urlParameters,editingStatusDSC);
			//			}
			//			});
			//			}else{
			//			if(selectAll){
			//			editingStatusDSC = d.__batchResponses[0].__changeResponses[0].data.edtst;
			//			}else{
			//			editingStatusDSC = "";
			//			_.each(selectedRows,function(context){
			//			if(context && context.getPath){
			//			var edtst = oModel.getProperty(context.getPath()).edtst;
			//			if(edtst == "1"){
			//			editingStatusDSC = edtst;
			//			}
			//			}
			//			});	
			//			}
			//			oController.prepareDynamicSideMultiEditContent(dynamicSideContent, entity, selectedRows, sEntitySet, urlParameters, editingStatusDSC);
			//			}
			//			},
			//			error : function(oData,response){
			//			setTimeout(function(){
			//			sap.ui.core.BusyIndicator.hide();
			//			oController.showMessagePopover(oController.messageButtonId);
			//			}, 1000);
			//			}
			//			});
			//			}else if(selectedRows.length == 1){
			//			viewModel.setProperty("/" + sEntitySet + "showDscApply",false);
			//			var selectedPath = selectedRows[0].getPath();
			////			if(oTable.getSelectedIndices){
			////			selectedPath = oEvent.getParameter('rowContext').getPath();
			////			}else{
			////			selectedPath = oEvent.getParameter("listItem").getBindingContextPath()
			////			}
			//			oController.prepareSideContentData(entity, selectedPath, dynamicSideContent, sEntitySet, oTable.getParent());
			//			}else{
			//			oController.onCloseTableDSC(oEvent);
			//			}

			//			}else if(!oController.fromShowTableDSC){
			//			var urlParameters = {},selectAll, rowIDs=[], selectedPath;
			//			if(oTable.getSelectedIndices){
			//			if(oTable.getParent()._getRowCount() == oTable.getSelectedIndices().length &&
			//			oTable.getParent()._getRowCount() >= oTable.getVisibleRowCount()){
			//			selectAll = true;
			//			}else{
			//			var rowindex = oEvent.getParameter("rowIndex");				
			//			var selectedIndices = oTable.getSelectedIndices();
			//			_.each(selectedIndices,function(index){
			//			selectedRows.push(oTable.getContextByIndex(index));
			//			});
			//			if(rowindex || rowindex == 0){
			//			var index = selectedIndices.find(function(index){return index == rowindex})
			//			if(index != undefined){
			//			selectedPath = oTable.getContextByIndex(rowindex).getPath();
			//			}
			//			}
			//			}
			//			}else{
			//			if(oTable.getVisibleItems().length == oTable.getSelectedItems().length &&
			//			oTable.getVisibleItems().length >= oTable.getGrowingThreshold()){
			//			selectAll = true;
			//			}else if(oEvent.getParameter("listItem") && oEvent.getParameter("selected")){
			//			selectedPath = oEvent.getParameter("listItem").getBindingContext().getPath();
			//			}
			//			}

			//			if(selectedPath){
			//			var edtst = oModel.getProperty(selectedPath).edtst;
			//			if(edtst != undefined && edtst == ""){
			//			urlParameters["_row_id"] = oModel.getProperty(selectedPath).row_id;
			//			urlParameters["_dscen"] = true;
			//			oModel.callFunction("/" + sEntitySet + "_LOCK", {
			//			method: "POST",
			//			batchGroupId: "changes",
			//			urlParameters: urlParameters,
			//			success : function(oData,response){
			//			},
			//			error : function(oData,response){
			//			setTimeout(function(){
			//			oController.showMessagePopover(oController.messageButtonId);
			//			}, 1000);
			//			}
			//			});		
			//			oModel.submitChanges({
			//			batchGroupId: "changes",
			//			success : function(oData,response){
			//			oModel.read(selectedPath,{
			//			_refresh: true,
			//			});
			//			}
			//			});
			//			}
			//			}else if(selectAll){
			//			urlParameters["_selal"] = true;
			//			urlParameters["_dscen"] = true;
			//			oModel.callFunction("/" + sEntitySet + "_LOCK", {
			//			method: "POST",
			//			batchGroupId: "changes",
			//			urlParameters: urlParameters
			//			});	
			//			oModel.submitChanges({
			//			batchGroupId: "changes",
			//			success : function(oData,response){
			//			oModel.read("/" + sEntitySet,{
			//			urlParameters: urlParameters,
			//			_refresh: true
			//			});
			//			}
			//			});
			//			}
			//			}
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

		prepareDynamicSideMultiEditContent: function (dynamicSideContent, entity, selectedRows, sEntitySet, urlParameters, editingStatusDSC) {
			var oController = this;
			var tableData = [];
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = this.getView().getModel("viewModel");
			var selectedPath, selectedRowData, rowIDs = [], oTargetEntity, selectAll, selectedItemsLength;
			//			var DSCId = dynamicSideContent.getId();
			var DSCId = dynamicSideContent.content.getId();

			if (dynamicSideContent.getMainContent) {
				if (dynamicSideContent.getMainContent()[1]) {
					var mainTable = dynamicSideContent.getMainContent()[1].getTable();
				} else {
					var mainTable = dynamicSideContent.getMainContent()[0].getTable();
				}

				if (mainTable.getSelectedContexts) {
					var selectedContexts = mainTable.getSelectedContexts();
					//					if(mainTable.getVisibleItems().length == mainTable.getSelectedItems().length){
					//						selectAll = true;
					//					}
					if (urlParameters["_selal"]) {
						selectedItemsLength = mainTable.getVisibleItems().length;
						selectAll = true;
					} else {
						selectedItemsLength = mainTable.getSelectedItems().length;
					}
				} else {
					//					if(mainTable.getParent()._getRowCount() == mainTable.getSelectedIndices().length){
					//						selectAll = true;
					//					}
					if (urlParameters["_selal"]) {
						selectedItemsLength = mainTable.getParent()._getRowCount();
						selectAll = true;
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
				segmentedButton = sap.ui.getCore().byId(DSCId + "::SegButton");
			} else {
				segmentedButton = oController.getView().byId(DSCId + "::SegButton");
			}
			//			var sideContentTable = dynamicSideContent.getSideContent()[1].getItems()[0].getContent()[0];
			var sideContentTable = oController.getView().byId(DSCId + "::Table");
			if (!sideContentTable) {
				var sideContentTable = sap.ui.getCore().byId(DSCId + "::Table");
			}
			var infoText = selectedItemsLength + " rows Selected";
			if (dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[1] &&
				dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[1].getItems &&
				dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[0].getItems()[0] &&
				dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[0].getItems()[0].setText) {
				dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[0].getItems()[0].setText(infoText);
			}
			if (dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[1]) {
				if (dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[1].getItems &&
					dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[1].getItems()[0] &&
					dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[1].getItems()[0].setText) {
					dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[1].getItems()[0].setText(infoText);
				}
				dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[1].setVisible(true);
			}
			if (dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[2]) {
				dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[2].setVisible(true);
			}
			if (dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[3]) {
				dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[3].setVisible(true);
			}
			if (dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[0].setText) {
				dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[0].setText(infoText);
			}
			if (dynamicSideContent.getSideContent()[0].getItems()[2].getContent()[0].getItems()[0].getContent()[0].getHeaderToolbar &&
				dynamicSideContent.getSideContent()[0].getItems()[2].getContent()[0].getItems()[0].getContent()[0].getHeaderToolbar()) {
				dynamicSideContent.getSideContent()[0].getItems()[2].getContent()[0].getItems()[0].getContent()[0].getHeaderToolbar().getContent()[0].getItems()[0].setText(infoText);
				dynamicSideContent.getSideContent()[0].getItems()[2].getContent()[0].getItems()[0].getContent()[0].getHeaderToolbar().removeStyleClass("sapMTB-Transparent-CTX");
			}
			viewModel.setProperty("/" + sEntitySet + "showDscApply", true);
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

			if (viewModel.getProperty("/addCorrectionLines" + sEntitySet)) {
				disableDetails = false;
				oController.allRowsLocked = false;
			}

			if (!allRowsLocked || viewModel.getProperty("/addCorrectionLines" + sEntitySet)) {
				if (sideContentTable.getHeaderToolbar()) {
					sideContentTable.getHeaderToolbar().removeStyleClass("vistex-display-none");
				}
				if (dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[1]) {
					dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[1].setVisible(true);
				}
				if (dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[2]) {
					dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[2].setVisible(true);
				}
				if (dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[3]) {
					dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[3].setVisible(true);
				}
			} else {
				if (sideContentTable.getHeaderToolbar()) {
					sideContentTable.getHeaderToolbar().addStyleClass("vistex-display-none");
				}
				if (dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[1]) {
					dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[1].setVisible(false);
				}
				if (dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[2]) {
					dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[2].setVisible(false);
				}
				if (dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[3]) {
					dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[3].setVisible(false);
				}
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
					if (segmentedButton.getItems()[2].getKey() == 'notes') {
						segmentedButton.getItems()[2].setVisible(true);
					} else {
						segmentedButton.getItems()[2].setVisible(false);
					}
				}
				if (segmentedButton.getItems()[3]) {
					if (segmentedButton.getItems()[3].getKey() == 'notes') {
						segmentedButton.getItems()[3].setVisible(true);
					} else {
						segmentedButton.getItems()[3].setVisible(false);
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
			//			var valueHelpData = [];
			//			var valueHelpFields = _.filter(entity.property,function(property){ return property["sap:value-list"] == "fixed-values"});
			//			_.each(valueHelpFields,function(valueHelpField){
			//			var textField = valueHelpField["com.sap.vocabularies.Common.v1.Text"].Path.split("/")[1];
			//			var keyField = _.find(valueHelpField["com.sap.vocabularies.Common.v1.ValueList"].Parameters,function(parameter){
			//			if(parameter["LocalDataProperty"] && parameter["LocalDataProperty"].PropertyPath == valueHelpField.name){
			//			return parameter;
			//			}
			//			});
			//			keyField = keyField.ValueListProperty.String;
			////			valueHelpData.key = valueHelpField.name;
			//			oModel.read("/" + valueHelpField["com.sap.vocabularies.Common.v1.ValueList"].CollectionPath.String,{
			//			success: function(oData,response){
			//			var Data = [];
			//			_.each(oData.results,function(result){
			//			Data.push({"key": result[keyField], "value": result[textField]});
			//			});
			//			valueHelpData.push({"key": valueHelpField.name, "data": Data});
			//			}
			//			});
			//			});
			_.each(lineItems, function (item) {
				if (item.Value.Path !== "edtst") {
					var cellData = [], multiFieldData = [];
					var cellType = "standard", fieldEnabled = true, multiFieldEnabled = true;
					var cellProperties = _.find(entity["property"], { name: item.Value.Path });
					var nonResponsiveLineItem;
					if (lineItems) {
						nonResponsiveLineItem = lineItems.find(function (nrlitem) { return nrlitem.Value.Path == item.Value.Path });
					}
					if (!nonResponsiveLineItem || (nonResponsiveLineItem && !nonResponsiveLineItem["vui.bodc.MultiInput"])) {
						multiFieldData.push({ "Text": "< Keep Existing Values >", "Key": "< Keep Existing Values >", "field": "ExistingValues" });
						multiFieldData.push({ "Text": "< Leave Blank >", "Key": "< Leave Blank >", "field": "LeaveBlank" });
						cellData.push({ "Text": "< Keep Existing Values >", "Key": "< Keep Existing Values >", "field": "ExistingValues" });
						cellData.push({ "Text": "< Leave Blank >", "Key": "< Leave Blank >", "field": "LeaveBlank" });
						if (cellProperties.type == "Edm.DateTime") {
							cellData.push({ "Text": "< Select New Date >", "Key": "< Select New Date >", "field": "SelectNewDate" });
							cellType = "Date";
						}
						else if (cellProperties["sap:unit"]) {
							cellType = "multiField";
							var multiFieldProperties = _.find(entity["property"], { name: cellProperties["sap:unit"] });
							if (multiFieldProperties) {
								if ((multiFieldProperties['com.sap.vocabularies.UI.v1.ReadOnly'] && multiFieldProperties['com.sap.vocabularies.UI.v1.ReadOnly'].Bool == "true") ||
									(multiFieldProperties["com.sap.vocabularies.Common.v1.FieldControl"] && multiFieldProperties["com.sap.vocabularies.Common.v1.FieldControl"].EnumMember == "com.sap.vocabularies.Common.v1.FieldControlType/ReadOnly")) {
									multiFieldEnabled = false;
								}
							}
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

						_.each(selectedRows, function (selectedRow) {
							if (selectedRow) {
								selectedPath = selectedRow.getPath();
								selectedRowData = oModel.getProperty(selectedPath);
								if (oController.correction_row_id && oController.correction_row_id[sEntitySet] &&
									oController.correction_row_id[sEntitySet][selectedRowData.row_id]) {
									var correction_row_id = oController.correction_row_id[sEntitySet][selectedRowData.row_id];
									selectedPath = selectedPath.replace(selectedRowData.row_id, correction_row_id);
								}
								selectedRowData = oModel.getProperty(selectedPath);
								if (!selectedRowData) {
									selectedPath = selectedRow.getPath();
									selectedRowData = oModel.getProperty(selectedPath);
								}
								if (cellType == "multiField") {
									multiFieldData.push({
										"Text": selectedRowData[cellProperties["sap:unit"]],
										"Key": selectedRowData[cellProperties["sap:unit"]]
									});
								}
								if (cellType == "Date") {
									var date = new Date(selectedRowData[item.Value.Path]);
									var fieldValue = date.getDate() + "-" + (date.getMonth() + 1) + "-" + date.getFullYear();
									cellData.push({
										"Text": fieldValue,
										"Key": fieldValue,
										"field": item.Value.Path
									});
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
							//							var textField = cellProperties["com.sap.vocabularies.Common.v1.Text"].Path.split("/")[1];
							//							var keyField = _.find(cellProperties["com.sap.vocabularies.Common.v1.ValueList"].Parameters,function(parameter){
							//							if(parameter["LocalDataProperty"] && parameter["LocalDataProperty"].PropertyPath == item.Value.Path){
							//							return parameter;
							//							}
							//							});
							//							keyField = keyField.ValueListProperty.String;
							//							var contextPresent = false;
							//							_.each(oModel.mContexts,function(context){
							//							if(context.sPath.indexOf(cellProperties["com.sap.vocabularies.Common.v1.ValueList"].CollectionPath.String) > -1){
							//							contextPresent = true;
							//							var dropdownvalue = oModel.getProperty(context.sPath);
							//							cellData.push({"Text": dropdownvalue[textField],
							//							"Key": dropdownvalue[keyField],
							//							"field": item.Value.Path});
							//							}
							//							});
							//							var requiredData = _.find(valueHelpData,{key: item.Value.Path});
							//							if(requiredData){
							//							_.each(requiredData.data,function(result){
							//							cellData.push({"Text": result["value"],
							//							"Key": result["key"],
							//							"field": item.Value.Path});
							//							});
							//							}
						}
						cellData = getUnique(cellData);
						multiFieldData = getUnique(multiFieldData);
						if (cellProperties["com.sap.vocabularies.Common.v1.Label"] && cellProperties["com.sap.vocabularies.Common.v1.Label"].String) {
							tableData.push({
								"row1": cellProperties["com.sap.vocabularies.Common.v1.Label"].String,
								"row2": cellData,
								"type": cellType,
								"multiField": multiFieldData,
								"dataType": cellProperties.type,
								"field": item.Value.Path,
								"enable": fieldEnabled,
								"multiFieldEnabled": multiFieldEnabled,
								"unit": cellProperties['sap:unit']
							});
						}
					}
				}
			});
			sideContentTable.unbindElement();
			sideContentTable.removeAggregation("items");
			sideContentTable.destroyAggregation("items");
			sideContentTable.bindAggregation("items", "viewModel>/itemsData" + DSCId, function (sId, oContext) {
				var contextObject = oContext.getObject();
				var fcat_data = viewModel.getProperty("/columnData");
				var cells = [];
				_.each(fcat_data, function (obj) {
					if (obj.col != "row1") {
						if (contextObject.enable && !disableDetails) {
							if (contextObject.type == "standard") {
								var combobox = new sap.m.ComboBox({
									width: "150px",
									enabled: contextObject.enable
								}).bindValue("viewModel>" + obj["col"] + "/0/Key", null, sap.ui.model.BindingMode.TwoWay);
								combobox.bindAggregation("items", "viewModel>" + obj["col"], new sap.ui.core.Item({
									text: "{viewModel>Text}", key: "{viewModel>Key}"
								}));
								combobox.addCustomData(new sap.ui.core.CustomData({ "key": "dataType", "value": contextObject.dataType }));
								combobox.addCustomData(new sap.ui.core.CustomData({ "key": "field", "value": contextObject.field }));
								cells.push(combobox);
							} else if (contextObject.type == "ValueHelp") {
								var combobox = new sap.m.ComboBox({
									width: "150px",
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
									width: "150px",
									change: [oController.onValueValidation, oController],
									enabled: contextObject.enable
								}).bindValue("viewModel>" + obj["col"] + "/0/Key", null, sap.ui.model.BindingMode.TwoWay);
								//								combobox.bindAggregation("items", "viewModel>"+obj["col"],new sap.ui.core.Item({
								//								text: "{viewModel>Text}", key: "{viewModel>Key}"}));
								combobox.addCustomData(new sap.ui.core.CustomData({ "key": "dataType", "value": contextObject.dataType }));
								combobox.addCustomData(new sap.ui.core.CustomData({ "key": "field", "value": contextObject.field }));
								combobox.attachLoadItems(function () {
									oController.setDropdownItems(entity, this);
								});
								cells.push(combobox);
							} else if (contextObject.type == "Date") {
								var combobox = new sap.m.ComboBox({
									width: "150px",
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
									width: "90px",
									enabled: contextObject.enable
								}).bindValue("viewModel>" + obj["col"] + "/0/Key", null, sap.ui.model.BindingMode.TwoWay);
								combobox.bindAggregation("items", "viewModel>" + obj["col"], new sap.ui.core.Item({
									text: "{viewModel>Text}", key: "{viewModel>Key}"
								}));
								combobox.addCustomData(new sap.ui.core.CustomData({ "key": "dataType", "value": contextObject.dataType }));
								combobox.addCustomData(new sap.ui.core.CustomData({ "key": "field", "value": contextObject.field }));
								combobox.addCustomData(new sap.ui.core.CustomData({ "key": "multiField", "value": contextObject.unit }));
								if (!contextObject.multiFieldEnabled) {
									var combobox1 = new sap.m.Label().addStyleClass("sapUiTinyMargin");
									if (contextObject.multiField && contextObject.multiField.length == 3) {
										combobox1.setText(contextObject.multiField[2].Text);
									} else {
										combobox1.setText("(multiple)");
									}
								} else {
									var combobox1 = new sap.m.ComboBox({
										width: "80px",
										enabled: contextObject.multiFieldEnabled
									}).bindValue("viewModel>" + "multiField" + "/0/Key", null, sap.ui.model.BindingMode.TwoWay);;
									combobox1.bindAggregation("items", "viewModel>" + "multiField", new sap.ui.core.Item({
										text: "{viewModel>Text}", key: "{viewModel>Key}"
									}));
								}
								var hbox = new sap.m.HBox({
									items: [combobox, combobox1]
								}).addStyleClass("rightMargin");
								cells.push(hbox);
							} else {
								var combobox = new sap.m.ComboBox({
									width: "150px",
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
							var text;
							if (contextObject.row2 && contextObject.row2.length == 3) {
								if (contextObject.multiField && contextObject.multiField[2] && contextObject.multiField[2].Text) {
									text = new sap.m.Label({ text: contextObject.row2[2].Text + " " + contextObject.multiField[2].Text });
								} else {
									text = new sap.m.Label({ text: contextObject.row2[2].Text });
								}
							} else {
								text = new sap.m.Label({ text: "(multiple)" });
							}
							cells.push(text);
						}
					} else {
						var text = new sap.m.Label({ design: "Bold", wrapping: true }).bindProperty("text", "viewModel" + ">" + obj["col"], null, sap.ui.model.BindingMode.OneWay);
						cells.push(text);
					}
				});
				return new sap.m.ColumnListItem({
					cells: cells,
					type: "Active",
				}).addStyleClass("noPadding").data("selectedPath", selectedRows[0].getPath());
			});
			viewModel.setProperty("/itemsData" + DSCId, tableData);
			viewModel.setProperty("/bulkEditCode", {});
			viewModel.setProperty("/bulkEditCode/codesEntity", []);
			var codesEntity = [];
			if (entity.navigationProperty && entity.navigationProperty.length > 0) {
				for (var i = 0; i < entity.navigationProperty.length; i++) {
					oTargetEntity = oMetaModel.getODataEntityType(oMetaModel.getODataAssociationEnd(entity, entity.navigationProperty[i].name).type);
					if (oTargetEntity && oTargetEntity['vui.bodc.workspace.CodesEditable']) {
						if (segmentedButton.getItems()[1])
							segmentedButton.getItems()[1].setVisible(true);
						oController.sidePanelDSC.showCodes = true;
						oController.prepareCodesSection = true;
						oController.codesAllRowsLocked = true;
						oController.codesDetails = {
							allRowsLocked: allRowsLocked,
							urlParameters: urlParameters
						};
						if (viewModel.getProperty("/addCorrectionLines" + sEntitySet)) {
							oController.codesDetails = {
								allRowsLocked: true,
								urlParameters: urlParameters
							};
						}
						var editablelistEntity = oMetaModel.getODataAssociationSetEnd(entity, entity.navigationProperty[i].name).entitySet;
						codesEntity.push(editablelistEntity);

						//										break;
					} else if (oTargetEntity && oTargetEntity['vui.bodc.workspace.CodesNonEditable']) {
						if (segmentedButton.getItems()[1])
							segmentedButton.getItems()[1].setVisible(true);
						oController.sidePanelDSC.showCodes = true;
						oController.prepareCodesSection = true;
						/*	var listEntity = oMetaModel.getODataAssociationSetEnd(entity,entity.navigationProperty[i].name).entitySet;
						var codesList = new sap.ui.comp.smartlist.SmartList({
							entitySet: listEntity,
							header: oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"]["TypeName"].String,
							showRowCount: false,
							enableAutoBinding:true,
							listItemTemplate:
								new sap.m.StandardListItem({
									title:"{text}", 
									//													description:"{text}"
								})
						//										new sap.m.CustomListItem({
						//										content: new sap.m.CheckBox({
						//										selected:"{seltd}", 
						//										enabled:"{= ${seltd_fc} === 3 }",
						//										partiallySelected:"{psltd}",
						//										text:"{text}"
						//										})
						//										})
						});
						//										codesList.bindElement("/" + listEntity);
						itemTabBar.getItems()[1].addContent(codesList);*/

					}
				}
			}

			viewModel.setProperty("/bulkEditCode/codesEntity", codesEntity);

			//			}
			//			});



			//			if(!viewModel.getProperty("/DSCSegmentedButtonSelectedKey")){
			if (segmentedButton.getItems()[0]) {
				segmentedButton.getItems()[0].firePress();
				segmentedButton.getButtons()[0].firePress();
				segmentedButton.setSelectedKey(segmentedButton.getItems()[0].getKey());
			}
			//			}else{
			//			var DSCSegmentedButtonSelectedKey = viewModel.getProperty("/DSCSegmentedButtonSelectedKey");
			//			for(var i=0; i<segmentedButton.getButtons().length; i++){
			//			if(segmentedButton.getItems()[i].getKey() === DSCSegmentedButtonSelectedKey){
			//			segmentedButton.getItems()[i].firePress();
			//			segmentedButton.getButtons()[i].firePress();
			//			segmentedButton.setSelectedKey(segmentedButton.getItems()[i].getKey());
			//			break;
			//			}
			//			}
			//			}

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
			//			},

			//			});
			oModel.submitChanges({
				batchGroupId: "changes"
			});

		},

		onShowDsc: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			//			var currentSectionId = oEvent.getSource().getParent().getParent().getSelectedSection();
			//			var dynamicSideContent = oController.getView().byId(currentSectionId).getSubSections()[0].getBlocks()[0].getContent()[0];
			var currentRoute = viewModel.getProperty("/cuttentRoute");
			if (currentRoute == "Detail") {
				viewModel.setProperty("/DetailshowHideDsc", true);
			} else if (currentRoute == "DetailDetail") {
				viewModel.setProperty("/DetailDetailshowHideDsc", true);
			}
			//			var dynamicSideContent = oController.getDynamicSideContent(oEvent.getSource());
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
			//			var dynamicSideContent = oController.getDynamicSideContent(oEvent.getSource());
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
			var currentRoute = viewModel.getProperty("/cuttentRoute");
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
				if (oEvent.getSource().getParent().getBindingContextPath) {
					selectedPath = oEvent.getSource().getParent().getBindingContextPath();
				} else {
					selectedPath = oEvent.getSource().getParent().getBindingContext().getPath();
				}
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
			//			var dynamicSideContent = oController.getDynamicSideContent(oEvent.getSource());	
			var dynamicSideContent = oController.getResponsiveSplitter(oEvent.getSource());

			var currentRoute = viewModel.getProperty("/cuttentRoute");
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
			//			var dynamicSideContent = oController.getView().byId(currentSectionId).getSubSections()[0].getBlocks()[0].getContent()[0];
			//			if(!dynamicSideContent.getMainContent){
			//			dynamicSideContent = oController.getView().byId(currentSectionId).getSubSections()[0].getBlocks()[0].getContent()[1];
			//			}
			var dynamicSideContent;
			if (oController.isControlOfType(section.getSubSections()[0].getBlocks()[0].getContent()[0], "sap/ui/layout/ResponsiveSplitter")) {
				dynamicSideContent = oController.getView().byId(currentSectionId).getSubSections()[0].getBlocks()[0].getContent()[0];
			} else {
				dynamicSideContent = oController.getView().byId(currentSectionId).getSubSections()[0].getBlocks()[0].getContent()[1];
			}


			//			var dynamicSideContent = oController.getDynamicSideContent(oEvent.getSource());
			//			oEvent.getSource().setVisible(false);
			//			oController.getView().byId(oEvent.getSource().data().id).setVisible(true);
			_.each(sections, function (section) {
				//				var dynamicSideContent = section.getSubSections()[0].getBlocks()[0].getContent()[0];
				//				if(!dynamicSideContent.getMainContent){
				//				dynamicSideContent = section.getSubSections()[0].getBlocks()[0].getContent()[1];
				//				}
				var dynamicSideContent;
				if (oController.isControlOfType(section.getSubSections()[0].getBlocks()[0].getContent()[0], "sap/ui/layout/ResponsiveSplitter")) {
					dynamicSideContent = oController.getResponsiveSplitter(section.getSubSections()[0].getBlocks()[0].getContent()[0]);
				} else {
					dynamicSideContent = oController.getResponsiveSplitter(section.getSubSections()[0].getBlocks()[0].getContent()[1]);
				}

				var currentRoute = viewModel.getProperty("/cuttentRoute");
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
			//			var currentSectionId = oEvent.getSource().getParent().getParent().getSelectedSection();
			//			var dynamicSideContent = oController.getView().byId(currentSectionId).getSubSections()[0].getBlocks()[0].getContent()[0];
			var sections = oController.getView().getContent()[0].getSections();
			_.each(sections, function (section) {
				//				var dynamicSideContent = section.getSubSections()[0].getBlocks()[0].getContent()[0];
				//				if(!dynamicSideContent.getMainContent){
				//				dynamicSideContent = section.getSubSections()[0].getBlocks()[0].getContent()[1];
				//				}
				var dynamicSideContent;
				if (oController.isControlOfType(section.getSubSections()[0].getBlocks()[0].getContent()[0], "sap/ui/layout/ResponsiveSplitter")) {
					dynamicSideContent = oController.getResponsiveSplitter(section.getSubSections()[0].getBlocks()[0].getContent()[0]);
				} else {
					dynamicSideContent = oController.getResponsiveSplitter(section.getSubSections()[0].getBlocks()[0].getContent()[1]);
				}

				var currentRoute = viewModel.getProperty("/cuttentRoute");
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
			var matchEntities = [], segmentedButton;
			var oEntityType = oModel.getMetaModel().getODataEntityType(oModel.getMetaModel().getODataEntitySet(sEntitySet).entityType);
			//			var itemTabBar = dynamicSideContent.getSideContent()[2];
			var itemTabBar = oController.getView().byId(DSCId + "::IconTab");
			if (!itemTabBar) {
				itemTabBar = sap.ui.getCore().byId(DSCId + "::IconTab");
				segmentedButton = sap.ui.getCore().byId(DSCId + "::SegButton");
			} else {
				segmentedButton = oController.getView().byId(DSCId + "::SegButton");
			}

			var errorMessages = oController.checkErrorMessageExist(oModel);
			if (!errorMessages) {
				oController.removeMessages(oController);
			}

			urlParameters["_row_id"] = oModel.getProperty(selectedPath).row_id;
			urlParameters["_dscen"] = true;
			//			if(!viewModel.getProperty("/disp_only")){
			if (!viewModel.getProperty("/skipLockFunction")) {
				if (!viewModel.getProperty("/addCorrectionLines" + sEntitySet)) {
					oModel.callFunction("/" + sEntitySet + "_LOCK", {
						method: "POST",
						batchGroupId: "changes",
						urlParameters: urlParameters,
						success: function (oData, response) {
						},
						error: function (oData, response) {
							setTimeout(function () {
								oController.showMessagePopover(oController.messageButtonId);
							}, 1000);
						}
					});
				}
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
			if (segmentedButton.getItems()[0]) {
				segmentedButton.getButtons()[0].firePress();
				segmentedButton.getItems()[0].firePress();
				segmentedButton.setSelectedKey(segmentedButton.getItems()[0].getKey());
			}
			//			}else{
			//			var DSCSegmentedButtonSelectedKey = viewModel.getProperty("/DSCSegmentedButtonSelectedKey");
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
			var row_id;
			if (oController.correction_row_id && oController.correction_row_id[sEntitySet] &&
				oController.correction_row_id[sEntitySet][urlParameters["_row_id"]]) {
				var correction_row_id = oController.correction_row_id[sEntitySet][urlParameters["_row_id"]];
				row_id = correction_row_id;
				selectedPath = selectedPath.replace(urlParameters["_row_id"], correction_row_id);
			} else {
				row_id = urlParameters["_row_id"];
			}
			//			urlParameters = oController.readQueryPrepare(sEntitySet);
			//			urlParameters["_row_id"] = row_id;
			//			urlParameters["row_id"] = row_id;
			oModel.submitChanges({
				batchGroupId: "changes",
				success: function () {
					//					oModel.refresh();
					//					oSmartTable.rebindTable();
					//					tableBindingInfo.binding.refresh();
					oModel.read(selectedPath, {
						_refresh: true,
						urlParameters: oController.readQueryPrepare(sEntitySet),
						success: function (oData, response) {
							//							oModel.setProperty(selectedPath + "/edtst",oData.edtst);
							//							var oData = oData1.results[0];
							var mainTableSelectedRowData = oData;
							//							var mainTableSelectedRowData = _.find(oData1.results,{row_id:urlParameters.row_id});
							viewModel.setProperty("/editingStatusDSC", oData.edtst);
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
							if (oData && oData.pstat == "4" && !oData.itcrd && !viewModel.getProperty("/addCorrectionLines" + sEntitySet)) {
								viewModel.setProperty("/" + sEntitySet + "showDscCorrectionLines", true);
								//								viewModel.setProperty("/addCorrectionLines" + sEntitySet, true);
							} else {
								viewModel.setProperty("/" + sEntitySet + "showDscCorrectionLines", false);
								//								viewModel.setProperty("/addCorrectionLines" + sEntitySet, false);
							}
							//							var selectedRowData = $.extend(true,{},oData);
							_.each(lineItems, function (item) {
								if (item.Value.Path !== "edtst") {
									var cellProperties = _.find(entity["property"], { name: item.Value.Path });
									var nonResponsiveLineItem;
									if (entity["vui.bodc.NonResponsiveLineItem"]) {
										nonResponsiveLineItem = entity["vui.bodc.NonResponsiveLineItem"].find(function (nrlitem) { return nrlitem.Value.Path == item.Value.Path });
									}
									if (!nonResponsiveLineItem || (nonResponsiveLineItem && !nonResponsiveLineItem["vui.bodc.MultiInput"])) {
										if (cellProperties["com.sap.vocabularies.Common.v1.Label"] && cellProperties["com.sap.vocabularies.Common.v1.Label"].String) {
											tableData.push({ "row1": cellProperties["com.sap.vocabularies.Common.v1.Label"].String, "field": cellProperties.name });
										}
									}
								}
								//								if(oData && oData.pstat == "4" && !oData.itcrd){
								//								if((cellProperties['com.sap.vocabularies.UI.v1.ReadOnly'] && cellProperties['com.sap.vocabularies.UI.v1.ReadOnly'].Bool == "true") ||
								//								(cellProperties["com.sap.vocabularies.Common.v1.FieldControl"] && cellProperties["com.sap.vocabularies.Common.v1.FieldControl"].EnumMember == "com.sap.vocabularies.Common.v1.FieldControlType/ReadOnly")){

								//								}else if(cellProperties["com.sap.vocabularies.Common.v1.FieldControl"] && cellProperties["com.sap.vocabularies.Common.v1.FieldControl"].Path){
								//								selectedRowData[cellProperties["com.sap.vocabularies.Common.v1.FieldControl"].Path] = 3;
								//								}	
								//								}
							});

							//							if(oData && oData.pstat == "4" && !oData.itcrd){
							//							viewModel.setProperty("/" + sEntitySet + "selectedRowData",selectedRowData);
							//							}
							//							var sideContentTable = dynamicSideContent.getSideContent()[1].getItems()[0].getContent()[0];
							var sideContentTable = oController.getView().byId(DSCId + "::Table");
							if (!sideContentTable) {
								var sideContentTable = sap.ui.getCore().byId(DSCId + "::Table");
							}
							//							if(!viewModel.getProperty("/" + sEntitySet + "showDscCorrectionLines")){
							if (sideContentTable.getHeaderToolbar && sideContentTable.getHeaderToolbar())
								sideContentTable.getHeaderToolbar().addStyleClass("vistex-display-none");
							//							}else{
							//							sideContentTable.getHeaderToolbar().removeStyleClass("vistex-display-none");
							//							sideContentTable.bindElement("viewModel>/" + sEntitySet + "selectedRowData");
							//							}
							if (dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[0]) {
								dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[0].setVisible(false);
							}
							if (dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[1]) {
								dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[1].setVisible(false);
							}
							if (dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[2]) {
								dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[2].setVisible(false);
							}
							if (dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[3]) {
								dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[3].setVisible(false);
							}
							sideContentTable.bindElement(selectedPath);
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
							sideContentTable.bindAggregation("items", "viewModel>/itemsData" + DSCId, function (sId, oContext) {
								var contextObject = oContext.getObject();
								var fcat_data = viewModel.getProperty("/columnData");
								var cells = [];
								_.each(fcat_data, function (obj) {
									if (obj.col != "row1") {
										var field_propLineItem = lineItems.find(function (prop) {
											return prop.Value.Path === contextObject.field
										});

										var field_prop = entity["property"].find(function (prop) {
											return prop.name === contextObject.field
										});

										var input;
										if (field_propLineItem.NoOfDecimals || field_propLineItem["ManualUnitField"]) {
											var noofDecimals = 2;
											if (field_propLineItem.NoOfDecimals) {
												noofDecimals = field_propLineItem.NoOfDecimals.String;
											}
											if ((field_prop['com.sap.vocabularies.UI.v1.ReadOnly']
												&& field_prop['com.sap.vocabularies.UI.v1.ReadOnly'].Bool
												&& field_prop['com.sap.vocabularies.UI.v1.ReadOnly'].Bool == "true") ||
												(field_prop['com.sap.vocabularies.Common.v1.FieldControl']
													&& field_prop['com.sap.vocabularies.Common.v1.FieldControl'].EnumMember
													&& field_prop['com.sap.vocabularies.Common.v1.FieldControl'].EnumMember == "com.sap.vocabularies.Common.v1.FieldControlType/ReadOnly")) {
												input = new sap.m.Text({
													wrapping: false,
													text: "{parts:[{path:'" + contextObject.field + "'},{path:'" + field_prop["sap:unit"] + "'},{value: '" + noofDecimals + "'}],formatter: 'zvui.work.controller.AnnotationHelper.formatDecimalField'}"
												});
											} else {
												if (field_propLineItem["ManualUnitField"]) {
													input = new sap.m.HBox({
														justifyContent: "End",
														alignItems: "Center",
														items: [
															new sap.ui.comp.smartfield.SmartField({
																value: "{" + contextObject.field + "}",
																change: [oController.onTableFieldChange, oController]
															}),
															//															new SmartDecimalField({
															//															value: "{" + contextObject.field + "}",
															//															noOfDecimals: noofDecimals,
															////															textAlign: sap.ui.core.TextAlign.Right,
															//															change:[oController.onTableFieldChange,oController]}),
															new sap.ui.comp.smartfield.SmartField({
																value: "{" + field_prop["sap:unit"] + "}",
																change: [oController.onTableFieldChange, oController]
															}).addStyleClass("UnitFieldMarginLeft")
														]
													});
												} else {
													input = new sap.ui.comp.smartfield.SmartField({
														value: "{" + contextObject.field + "}",
														change: [oController.onTableFieldChange, oController],
														configuration: [
															new sap.ui.comp.smartfield.Configuration({
																displayBehaviour: oController.getTextArrangementForSmartControl(field_propLineItem, oEntityType)
															})
														]
													});
													//													input = new SmartDecimalField({
													//													value: "{" + contextObject.field + "}",
													//													noOfDecimals: noofDecimals,
													//													change:[oController.onTableFieldChange,oController],
													//													configuration: [
													//													new sap.ui.comp.smartfield.Configuration({
													//													displayBehaviour: oController.getTextArrangementForSmartControl(field_propLineItem, oEntityType)
													//													})
													//													]
													//													});
												}
											}
										} else {

											input = new sap.ui.comp.smartfield.SmartField({
												value: "{" + contextObject.field + "}",
												change: [oController.onTableFieldChange, oController],
												configuration: [
													new sap.ui.comp.smartfield.Configuration({
														displayBehaviour: oController.getTextArrangementForSmartControl(field_propLineItem, oEntityType)
													})
												]
											});
										}

										cells.push(input);
									} else {
										var text = new sap.m.Label({ design: "Bold", wrapping: true }).bindProperty("text", "viewModel" + ">" + obj["col"], null, sap.ui.model.BindingMode.OneWay);
										cells.push(text);
									}
								});
								return new sap.m.ColumnListItem({
									cells: cells,
									type: "Active",
								}).addStyleClass("noPadding");
							});
							viewModel.setProperty("/columnData", columnData);
							viewModel.setProperty("/itemsData" + DSCId, tableData);

							itemTabBar.getItems()[1].removeAllContent();
							if (entity.navigationProperty && entity.navigationProperty.length > 0) {
								for (var i = 0; i < entity.navigationProperty.length; i++) {
									oTargetEntity = oMetaModel.getODataEntityType(oMetaModel.getODataAssociationEnd(entity, entity.navigationProperty[i].name).type);
									if (oTargetEntity && oTargetEntity['vui.bodc.workspace.CodesEditable']) {
										//						itemTabBar.getItems()[1].setVisible(true);
										if (segmentedButton.getItems()[1])
											segmentedButton.getItems()[1].setVisible(true);
										oController.sidePanelDSC.showCodes = true;
										oController.prepareCodesSection = true;
										if (mainTableSelectedRowData.pstat != "4") {
											oController.codesDataEnabled = mainTableSelectedRowData.edtst;
										}
										/*var listEntity = oMetaModel.getODataAssociationSetEnd(entity,entity.navigationProperty[i].name).entitySet;
										var codesList = new sap.ui.comp.smartlist.SmartList({
											entitySet: listEntity,
											header: oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"]["TypeName"].String,
											showRowCount: false,
											enableAutoBinding:true
										});
										var customListItem;
										if(mainTableSelectedRowData.edtst === "1"){
											customListItem = new sap.m.CustomListItem({
												content: new sap.m.CheckBox({
													selected:"{seltd}", 
													enabled:"{= ${seltd_fc} === 3}",
													partiallySelected:"{psltd}",
													text:"{text}"
												})
											});
										}else{
											customListItem = new sap.m.CustomListItem({
												content: new sap.m.CheckBox({
													selected:"{seltd}", 
													enabled: false,
													partiallySelected:"{psltd}",
													text:"{text}"
												})
											});
										}	

//										customListItem = new sap.m.CustomListItem({
//										content: new sap.m.CheckBox({
//										selected:"{seltd}", 
//										enabled:"{= ${seltd_fc} === 3}",
//										partiallySelected:"{psltd}",
//										text:"{text}"
//										})
//										});								

										codesList.setListItemTemplate(customListItem);

										//						codesList.bindElement("/" + listEntity);
										itemTabBar.getItems()[1].addContent(codesList);*/
									} else if (oTargetEntity && oTargetEntity['vui.bodc.workspace.CodesNonEditable']) {
										//						itemTabBar.getItems()[1].setVisible(true);
										if (segmentedButton.getItems()[1])
											segmentedButton.getItems()[1].setVisible(true);
										oController.sidePanelDSC.showCodes = true;
										oController.prepareCodesSection = true;
										/*var listEntity = oMetaModel.getODataAssociationSetEnd(entity,entity.navigationProperty[i].name).entitySet;
										var codesList = new sap.ui.comp.smartlist.SmartList({
											entitySet: listEntity,
											header: oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"]["TypeName"].String,
											showRowCount: false,
											enableAutoBinding:true,
											listItemTemplate:
												new sap.m.StandardListItem({
													title:"{text}", 
													//									description:"{text}"
												})
										//						new sap.m.CustomListItem({
										//						content: new sap.m.CheckBox({
										//						selected:"{seltd}", 
										//						enabled:"{= ${seltd_fc} === 3 }",
										//						partiallySelected:"{psltd}",
										//						text:"{text}"
										//						})
										//						})
										});
										//						codesList.bindElement("/" + listEntity);
										itemTabBar.getItems()[1].addContent(codesList);*/
									} else if (oTargetEntity && oTargetEntity['vui.bodc.workspace.MatchHeader']) {
										var entityset = oMetaModel.getODataAssociationSetEnd(entity, entity.navigationProperty[i].name).entitySet;
										matchEntities.push(entityset);
										viewModel.setProperty("/matchEntities", matchEntities);
									} else if (oTargetEntity && oTargetEntity['vui.bodc.workspace.Notes']) {
										if (segmentedButton.getItems()[3]) {
											segmentedButton.getItems()[3].setVisible(true);
											var notesSection = segmentedButton.getItems()[3];
										} else if (segmentedButton.getItems()[2] && segmentedButton.getItems()[2].getKey() == 'notes') {
											segmentedButton.getItems()[2].setVisible(true);
											var notesSection = segmentedButton.getItems()[2];
										} else if (segmentedButton.getItems()[1] && segmentedButton.getItems()[1].getKey() == 'notes') {
											segmentedButton.getItems()[1].setVisible(true);
											var notesSection = segmentedButton.getItems()[1];
										}
										notesSection.addCustomData(new sap.ui.core.CustomData({ key: "entityName", value: oTargetEntity.name.split("Type")[0] }));
										notesSection.addCustomData(new sap.ui.core.CustomData({ key: "itemTabBarId", value: itemTabBar.getId() }));
										notesSection.addCustomData(new sap.ui.core.CustomData({ key: "selectedPath", value: selectedPath }));
										//										oController.noteSectionPrepare(oTargetEntity, itemTabBar);
									}
								}
							}

							if (matchEntities.length > 0) {
								if (mainTableSelectedRowData.edtst == "1" && mainTableSelectedRowData.pstat != "4") {
									if (segmentedButton.getItems()[2])
										segmentedButton.getItems()[2].setVisible(true);
									oController.sidePanelDSC.showSuggestion = true;
									//									segmentedButton.getItems()[3].setVisible(true);
									oController.matchSectionPrepare(matchEntities, itemTabBar);
								}
							}
						}
					});
					sap.ui.core.BusyIndicator.hide();

				},
				error: function (oData, response) {
					setTimeout(function () {
						oController.showMessagePopover(oController.messageButtonId);
					}, 1000);
					sap.ui.core.BusyIndicator.hide();
				}
			});
		},

		onDscApply: function (oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			var content, currentRoute = viewModel.getProperty("/cuttentRoute");
			var flexibleColumnLayout = oController.getOwnerComponent().getRootControl().byId("idAppControl");
			if (currentRoute == "Detail") {
				content = oController.getView();
			} else if (currentRoute == "DetailDetail") {
				content = flexibleColumnLayout.getCurrentMidColumnPage().getContent()[0].getContent()[viewModel.getProperty("/currentDetailPageLevel")];
			}
			//			var oDynamicSideContent = oController.getDynamicSideContent(oEvent.getSource());
			//			var DSCId = oDynamicSideContent.getId();
			var oDynamicSideContent = oController.getResponsiveSplitter(oEvent.getSource());
			var DSCId = oDynamicSideContent.content.getId();

			var dscTable = content.byId(DSCId + "::Table");
			if (!dscTable) {
				var dscTable = sap.ui.getCore().byId(DSCId + "::Table");
			}
			var oEventCustomData = oEvent.getSource().data();
			//			var dscTable = oDynamicSideContent.getSideContent()[1].getItems()[0].getContent()[0];
			if (oDynamicSideContent.getMainContent) {
				if (oDynamicSideContent.getMainContent()[1]) {
					var mainTable = oDynamicSideContent.getMainContent()[1].getTable();
				} else
					var mainTable = oDynamicSideContent.getMainContent()[0].getTable();
			} else {
				return;
			}
			var selectAll, urlParameters = {}, selectedContext = [], rowIDs = [];
			var entitySet = mainTable.getParent().getEntitySet();
			var addCorrectionLines = viewModel.getProperty("/addCorrectionLines" + entitySet);
			var functionImport, correction_row_id;
			//			if(addCorrectionLines){
			//			functionImport = oMetaModel.getODataFunctionImport(entitySet+"_ACORR");
			//			}else{
			functionImport = oMetaModel.getODataFunctionImport(entitySet + "_BulkEditApply");
			//			}
			if (mainTable.getSelectedContexts) {
				var selectedContexts = mainTable.getSelectedContexts();
				if (mainTable.getVisibleItems().length == mainTable.getSelectedItems().length) {
					selectAll = true;
				}
			} else {
				if (mainTable.getParent()._getRowCount() == mainTable.getSelectedIndices().length) {
					selectAll = true;
				}
			}
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

			if (selectAll) {
				urlParameters["_selal"] = 'X';
			} else {
				_.each(selectedContext, function (context) {
					if (context && context.getPath) {
						var rowId = oModel.getProperty(context.getPath()).row_id;
						if (oController.correction_row_id && oController.correction_row_id[entitySet] &&
							oController.correction_row_id[entitySet][rowId]) {
							correction_row_id = oController.correction_row_id[entitySet][rowId];
						}
						else {
							correction_row_id = rowId;
						}
						rowIDs.push(correction_row_id);
					}
				});

				urlParameters["_row_id"] = rowIDs.toString();
				var unselected_row_ids = [];
				if (rowIDs.length !== selectedContext.length && oController.rowSelectionData[entitySet]) {
					for (var i = 0; i < oController.rowSelectionData[entitySet].length; i++) {
						var oContextData = oModel.getProperty(oController.rowSelectionData[entitySet][i]);
						if (oContextData) {
							var found = rowIDs.find(function (obj) { return obj == oContextData.row_id });
							if (!found) {
								unselected_row_ids.push(oContextData.row_id);
							}
						}
					}
					if (unselected_row_ids.length > 0) {
						urlParameters["_row_id"] = unselected_row_ids.toString();
						urlParameters["unselected"] = true;
					}
				}
			}
			var tableBindingInfo = oController.getTableBindingInfo(mainTable.getParent());

			//			if(!oEventCustomData.codes){
			_.each(dscTable.getItems(), function (item) {
				if (!item.getCells()[1].getText) {
					var cell;
					if (item.getCells()[1].getValue) {
						cell = item.getCells()[1];
					} else {
						cell = item.getCells()[1].getItems()[0];
					}
					var cellValue = cell.getValue();
					if (cell.getSelectedItem && cell.getSelectedItem() && cell.getSelectedItem().getKey() != "") {
						cellValue = cell.getSelectedItem().getKey();
					}
					var fieldPropertyName = cell.getCustomData()[1].getValue();
					var dataType = cell.getCustomData()[0].getValue();
					if (cellValue != "< Keep Existing Values >") {
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
									//								var sUomPropertyName = oField.getUnitOfMeasurePropertyName();
									//								if (oField.isComposite()) {
									//								urlParameters[sUomPropertyName] = "";
									//								}
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
							//							urlParameters[fieldPropertyName] = cellValue;
							if (cell.getCustomData()[2]) {
								if (item.getCells()[1].getItems()[1].getValue && item.getCells()[1].getItems()[1].getValue() == ("< Keep Existing Values >" || "< Leave Blank >" || null)) {
									urlParameters[cell.getCustomData()[2].getValue()] = "";
								} else if (item.getCells()[1].getItems()[1].getValue) {
									urlParameters[cell.getCustomData()[2].getValue()] = item.getCells()[1].getItems()[1].getValue();
								} else if (item.getCells()[1].getItems()[1].getText && item.getCells()[1].getItems()[1].getText() == ("< Keep Existing Values >" || "< Leave Blank >" || null)) {
									urlParameters[cell.getCustomData()[2].getValue()] = "";
								} else if (item.getCells()[1].getItems()[1].getText) {
									urlParameters[cell.getCustomData()[2].getValue()] = item.getCells()[1].getItems()[1].getText();
								}
							}
						}
					}
				}
			});

			if (addCorrectionLines) {
				urlParameters["correction_line"] = true;
			}
			var dataChanged = false;
			if (Object.keys(urlParameters) && Object.keys(urlParameters).length > 1) {
				oModel.callFunction("/" + functionImport.name, {
					method: "POST",
					batchGroupId: "changes",
					urlParameters: urlParameters
				});
				dataChanged = true;
			}
			//				else{
			//					return;
			//				}
			//			}else{
			var codeList = viewModel.getProperty("/bulkEditCode/" + oEventCustomData.codeEntity);
			if (codeList && codeList.itemsData) {
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
					oModel.callFunction("/" + oEventCustomData.codeEntity + "_CodesApply", {
						method: "POST",
						batchGroupId: "changes",
						urlParameters: urlParameters
					});
					dataChanged = true;
				}
				//				else{
				//					return;
				//				}

				//				for(var codeEntity in codeLists){
				//				oModel.update("/" + codeLists[codeEntity].entityName, codeLists[codeEntity].itemsData, {
				//				method: "PUT",
				//				batchGroupId: "changes",
				//				urlParameters: urlParameters,
				//				success: function(data) {
				//				oModel.read("/" + codeLists[codeEntity].entityName,{
				//				success: function(oData,response){
				//				var responseEntity = oData.results[0].__metadata.type.split(".")[oData.results[0].__metadata.type.split(".").length - 1].split("Type")[0];
				//				viewModel.setProperty("/bulkEditCode/" + responseEntity + "/itemsData",oData.results);
				//				}
				//				});
				//				tableBindingInfo.binding.refresh();
				//				viewModel.setProperty("/modelChanged",true);
				//				},
				//				error: function(e) {
				//				//						alert("error");
				//				}
				//				})
				//				}
			}
			if (!dataChanged) {
				return;
			}
			if (!urlParameters["_selal"]) {
				urlParameters["_row_id"] = rowIDs.toString();
			}
			oModel.submitChanges({
				batchGroupId: "changes",
				success: function (oData, response) {
					//					oModel.refresh(true);
					//****				Patch 11 - For Header update call is required as sometimes snapping header value will also get change by changing any item data	
					if (viewModel.getProperty("/cuttentRoute") == 'DetailDetail') {
						var sPath = content.getBindingContext().getPath();
						var entitySet = sPath.split("/")[sPath.split("/").length - 1].split("(")[0];
						oController.readPath(entitySet, sPath);
					}
					//****
					if (!oEventCustomData.codes) {
						if (selectAll) {
							//****					For tree table on binding refresh rows are unselecting
							if (mainTable instanceof sap.ui.table.TreeTable) {
								viewModel.setProperty("/tablePosition", mainTable._getScrollExtension().getVerticalScrollbar().scrollTop);
								var indices = mainTable.getSelectedIndices();
								viewModel.setProperty("/skipSlectionChange", true);
								var correction_line_table_indices = {};
								correction_line_table_indices.tableId = mainTable.getId();
								correction_line_table_indices.indices = indices;
								viewModel.setProperty("/correction_line_table_indices", correction_line_table_indices);
							}
							tableBindingInfo.binding.refresh();
						} else {
							var entitySet = mainTable.getParent().getEntitySet();
							urlParameters.row_id = urlParameters._row_id
							oModel.read("/" + entitySet, {
								urlParameters: _.extend(urlParameters, oController.readQueryPrepare(entitySet))
							});
						}
						//****	
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
					viewModel.setProperty("/modelChanged", true);
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
					//					var responseEntity = oData.results[0].__metadata.type.split(".")[oData.results[0].__metadata.type.split(".").length - 1].split("Type")[0];
					//					viewModel.setProperty("/bulkEditCode/" + responseEntity + "/itemsData",$.extend(true,{},oData.results));
					//					viewModel.setProperty("/bulkEditCode/" + responseEntity + "/referenceItemsData",$.extend(true,{},oData.results));
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
			}
		},

		onDateChange: function (oEvent) {
			var oController = this;
			var dateField = oEvent.getSource();
			if (oEvent.getParameter("value") == "< Select New Date >") {
				var oCalendar = new sap.ui.unified.Calendar({
					width: "100%",
				}), oSelectedDate, sDate,
					oDateFormat = sap.ui.core.format.DateFormat.getInstance({ pattern: "dd-MM-yyyy" });
				var oSelectNewDateDialog = new sap.m.Dialog({
					title: "Select New Date",
					content: [
						oCalendar
					],
					beginButton: new sap.m.Button({
						text: "OK",
						press: function (oEvent) {
							oSelectedDate = oCalendar.getSelectedDates()[0].getStartDate();
							sDate = oDateFormat.format(oSelectedDate);
							dateField.setValue(sDate);
							dateField.setSelectedKey(sDate);
							oEvent.getSource().getParent().close();
						}.bind(this)
					}),
					endButton: new sap.m.Button({
						text: "Close",
						press: function () {
							oEvent.getSource().getParent().close();
						}.bind(this)
					})
				});

				oController.getView().addDependent(oSelectNewDateDialog);
				oSelectNewDateDialog.open();
			} else {
			}
		},

		onValueHelpRequest: function (oEvent) {
			var oController = this;
			var eventSource = oEvent.getSource();
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			//			var oDynamicSideContent = oController.getDynamicSideContent(oEvent.getSource());
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
				oEvent.getSource().revertSelection();
				var selectedBoxPath = oEvent.getSource().getBindingInfo("items").binding.oContext.getPath();
				var selectedBoxData = viewModel.getProperty(selectedBoxPath);
				var fieldPath = oEvent.getSource().getBindingContext().getPath();
				var fieldData = oModel.getProperty(oEvent.getSource().getParent().data()["selectedPath"]);

				var entity = mainTable.getEntitySet();
				var oEntity = oMetaModel.getODataEntitySet(entity);
				var oEntityType = oMetaModel.getODataEntityType(oEntity.entityType);
				var oProperty = oMetaModel.getODataProperty(oEntityType, selectedBoxData.field);
				var sTitle = oProperty["com.sap.vocabularies.Common.v1.Label"] ? oProperty["com.sap.vocabularies.Common.v1.Label"].String : oProperty["sap:label"];
				var path = oEntity.entityType + "/" + selectedBoxData.field;

				var valueHelpEntity = fieldData["to_" + selectedBoxData.field].__ref.split('(')[0];
				viewModel.setProperty("/valueHelpEntity", valueHelpEntity);
				var ValueHelpDialog = sap.ui.xmlfragment("zvui.work.fragment.ValueHelpDialog", oController);
				ValueHelpDialog.setTitle(sTitle);
				oController.getView().addDependent(ValueHelpDialog);
				ValueHelpDialog.setModel(oModel);

				if (!this._oMetadataAnalyser) {
					this._oMetadataAnalyser = new MetadataAnalyser(oModel);
				}
				var annotation = this._oMetadataAnalyser.getValueListAnnotation(path);
				var oAnnotation = annotation.primaryValueListAnnotation;
				oController.keyField = oAnnotation.keyField;

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
					//						if (!this.sTokenDisplayBehaviour || this.sTokenDisplayBehaviour === DisplayBehaviour.auto) {
					//						this.sTokenDisplayBehaviour = this.oFilterProvider ? this.oFilterProvider.sDefaultTokenDisplayBehaviour : DisplayBehaviour.descriptionAndId;
					//						}

					// fallback to idOnly if no description is present for tokens
					if (!oAnnotation.descriptionField) {
						sTokenDisplayBehaviour = "idOnly"; //DisplayBehaviour.idOnly;
					}

					var sDescription = oAnnotation.descriptionField || sKey; // fall back to key if there is no description

					if (sValueListEntitySetName && sKey) {
						// Get the Columns information (all fields on the UI)
						var _aCols = [];
						var aSelect = [];
						aCols = oAnnotation.valueListFields;
						iLen = aCols.length;
						for (i = 0; i < iLen; i++) {
							oField = aCols[i];
							// Type Handling: Special handling for date and boolean fields
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
							// Request data for fields regardless of visibility (since it could be needed for OUT param handling)!
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
					//					Log.error("BaseValueListProvider", "key for ValueListEntitySetName '" + this.sValueListEntitySetName + "' missing! Please check your annotations");
					//					}
					//					}

				}

			}
		},

		onValueHelpSearch: function (oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			var filterBar = oEvent.getSource();
			var filterEntity = filterBar.getEntitySet();
			var valueHelpDialog = filterBar.getParent().getParent().getParent();
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
								// Infinite number of requests are triggered if an error occurs, so don't update if no data is present
								// The below code is mainly required for token handling on the ValueHelpDialog.
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
					//					aEntitySetFields = this._oMetadataAnalyser.getFieldsByEntitySetName(this.sValueListEntitySetName);
					//					for (var i = 0; i < aEntitySetFields.length; i++) {
					//					if (aEntitySetFields[i].name === this.sKey && aEntitySetFields[i].sortable !== false) {
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

					//create the sorter based on the current sorted columns
					var aColumns = oTable.getColumns();
					for (var i = 0; i < aColumns.length; i++) {
						var oColumn = aColumns[i];
						oColumn._appDefaults = null;	//TODO: remove the column._appDefaults, otherwise the sort icon will be set back to the default column inside bindRows of the table!!!!
					}

					aColumns = oTable.getSortedColumns(); // when the user changed the sorting we get an array of SortedColumns
					if (!aColumns || aColumns.length == 0) {
						aColumns = oTable.getColumns();	// if not, we have to loop over all columns and used the one which we created as sorted.
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
			var oController = this;
			var _oValueHelpDialog = oEvent.getSource();
			var aTokens = oEvent.getParameter("tokens");
			var selectedValue = aTokens[0].data().row[oController.keyField];
			//			var dialogTable = _oValueHelpDialog.getContent()[0].getItems()[1].getItems()[0];
			//			var selectedIndex = dialogTable.getSelectedIndex();
			//			var selectedValue = dialogTable.getRows()[selectedIndex].getCells()[0].getText();
			//			oController._oInput.setValue(selectedValue);
			//			oController._oInput.setSelectedKey(selectedValue);
			oController._oInput.setSelectedItem(new sap.ui.core.Item({ text: selectedValue, key: selectedValue }));
			_oValueHelpDialog.close();
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
			//			sap.ui.core.BusyIndicator.show(0);

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
				var oContent = oButton.getParent();
				while (!(oContent instanceof sap.ui.comp.smarttable.SmartTable)) {
					oContent = oContent.getParent();
				}
				var oSmartTable = oContent;
				var oTable = oSmartTable.getTable();

				var selectedContexts = [], selectAll = false, selectedIndices;
				if (oTable.getSelectedContexts) {
					selectedContexts = oTable.getSelectedContexts();
					if (oTable.getVisibleItems().length == oTable.getSelectedItems().length) {
						selectAll = true;
					}
				} else {
					if (oSmartTable._getRowCount() == oTable.getSelectedIndices().length) {
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
					_.each(selectedIndices, function (index) {
						if (oTable.getContextByIndex(index))
							selectedContexts.push(oTable.getContextByIndex(index));
					});

				}

				var functionName = oButton.data("Action");

				if (functionName == "Row_Details") {
					//					sap.ui.core.BusyIndicator.hide();
					oController.openDSCToolbarAction(oSmartTable, selectAll, selectedContexts);
					return;
				}

				if (functionName.indexOf("_EXPD_ALL") > -1 && oTable instanceof sap.ui.table.TreeTable) {
					oController.handleTreeTableExpandLevel(oEvent, oTable);
				}

				var functionImport = oMetaModel.getODataFunctionImport(functionName);
				var length = functionImport.parameter.length;

				if (!functionImport.name.endsWith("_REMOVE_FILTER")
					&& !selectAll && selectedContexts.length <= 0) {
					//					sap.ui.core.BusyIndicator.hide();
					return;
				}

				var urlParameters = {};
				if (selectAll) {
					urlParameters["_selal"] = 'X';
				} else {
					var rowIDs = [];
					for (var i = 0; i < selectedContexts.length; i++) {
						var object = selectedContexts[i].getObject();
						rowIDs.push(object.row_id);
					}
					urlParameters["_row_id"] = rowIDs.toString();
				}
				viewModel.setProperty("/tablePosition", oTable._getScrollExtension().getVerticalScrollbar().scrollTop);
				oModel.callFunction("/" + functionImport.name, {
					method: "POST",
					batchGroupId: "changes",
					urlParameters: urlParameters
				});
				oModel.submitChanges({
					batchGroupId: "changes",
					success: function (oData, response) {
						var entitySet = oSmartTable.getEntitySet();
						if (functionImport.name.endsWith("_REMOVE_FILTER")) {
							var aDocumentFilters = viewModel.getProperty("/aDocFilters");

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
						} else if (functionImport["vui.bodc.ActionVisibility"].CorrectionLine) {
							if (viewModel.getProperty("/" + entitySet + "showDscCorrectionLines")) {
								viewModel.setProperty("/addCorrectionLines" + entitySet, true);
								setTimeout(function () {
									var indices = oTable.getSelectedIndices();
									viewModel.setProperty("/skipSlectionChange", true);
									var correction_line_table_indices = {};
									correction_line_table_indices.tableId = oTable.getId();
									correction_line_table_indices.indices = indices;
									viewModel.setProperty("/correction_line_table_indices", correction_line_table_indices);
									if (oTable.collapseAll)
										oTable.collapseAll();
									oController.getTableBindingInfo(oSmartTable).binding.refresh();
									//									setTimeout(function(){
									//										for(var i=0; i < indices.length; i++){
									//											if(i == indices.length-1)
									//												viewModel.setProperty("/skipSlectionChange",false);
									//											oTable.addSelectionInterval(indices[i],indices[i]);
									//										}
									//									},800);
									if (oData.__batchResponses && oData.__batchResponses[0] && oData.__batchResponses[0].__changeResponses && oData.__batchResponses[0].__changeResponses[0].data &&
										oData.__batchResponses[0].__changeResponses[0].data.upd_row_id) {
										if (!oController.correction_row_id) {
											oController.correction_row_id = {};
										}
										if (!oController.correction_row_id[entitySet]) {
											oController.correction_row_id[entitySet] = {};
										}
										//										if(rowIDs.length == 1){
										//										oController.correction_row_id[entitySet][rowIDs[0]] = oData.__batchResponses[0].__changeResponses[0].data.upd_row_id;
										//										}
										var correction_row_id = oData.__batchResponses[0].__changeResponses[0].data.upd_row_id.split(",");
										for (var i = 0; i < correction_row_id.length; i++) {
											oController.correction_row_id[entitySet][correction_row_id[i].split(":")[0]] = correction_row_id[i].split(":")[1];
										}
									}
								});
								//								oController.openDSCToolbarAction(oSmartTable,selectAll,selectedContexts);
							}
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
									if (navurl != "")
										break;
								}
								if (navurl != "") {
									delete sessionStorage.semanticObjectParams;
									sap.m.URLHelper.redirect(window.location.href.split('#')[0] + "#" + navurl, false);
								} else {
									oController.refreshSmartTable(oSmartTable);
								}
								//								sap.ushell.Container.getService("CrossApplicationNavigation").toExternal(  { target : { shellHash : navurl } } );
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
			var oSmartTable = oLink.getParent(), oEntity;
			if (customData.TableEntity) {
				oEntity = customData.TableEntity;
				var oRow_Id = customData.row_id
			} else {
				while (true) {
					if (oController.isSmartTable(oSmartTable))
						break;
					else
						oSmartTable = oSmartTable.getParent();
				}
				oEntity = oSmartTable.getEntitySet();
				var oRow_Id = oObject.row_id
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
						window.open(oObject.url_as + "&view=true", '_blank');
					}
				} else {
					oController.callNavigationAction(oObject.row_id, oEntity, oLink.data("FieldName").toUpperCase());
				}
			}
		},
		onQuickviewTitleClic: function (oEvent) {
			var oController = this;
			var oLink = oEvent.getSource().data("oLink");
			var customData = oLink.data();
			var oObject = oLink.getBindingContext().getObject(), oEntity, oRow_Id;
			if (customData.HREF) {
				if (customData.ICON) {
					window.open(oObject.url_as + "&view=true", '_blank');
				}
			} else {
				if (customData.TableEntity) {
					oEntity = customData.TableEntity;
					oRow_Id = customData.row_id
				} else {
					var oSmartTable = oLink.getParent();
					while (true) {
						if (oController.isSmartTable(oSmartTable))
							break;
						else
							oSmartTable = oSmartTable.getParent();
					}
					oEntity = oSmartTable.getEntitySet();
					oRow_Id = oObject.row_id;
				}
				oController.callNavigationAction(oRow_Id, oEntity, oLink.data("FieldName").toUpperCase());
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
			//			sap.ui.core.BusyIndicator.show(0);

			oModel.callFunction("/" + functionImport.name, {
				method: "POST",
				batchGroupId: "changes",
				urlParameters: urlParameters
			});
			oModel.submitChanges({
				batchGroupId: "changes",
				success: function (oData, response) {

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
							if (navurl != "")
								break;
						}
						if (navurl != "") {
							sap.m.URLHelper.redirect(window.location.href.split('#')[0] + navurl, true);
						}
						//						sap.ushell.Container.getService("CrossApplicationNavigation").toExternal(  { target : { shellHash : navurl } } );
					}
					//					sap.ui.core.BusyIndicator.hide();
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

			if (oViewContext) {
				// Detail screen
				sTableBindingPath = oController.getTableBindingInfo(oSmartTable).path;

				// create binding path
				sTableBindingPath = "/" + sTableBindingPath;
				sBindingPath = oViewContext.getPath() + sTableBindingPath;
			} else {
				// on list, support only one entityset mapped to the root component
				sBindingPath = "/" + entitySet;
			}

			if (oTable.getSelectedContexts) {
				selectedContexts = oTable.getSelectedContexts();
				if (oTable.getVisibleItems().length == oTable.getSelectedItems().length) {
					selectAll = true;
				}
			} else {
				if (oSmartTable._getRowCount() == oTable.getSelectedIndices().length) {
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
				//				sap.ui.core.BusyIndicator.hide();
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
					urlParameters["_selal"] = 'X';
				} else {
					urlParameters["_row_id"] = rowIDs.toString();
				}
				if (isApplyBackground) {
					urlParameters["_prcbg"] = 'X';
				}

				_.each(oMultiEditContainer.getFields(), function (oField) {
					if (!oField.isKeepExistingSelected()) {
						var oObject = oField.getRawValue(); //Use this in case if there is no context
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

		noBackPlease: function () { //this function adds a dummy hash to the URL and is used to show confirmation when back is clicked
			var oController = this;
			var viewModel = oController.getOwnerComponent().getModel("viewModel");
			if (window.location.hash.lastIndexOf("#!") != window.location.hash.length - 2) {
				viewModel.setProperty("/preventHashChange", true);
				viewModel.setProperty("/skipPageRefresh", true);
				window.location.href += "#!";
			}
		},

		removenoBackHash: function () { //this function removes the dummy hash present at the end of URL
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			if (window.location.hash.indexOf("#!") == window.location.hash.length - 2) {
				viewModel.setProperty("/preventHashChange", true);
				//				window.location.hash = window.location.hash.substr(0,window.location.hash.length - 2);
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
						//						sap.ui.core.BusyIndicator.show(0);
						oViewModel.setProperty("/modelChanged", true);
						oModel.submitChanges({
							batchGroupId: "changes",
							success: function (data, resonse) {
								//								sap.ui.core.BusyIndicator.hide();
								oModel.refresh();
							},
							error: function (data, response) {
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

			var oModel = oController.getView().getModel();
			oModel.submitChanges({
				batchGroupId: "changes",
				success: function (oData, response) {
					//					sap.ui.core.BusyIndicator.hide();
					oModel.refresh();
				},
				error: function (data, response) {
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
						var mainContentHeight = oControl.getRootPaneContainer().getPanes()[0].getContent().getContent()[0].$().height();
						oControl.getRootPaneContainer().getPanes()[0].setLayoutData(new sap.ui.layout.SplitterLayoutData({ size: "70%" }));
						oControl.getRootPaneContainer().getPanes()[1].getContent().setVisible(true);
						oControl.getRootPaneContainer().getParent().$().find(".sapUiLoSplitterBar").removeClass("vistex-display-none");
						setTimeout(function () {
							oControl.getRootPaneContainer().getParent().$().find(".sapUiLoSplitterBar").height(mainContentHeight);
							var sideContentHeight = oControl.getRootPaneContainer().getPanes()[1].getContent().$().height();
							var heightDiff = mainContentHeight - sideContentHeight;
							if (heightDiff > 0) {
								var scrollContainerHeight = oControl.getRootPaneContainer().getPanes()[1].getContent().getContent()[0].getItems()[2].getHeight();
								scrollContainerHeight = Number(scrollContainerHeight.split("px")[0]) + heightDiff - 70;
								if (scrollContainerHeight < 430) {
									scrollContainerHeight = 430;
								}
								scrollContainerHeight = scrollContainerHeight + "px";
								oControl.getRootPaneContainer().getPanes()[1].getContent().getContent()[0].getItems()[2].setHeight(scrollContainerHeight);
							} else {
								oControl.getRootPaneContainer().getPanes()[1].getContent().getContent()[0].getItems()[2].setHeight("430px");
							}
						}, 500);
					} else {
						oControl.getRootPaneContainer().getPanes()[0].setLayoutData(new sap.ui.layout.SplitterLayoutData({ size: "100%" }));
						oControl.getRootPaneContainer().getPanes()[1].getContent().setVisible(false);
						oControl.getRootPaneContainer().getParent().$().find(".sapUiLoSplitterBar").addClass("vistex-display-none");
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
			var currentRoute = viewModel.getProperty("/cuttentRoute");
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
			if (viewModel.getProperty("/layout") == "MidColumnFullScreen") {
				oController.onExpand();
			}
			viewModel.setProperty("/modelChanged", false);
			var entitySet = mainContentTable.getParent().getEntitySet();
			if (DynamicSideContent.getShowSideContent())
				DynamicSideContent.setShowSideContent(false);

			viewModel.setProperty("/" + entitySet + "showingSideContent", false);
			viewModel.setProperty("/" + entitySet + "showDscApply", false);
			viewModel.setProperty("/addCorrectionLines" + entitySet, false);
			viewModel.setProperty("/" + entitySet + "showDscCorrectionLines", false);
			viewModel.setProperty("/DSCSegmentedButtonSelectedKey", "");
		},

		noteSectionPrepare: function (oEntityName, itemTabBarId, selectedPath) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var oEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(oEntityName).entityType);
			var itemTabBar = sap.ui.getCore().getElementById(itemTabBarId);
			var viewModel = oController.getView().getModel("viewModel");
			itemTabBar.getItems()[3].removeAllContent();
			var selectedRowIDs = oController.getMainTableSelectedRows(itemTabBar);
			var url = selectedPath + "/to_" + oEntityName;
			var urlParameters = {}, NotesEditable;
			var functionImport = oMetaModel.getODataFunctionImport(oEntityName + "_Read_Notes");
			if (selectedRowIDs.mode == "Single") {
				NotesEditable = oModel.getProperty(selectedPath).edtst;
				if (NotesEditable == "2" || NotesEditable == " " || NotesEditable == "") {
					viewModel.setProperty("/" + oEntityName + "_LockNotes", true);
				} else {
					viewModel.setProperty("/" + oEntityName + "_LockNotes", false);
				}
				urlParameters.row_id = oModel.getProperty(selectedPath).row_id;
				oModel.read(url, {
					urlParameters: urlParameters,
					success: function (oData, response) {
						viewModel.setProperty("/notesDetails/notesResults", oData.results);
					}
				});
			} else {
				if (selectedRowIDs.lock || selectedRowIDs.disable) {
					viewModel.setProperty("/" + oEntityName + "_LockNotes", true);
				} else {
					viewModel.setProperty("/" + oEntityName + "_LockNotes", false);
				}
				if (functionImport) {
					urlParameters._row_id = "";
					urlParameters.row_id = selectedRowIDs.rowIDs;
					oModel.callFunction("/" + functionImport.name, {
						method: "POST",
						urlParameters: urlParameters,
						success: function (oData, response) {
							if (oData.results) {
								//								viewModel.setProperty("/notesDetails/notesResults",oData.results);
							}
						}
					});
				}
			}
			viewModel.setProperty("/notesDetails", {});

			var oControl = new sap.m.VBox();

			oControl.addItem(new sap.m.FeedInput({
				enabled: "{= !${viewModel>/" + oEntityName + "_LockNotes}}",
				placeholder: "{i18n>TYPESOMETHINGHERE}",
				showIcon: false,
				visible: "{= !${viewModel>/" + oEntityName + "_LockNotes}}",
				post: [oController.onNotesPost, oController],
				customData: [new sap.ui.core.CustomData({ key: "url", value: selectedPath }), new sap.ui.core.CustomData({ key: "entity", value: oEntityName })]
			}));

			var oList = new sap.m.List({
				customData: [new sap.ui.core.CustomData({ key: "url", value: selectedPath }), new sap.ui.core.CustomData({ key: "entity", value: oEntityName })]
			});

			oList.bindAggregation("items", "viewModel>/notesDetails/notesResults", function (sId, oContext) {
				var newFeedListItem = new sap.m.FeedListItem({
					sender: "{viewModel>crnam}",
					timestamp: "{parts:[{path:'viewModel>crdat'},{path:'viewModel>crtim/ms'}],formatter: 'zvui.work.controller.AnnotationHelper.getChangeLogTimeAndDate'}",
					//					timestamp: "{viewModel>crdat}",
					text: "{viewModel>notes}",
					actions: [
						//						new sap.m.FeedListItemAction({
						//						text: "{i18n>EDIT}",
						//						icon: "sap-icon://edit",
						//						press: [oController.onNotesEdit,oController],
						//						})
						//						,
						new sap.m.FeedListItemAction({
							text: "{i18n>DELETE}",
							icon: "sap-icon://delete",
							press: [oController.onNotesDelete, oController],
						})
					]
				});
				if (NotesEditable == "2") {
					newFeedListItem.removeAllActions();
				}
				return newFeedListItem;
			});
			oControl.addItem(oList);
			itemTabBar.getItems()[3].addContent(oControl);
		},

		onNotesPost: function (oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			var value = oEvent.getParameter("value");
			var oEntityName = oEvent.getSource().data("entity"), urlParameters = {};
			var path = oEvent.getSource().data("url");
			var url = path + "/to_" + oEntityName;
			var selectedRowIDs = oController.getMainTableSelectedRows(oEvent.getSource()), rowIDs;

			var functionImport = oMetaModel.getODataFunctionImport(oEntityName + "_Add");

			if (selectedRowIDs.mode == "Single") {
				rowIDs = oModel.getProperty(path).row_id;
			} else {
				rowIDs = selectedRowIDs.rowIDs;
			}

			if (functionImport) {
				urlParameters.notes = value;
				urlParameters._selal = "";
				urlParameters._row_id = "";
				urlParameters.row_id = rowIDs;
				oModel.callFunction("/" + functionImport.name, {
					method: "POST",
					urlParameters: urlParameters,
					success: function (oData, response) {
						var mParameters = {};
						mParameters.row_id = rowIDs;
						if (selectedRowIDs.mode == "Single") {
							oModel.read(url, {
								urlParameters: mParameters,
								success: function (oData, response) {
									viewModel.setProperty("/notesDetails/notesResults", oData.results);
									viewModel.setProperty("/modelChanged", true);
									oModel.setProperty(path + "/updkz", "U");
									var notesChangedPaths = viewModel.getProperty("/notesChangedPaths");
									if (!notesChangedPaths) {
										notesChangedPaths = [];
									}
									notesChangedPaths.push(path);
									notesChangedPaths = _.uniq(notesChangedPaths);
									viewModel.setProperty("/notesChangedPaths", notesChangedPaths);
								}
							});
						} else {
							var functionImport = oMetaModel.getODataFunctionImport(oEntityName + "_Read_Notes");
							if (functionImport) {
								mParameters._row_id = "";
								_.each(selectedRowIDs.paths, function (obj) {
									oModel.setProperty(obj.getPath() + "/updkz", "U");
								});
								var oBundle = oController.getView().getModel("i18n").getResourceBundle();
								var message = oBundle.getText("NOTESADDED");
								MessageToast.show(message, { duration: 5000, width: "30em" });

								//								oModel.callFunction("/" + functionImport.name, {
								//									method: "POST",
								//									urlParameters: mParameters,
								//									success : function(oData,response) {
								//										if(oData.results){
								//											viewModel.setProperty("/notesDetails/notesResults",oData.results);
								//										}
								//									}
								//								});
							}
						}
					},
					error: function (oData, response) {

					}
				});
			}
			//			oModel.create(oEvent.getSource().data("url"),{"notes": value},{
			//			urlParameters:urlParameters,
			//			success: function(oData,response){
			//			var notesData = viewModel.getProperty("/notesDetails/notesResults");
			//			if(!notesData){
			//			notesData = [];
			//			}
			//			notesData.push(oData);
			//			viewModel.setProperty("/notesDetails/notesResults",notesData);
			//			}
			//			});
		},

		onNotesEdit: function (oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
		},

		onNotesDelete: function (oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			var path = oEvent.getSource().getParent().getBindingContext("viewModel").getPath();
			var selectedData = viewModel.getProperty(path);
			var oEntityName = oEvent.getSource().getParent().getParent().data("entity");
			var path = oEvent.getSource().getParent().getParent().data("url");
			var url = path + "/to_" + oEntityName, urlParameters = {};
			var oEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(oEntityName).entityType);
			_.each(oEntityType.property, function (property) {
				if (property.name == "crdat") {
					urlParameters[property.name] = sap.ui.model.odata.ODataUtils.formatValue(selectedData[property.name], "Edm.DateTime");
				} else if (property.name == "crtim") {
					urlParameters[property.name] = selectedData[property.name].ms;
				} else {
					urlParameters[property.name] = selectedData[property.name];
				}
			})
			var functionImport = oMetaModel.getODataFunctionImport(oEntityName + "_Delete");
			if (functionImport) {
				oModel.callFunction("/" + functionImport.name, {
					method: "POST",
					urlParameters: urlParameters,
					success: function (oData, response) {
						var mParameters = {};
						mParameters.row_id = oModel.getProperty(path).row_id;
						oModel.read(url, {
							urlParameters: mParameters,
							success: function (oData, response) {
								viewModel.setProperty("/notesDetails/notesResults", oData.results);
								viewModel.setProperty("/modelChanged", true);
								oModel.setProperty(path + "/updkz", "U");
								var notesChangedPaths = viewModel.getProperty("/notesChangedPaths");
								if (!notesChangedPaths) {
									notesChangedPaths = [];
								}
								notesChangedPaths.push(path);
								notesChangedPaths = _.uniq(notesChangedPaths);
								viewModel.setProperty("/notesChangedPaths", notesChangedPaths);
							}
						});
					},
					error: function (oData, response) {

					}
				});
			}
		},

		getMainTableSelectedRows: function (control) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			var oTable = oController.getResponsiveSplitter(control).getMainContent()[0].getTable();
			var selectedRows = [], rowIDs = [], selectionMode, locked = false, disabled = false;
			if (oTable.getSelectedIndices) {
				var selectedIndices = oTable.getSelectedIndices();
				_.each(selectedIndices, function (index) {
					selectedRows.push(oTable.getContextByIndex(index));
					if (oModel.getProperty(oTable.getContextByIndex(index).getPath().edtst == '2')) {
						locked = true;
					} if (oModel.getProperty(oTable.getContextByIndex(index).getPath().edtst == ' ')) {
						disabled = true;
					}
				});
			} else {
				var selectedItems = oTable.getSelectedItems();
				_.each(selectedItems, function (item) {
					selectedRows.push(item.getBindingContext());
					if (item.getBindingContext().getPath().edtst == '2') {
						locked = true;
					}
					if (item.getBindingContext().getPath().edtst == ' ' || item.getBindingContext().getPath().edtst == '') {
						disabled = true;
					}
				});
			}
			if (selectedRows.length > 0) {
				_.each(selectedRows, function (context) {
					if (context && context.getPath) {
						var rowId = oModel.getProperty(context.getPath()).row_id;
						rowIDs.push(rowId);
					}
				});
			}
			if (selectedRows.length > 1)
				selectionMode = "Multi";
			else
				selectionMode = "Single";
			return { rowIDs: rowIDs.toString(), mode: selectionMode, lock: locked, paths: selectedRows, disable: disabled };
		},

		matchSectionPrepare: function (matchEntities, itemTabBar) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var oMatchPathMenu = new sap.m.Menu();
			var oToolsMenu = new sap.m.Menu();
			var oMatchPaths = [];
			itemTabBar.getItems()[2].removeAllContent();
			var oEntitySet, oEntityType, matchResultSelectEnabled;
			var viewModel = oController.getView().getModel("viewModel");

			viewModel.setProperty("/matchDetails", {});

			var mainTableSelectedPath = viewModel.getProperty("/mainTableSelectedPath");
			var mainTableSelectedRowData = oModel.getProperty(mainTableSelectedPath);
			if (mainTableSelectedRowData.edtst !== "1") {
				matchResultSelectEnabled = false;
			} else {
				matchResultSelectEnabled = true;
			}

			viewModel.setProperty("/matchDetails/enabled", matchResultSelectEnabled);

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

			if (oMatchPaths.length > 0) {
				viewModel.setProperty("/matchDetails/matchPaths", oMatchPaths);
			}

			var oControl = new sap.m.VBox().addStyleClass("sapUiSmallMarginTop");

			oEntitySet = oMetaModel.getODataEntitySet(matchEntities[0]);
			if (oEntitySet && oEntitySet.entityType) {
				var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
			}
			var thldpProp = oEntityType.property.find(function (prop) {
				return prop.name === "thldp"
			});
			var oMenuButton;
			if (thldpProp) {
				oToolsMenu.addItem(new sap.m.MenuItem({
					text: {
						parts: [{ path: "viewModel>/matchDetails/hdrProp/thldp" }, { path: "i18n>CONFIDENCE" }],
						formatter: function (thldp, text) {
							return text + ": " + thldp + "%"
						}
					},
					press: oController.onMatchTresholdChange.bind(oController)
				}));
				oToolsMenu.addItem(new sap.m.MenuItem({
					icon: "sap-icon://sys-find",
					text: { path: "i18n>FIND" },
					press: oController.openMatchToolsDialog.bind(oController)
				}));
				oMenuButton = new sap.m.MenuButton({
					text: { path: "i18n>TOOLS" },
					menu: oToolsMenu,
					type: sap.m.ButtonType.Transparent,
				});
			} else {
				oMenuButton = new sap.m.Button({
					icon: "sap-icon://sys-find",
					tooltip: { path: "i18n>FIND" },
					type: sap.m.ButtonType.Transparent,
					press: oController.openMatchToolsDialog.bind(oController)
				});
			}


			var oToolbar = new sap.m.Toolbar({
				content: [
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
					oMenuButton
					//					new sap.m.Button({
					//					icon: "sap-icon://compare",
					//					text: {path:"i18n>TOOLS"},
					//					type: sap.m.ButtonType.Transparent,
					//					press: oController.openMatchToolsDialog.bind(oController)
					//					})
				]
			});

			oControl.addItem(oToolbar);

			itemTabBar.getItems()[2].addContent(oControl);

			//			oMatchPathMenu.getItems()[0].firePress();

		},
		matchPathSelect: function (oEvent) {
			var oController = this;
			var oSource = oEvent.getSource();
			var oMatchPathData = oSource.data();

			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();

			var itemTabBar = sap.ui.getCore().getElementById(oMatchPathData.tabBarId);
			var viewModel = oController.getView().getModel("viewModel");

			var previousHeaderEntity = viewModel.getProperty("/matchDetails/headerEntity");
			var previousmatchGroupKey = viewModel.getProperty("/matchDetails/matchGroupKey");

			var bundle = oController.getView().getModel("i18n").getResourceBundle();

			var oEntitySet, oEntityType, oTargetEntity;

			oEntityType = oMetaModel.getODataEntityType(oMatchPathData.entityType);

			if (oEntityType["vui.bodc.MatchGroup"] && oMatchPathData.source == "mPath") {
				oSource.getParent().getParent().getParent().getParent().getContent()[1].getItems()[0].setVisible(true);
				oSource.getParent().getParent().getParent().getParent().getContent()[1].getItems()[1].setVisible(true);
				oSource.getParent().getParent().setText(oSource.getText());

				var oMatchGroups = oEntityType["vui.bodc.MatchGroup"][0].MatchGroup;
				var oMatchGroupMenu = oSource.getParent().getParent().getParent().getParent().getContent()[1].getItems()[1].getMenu();
				oMatchGroupMenu.removeAllItems();
				for (var i = 0; i < oMatchGroups.length; i++) {
					oMatchGroupMenu.addItem(new sap.m.MenuItem({
						text: oMatchGroups[i].String.split("__")[1],
						press: oController.matchPathSelect.bind(oController)
					}).data({
						name: oMatchPathData.name,
						entityType: oMatchPathData.entityType,
						tabBarId: oMatchPathData.tabBarId,
						mGroupKey: oMatchGroups[i].String.split("__")[0],
						source: "mGroup"
					}));
				}
				oMatchGroupMenu.getItems()[0].firePress();
				return;
			} else if (oMatchPathData.source == "mPath") {
				oSource.getParent().getParent().getParent().getParent().getContent()[1].getItems()[0].setVisible(false);
				oSource.getParent().getParent().getParent().getParent().getContent()[1].getItems()[1].setVisible(false);
				oSource.getParent().getParent().getParent().getParent().getContent()[1].getItems()[1].getMenu().removeAllItems();
			}

			if (previousHeaderEntity != oMatchPathData.entityType || oMatchPathData.source == "mGroup") {
				if (oMatchPathData.source == "mGroup") {
					if (previousmatchGroupKey == oMatchPathData.mGroupKey) {
						return;
					} else {
						viewModel.setProperty("/matchDetails/matchGroupKey", oMatchPathData.mGroupKey);
					}
				} else {
					viewModel.setProperty("/matchDetails/matchGroupKey", "");
				}
				var oMenuButton = oSource.getParent().getParent();
				oMenuButton.setText(oSource.getText());
				viewModel.setProperty("/matchDetails/headerEntity", oMatchPathData.entityType);
				viewModel.setProperty("/matchDetails/headerEntityName", oMatchPathData.name);
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
								thldp: parseInt(oData.results[0].thldp)
							};
						} else if (oData.results[0].pmprc) {
							hdrProp = {
								mpath: oData.results[0].pmprc
							};
						}
						viewModel.setProperty("/matchDetails/hdrProp", hdrProp);
						viewModel.setProperty("/matchDetails/hdrDetails", oData.results[0]);

						if (oEntityType.navigationProperty && oEntityType.navigationProperty.length > 0) {
							for (var i = 0; i < oEntityType.navigationProperty.length; i++) {
								oTargetEntity = oMetaModel.getODataEntityType(oMetaModel.getODataAssociationEnd(oEntityType, oEntityType.navigationProperty[i].name).type);
								if (oTargetEntity && oTargetEntity["vui.bodc.workspace.Match"]) {
									var oColumns = [], oTableEntity = oTargetEntity;
									var oLineItems = oTableEntity["vui.bodc.ResponsiveLineItem"];
									var columnListItemType = "Inactive";
									if (oTableEntity["vui.bodc.workspace.MatchSourceFields"]) {
										var tableData = [];
										_.each(oTableEntity["vui.bodc.workspace.MatchSourceFields"], function (item) {
											var sourceField = item.PropertyPath.split("/")[1];
											var targetField = item.PropertyPath.split("/")[3];
											var cellProperties = _.find(oTableEntity.property, { name: targetField });
											tableData.push({ "field": cellProperties["com.sap.vocabularies.Common.v1.Label"].String, "source": sourceField, "target": targetField });
										});
										viewModel.setProperty("/matchItemsData" + oTableEntity.name, tableData);
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
										]
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

									oTable.bindAggregation("items", "viewModel>/matchDetails/matchResults", function (sId, oContext) {
										var contextObject = oContext.getObject();
										var oCells = [], oContent;
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
											alignItems: "Center"
										});
										var title = "", subtitle = "", quickViewField, TitleField;
										var collectionField = oLineItems.find(function (obj) { return obj.RecordType == "com.sap.vocabularies.UI.v1.CollectionField" });
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
											oList.data("TableEntity", oTable.data("entity"));
											oList.data("row_id", contextObject.row_id);
											if (quickViewField.Quickview_Enitity) {
												oList.data("QuickviewEnitity", quickViewField.Quickview_Enitity.String);
											}
											if (quickViewField.HREF) {
												oList.data("HREF", quickViewField.HREF.Path);
											}
											oContent = new sap.m.VBox({//design
												items: [new sap.m.Label({
													text: "{viewModel>" + TitleField.Value.Path + "}",
													design: "Bold"
												}),
													oList
												]
											});

										} else {
											if (oTableEntity["com.sap.vocabularies.UI.v1.HeaderInfo"] && oTableEntity["com.sap.vocabularies.UI.v1.HeaderInfo"].Title) {
												title = "{viewModel>" + oTableEntity["com.sap.vocabularies.UI.v1.HeaderInfo"].Title.Value.Path + "}";
											}

											if (oTableEntity["com.sap.vocabularies.UI.v1.HeaderInfo"] && oTableEntity["com.sap.vocabularies.UI.v1.HeaderInfo"].Description) {
												subtitle = "{viewModel>" + oTableEntity["com.sap.vocabularies.UI.v1.HeaderInfo"].Description.Value.Path + "}";
											}
											oContent = new sap.m.ObjectIdentifier({
												title: title,
												text: subtitle,
												titleActive: false,
											}).addStyleClass("matchTitleObjectIdentifier");
										}
										//										oCells.push(oContent);
										var mtpctField = oLineItems.find(function (obj) { return obj.Value && obj.Value.Path == "mtpct" });
										if (mtpctField) {
											//										Radial Microchart
											oHBox.addItem(new sap.m.HBox({
												items: [oContent],
												width: "70%"
											}));

											//											oContent = new sap.suite.ui.microchart.RadialMicroChart({
											//												size: sap.m.Size.XS,
											//												percentage: parseFloat(contextObject.mtpct)													
											//											});
											oContent = new sap.m.RatingIndicator({
												iconSize: "12px",
												maxValue: 5,
												editable: false,
												value: {
													path: "viewModel>mtpct", formatter: function (mtpct) {
														var value;
														if (mtpct) {
															value = parseFloat(mtpct) / 20;
															return Math.round(value);
														} else {
															return 0;
														}
													}
												}
											}).addStyleClass("sapUiSmallMarginEnd");
											oHBox.addItem(new sap.m.HBox({
												items: [oContent],
											}));
										} else {
											oHBox.addItem(new sap.m.HBox({
												items: [oContent],
												width: "90%"
											}));
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

										var buttonLineItem = oLineItems.find(function (obj) { return obj.RecordType == "com.sap.vocabularies.UI.v1.DataFieldForAction" });
										oContent = new sap.m.Button({
											icon: sIcon,
											type: oButtonType,
											enabled: "{viewModel>/matchDetails/enabled}",
											press: oController.onMatchResultAction.bind(oController),
										}).data("Action", buttonLineItem.Action.String);

										oHBox.addItem(new sap.m.HBox({
											items: [oContent],
											width: "40px"
										}));
										oVBox.addItem(oHBox);

										var oAddressProp = oTableEntity.property.find(function (prop) {
											return prop.name === "adrln"
										});
										if (oAddressProp) {
											//											oVBox.addItem(new sap.m.Label({
											//											text: oAddressProp["com.sap.vocabularies.Common.v1.Label"].String + ":",
											//											design: sap.m.LabelDesign.Bold
											//											}));

											oHBox = new sap.m.HBox({
												width: "100%"
											}).addStyleClass("addressHBox sapUiTinyMarginTop");

											contextObject.adrln = contextObject.adrln.replace(new RegExp("/n", "g"), "\n");
											//											oContent = new sap.m.TextArea({
											//											value: "{viewModel>adrln}",
											//											width: "100%",												
											//											rows: contextObject.adrln.split("\n").length,												
											//											editable: false,
											//											wrapping: sap.ui.core.Wrapping.Off
											//											});
											oContent = new sap.m.Text({
												text: contextObject.adrln
											});
											oHBox.addItem(oContent);

											oVBox.addItem(oHBox);
										}
										if (oTableEntity["com.sap.vocabularies.UI.v1.Identification"]) {
											var oLeftItems = oTableEntity["com.sap.vocabularies.UI.v1.Identification"].filter(function (obj) { return !obj.Alignment || obj.Alignment.String == "L" || obj.Alignment.String == "" });
											var oRightItems = oTableEntity["com.sap.vocabularies.UI.v1.Identification"].filter(function (obj) { return obj.Alignment && obj.Alignment.String == "R" });
											var oForm = new sap.m.HBox().addStyleClass("sapUiTinyMarginTop");
											if (oLeftItems.length > 0) {
												var oItemsVBox = new sap.m.VBox();
												for (var i = 0; i < oLeftItems.length; i++) {
													var oItemHBox = new sap.m.VBox({
														wrappig: true
													});
													var oFieldProp = oTableEntity.property.find(function (prop) {
														return prop.name === oLeftItems[i].Value.Path
													});
													var sPath;
													if (oFieldProp.type == "Edm.DateTime") {
														sPath = "{path: 'viewModel>" + oLeftItems[i].Value.Path + "', formatter: 'zvui.work.controller.AnnotationHelper.getChangeDateFormat'}";
													} else if (oFieldProp["com.sap.vocabularies.Common.v1.Text"]) {
														switch (oFieldProp["com.sap.vocabularies.Common.v1.Text"]["com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember) {
															case "com.sap.vocabularies.UI.v1.TextArrangementType/TextLast":
																sPath = "{viewModel>" + oLeftItems[i].Value.Path + "}" + " {viewModel>" + oFieldProp["com.sap.vocabularies.Common.v1.Text"].Path + "}";
																break;
															case "com.sap.vocabularies.UI.v1.TextArrangementType/TextSeparate":
																sPath = "{viewModel>" + oLeftItems[i].Value.Path + "}";
																break;
															case "com.sap.vocabularies.UI.v1.TextArrangementType/TextOnly":
																sPath = "{viewModel>" + oFieldProp["com.sap.vocabularies.Common.v1.Text"].Path + "}";
																break;
															default:
																sPath = "{viewModel>" + oFieldProp["com.sap.vocabularies.Common.v1.Text"].Path + "} (" + "{viewModel>" + oLeftItems[i].Value.Path + "})";
														}
													} else {
														sPath = "{viewModel>" + oLeftItems[i].Value.Path + "}";
													}
													oItemHBox.addItem(new sap.m.Label({
														text: oFieldProp["com.sap.vocabularies.Common.v1.Label"].String + ": ",
														design: sap.m.LabelDesign.Bold
													}).addStyleClass("sapUiTinyMarginEnd"));
													oItemHBox.addItem(new sap.m.Text({
														text: sPath,
													}));
													oItemsVBox.addItem(oItemHBox);
												}
												if (oRightItems.length > 0) {
													oForm.addItem(new sap.m.HBox({ items: [oItemsVBox], width: "50%" }));
												} else {
													oForm.addItem(new sap.m.HBox({ items: [oItemsVBox] }));
												}
											}
											if (oRightItems.length > 0) {
												var oItemsVBox = new sap.m.VBox();
												for (var i = 0; i < oRightItems.length; i++) {
													var oItemHBox = new sap.m.VBox({
														wrappig: true
													});
													var oFieldProp = oTableEntity.property.find(function (prop) {
														return prop.name === oRightItems[i].Value.Path
													});
													oItemHBox.addItem(new sap.m.Label({
														text: oFieldProp["com.sap.vocabularies.Common.v1.Label"].String + ": ",
														design: sap.m.LabelDesign.Bold
													}).addStyleClass("sapUiTinyMarginEnd"));
													var sPath;
													if (oFieldProp.type == "Edm.DateTime") {
														sPath = "{path: 'viewModel>" + oRightItems[i].Value.Path + "', formatter: 'zvui.work.controller.AnnotationHelper.getChangeDateFormat'}";
													} else if (oFieldProp["com.sap.vocabularies.Common.v1.Text"]) {
														switch (oFieldProp["com.sap.vocabularies.Common.v1.Text"]["com.sap.vocabularies.UI.v1.TextArrangement"].EnumMember) {
															case "com.sap.vocabularies.UI.v1.TextArrangementType/TextLast":
																sPath = "{viewModel>" + oRightItems[i].Value.Path + "}" + " {viewModel>" + oFieldProp["com.sap.vocabularies.Common.v1.Text"].Path + "}";
																break;
															case "com.sap.vocabularies.UI.v1.TextArrangementType/TextSeparate":
																sPath = "{viewModel>" + oRightItems[i].Value.Path + "}";
																break;
															case "com.sap.vocabularies.UI.v1.TextArrangementType/TextOnly":
																sPath = "{viewModel>" + oFieldProp["com.sap.vocabularies.Common.v1.Text"].Path + "}";
																break;
															default:
																sPath = "{viewModel>" + oFieldProp["com.sap.vocabularies.Common.v1.Text"].Path + "} (" + "{viewModel>" + oRightItems[i].Value.Path + "})";
														}
													} else {
														sPath = "{viewModel>" + oRightItems[i].Value.Path + "}";
													}

													oItemHBox.addItem(new sap.m.Text({
														text: sPath,
													}));
													oItemsVBox.addItem(oItemHBox);
												}
												if (oLeftItems.length > 0) {
													oForm.addItem(new sap.m.HBox({ items: [oItemsVBox], width: "50%" }));
												} else {
													oForm.addItem(new sap.m.HBox({ items: [oItemsVBox] }));
												}
											}

											if (oLeftItems.length > 0 || oRightItems.length > 0) {
												oVBox.addItem(oForm);
											}
										}
										oCells.push(oVBox);

										return new sap.m.ColumnListItem({
											cells: oCells,
											type: columnListItemType
										});
									});

									if (itemTabBar.getItems()[2].getContent().length == 1) {
										itemTabBar.getItems()[2].addContent(new sap.m.VBox({
											items: [
												oTable
											]
										}));
									} else {
										itemTabBar.getItems()[2].getContent()[1].removeAllItems();
										itemTabBar.getItems()[2].getContent()[1].addItem(oTable);
									}
									viewModel.setProperty("/matchDetails/resultEntityName", oTableEntity.name.split("Type")[0]);

									oModel.read("/" + oTableEntity.name.split("Type")[0], {
										urlParameters: oController.readQueryPrepare(oTableEntity.name.split("Type")[0]),
										success: function (oData, response) {
											viewModel.setProperty("/matchDetails/matchResults", oData.results);
										}
									});
								}
							}
						}
					}
				});
			}

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
				oPopover = new sap.m.Popover({
					title: "{i18n>CONFIDENCETHRESHOLD}",
					placement: sap.m.PlacementType.Bottom,
					contentWidth: "300px",
					contentHeight: "80px",
					content: [
						new sap.m.Slider({
							value: "{viewModel>/matchDetails/hdrProp/thldp}",
							width: "80%",
							min: 0,
							max: 100,
							showAdvancedTooltip: true,
							showHandleTooltip: false
						}).addStyleClass("sapUiSmallMargin")
					]
				});
			}
			oPopover.data("source", oEvent.getSource());
			oPopover.attachBeforeClose(oController.onMatchTresholdPopoverClose.bind(oController));
			oController.getView().addDependent(oPopover);
			var oSource = oEvent.getSource().getParent().getParent();
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
								urlParameters: oController.readQueryPrepare(resultEntityName),
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
			var functionImport = oMetaModel.getODataFunctionImport(oSourceData.Action);
			var mainTableBindingInfo = viewModel.getProperty("/mainTableBindingInfo");
			var resultEntityName, entitySet, entityType;
			var urlParameters = {};

			if (fromMatchTool) {
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
			//			sap.ui.core.BusyIndicator.show(0);

			if (viewModel.getProperty("/matchToolFromHeader")) {
				urlParameters["header"] = true;
			}

			oModel.callFunction("/" + oSourceData.Action, {
				method: "POST",
				batchGroupId: "changes",
				urlParameters: urlParameters,
			});

			oModel.submitChanges({
				batchGroupId: "changes",
				success: function (oData, response) {
					//****				Patch 11 - For Header update call is required as sometimes snapping header value will also get change by changing any item data	
					if (viewModel.getProperty("/cuttentRoute") == 'DetailDetail') {
						var sPath = oController.getView().getContent()[0].getContent()[viewModel.getProperty("/currentDetailPageLevel")].getBindingContext().getPath();
						var entitySet = sPath.split("/")[sPath.split("/").length - 1].split("(")[0];
						oController.readPath(entitySet, sPath);
					}
					//****
					if (fromMatchTool) {
						oTable.getBinding("items").refresh();
						//						oTable.getBindingInfo("items").parameters.select = oTable.getBindingInfo("items").parameters.select + ",mqlfr";
						//						oTable.getBindingInfo("items").binding.refresh();

					} else {
						oModel.read("/" + resultEntityName, {
							urlParameters: oController.readQueryPrepare(resultEntityName),
							success: function (oData, response) {
								viewModel.setProperty("/matchDetails/matchResults", oData.results);
							}
						});
					}
					mainTableBindingInfo.binding.refresh();
					//					sap.ui.core.BusyIndicator.hide();
				},
				error: function (oData, response) {
					sap.ui.core.BusyIndicator.hide();
				}
			});
		},

		/*		onManualMatchResultAction: function(oEvent){
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			var oSourceData = oEvent.getSource().data();
			var oDataPath = oEvent.getSource().getParent().getBindingContextPath();
			var functionImport = oMetaModel.getODataFunctionImport(oSourceData.Action);
			var mainTableBindingInfo = viewModel.getProperty("/mainTableBindingInfo");
			var oTable = oEvent.getSource().getParent().getParent();
			var urlParameters = {};

			for(var i=0; i<functionImport.parameter.length; i++){
				if(functionImport.parameter[i].name === "_row_id"){
					urlParameters[functionImport.parameter[i].name] = oModel.getProperty(oDataPath + "/row_id");
				}else{
					urlParameters[functionImport.parameter[i].name] = oModel.getProperty(oDataPath + functionImport.parameter[i].name);
				}
			}

			oModel.callFunction("/" + oSourceData.Action, {
				method: "POST",
				batchGroupId: "changes",
				urlParameters: urlParameters,
			});

			oModel.submitChanges({
				batchGroupId: "changes",
				success : function(oData,response) {
					mainTableBindingInfo.binding.refresh();
					oTable.getBinding("items").refresh()
				},
				error : function(oData,response){
				}
			});
		},*/
		//***** functions related to visual filter bar and visual filter dialog --- start

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
								//								VFDialogModel.setProperty(selectedPath + "/chartContent/chartType",filterData[i]["defaultChart"]);
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
										//										VFDialogModel.setProperty(selectedPath + "/chartContent/chartType",filterData[i]["defaultChart"]);
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
			var currentRoute = viewModel.getProperty("/cuttentRoute");
			var oFilterBar;
			if (currentRoute == "DetailDetail") {
				oFilterBar = oController.getView().getContent()[0].getContent()[viewModel.getProperty("/currentDetailPageLevel")].getHeaderContent()[0].getContent()[0].getItems()[0];
			} else {
				oFilterBar = oController.getView().getContent()[0].getContent()[0].getHeaderContent()[0].getContent()[0].getItems()[0];
			}
			if (oEvent.getParameter("key") !== "*standard*") {
				var VFDialogModel = oController.getView().getModel("VFDialogModel");
				var functionImport = oModel.getMetaModel().getODataFunctionImport("VAR_READ");
				var urlParameters = {};

				urlParameters["wstyp"] = window.workspaceType;
				urlParameters["wspvw"] = window.workspaceView;
				urlParameters["vname"] = oSource._getVariantText();
				urlParameters["sectn"] = "";
				urlParameters["sumry"] = "";
				if (oSource._getSelectedItem()) {
					urlParameters["public"] = oSource._getSelectedItem().getProperty("global");
				}
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
				//				var oFilterBar = oEvent.getSource().getParent().getParent().getHeaderContent()[0].getItems()[0].getContent()[0].getItems()[0];
				VFModel.setProperty("/VFData", $.extend(true, {}, VFModel.getProperty("/standardVariantVFData")));
				if (viewModel.getProperty("/navigationFilterData")) {
					oController.setFilterBarInitialData(oFilterBar);
				}
			}
		},

		onFilterChange: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var VFModel = oController.getView().getModel("VFModel");
			var VFDialogModel = oController.getView().getModel("VFDialogModel");
			var oSource = oEvent.getSource();
			if (oEvent.getParameters().getParameter) {
				var characteristic = oEvent.getParameters().getParameter("filterChangeReason");
				var filterItem = oEvent.getParameters().getSource(), count, filterData, selectedNode, selectedNodeIndex, buttonText;
			}
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
			var viewModel = oController.getView().getModel("viewModel");
			var key = oEvent.getParameter("item").getKey();
			var entityName = oEvent.getSource().data("entityName");
			viewModel.setProperty("/" + entityName + "filterMode", key);
		},
		onAdaptFilterPress: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var VFModel = oController.getView().getModel("VFModel");
			var VFDialogModel = new JSONModel();
			var VFData = $.extend(true, {}, VFModel.getProperty("/VFData"));
			VFDialogModel.setProperty("/VFData", VFData);
			var ValueHelpDialog = sap.ui.xmlfragment("zvui.work.fragment.AdaptFiltersDialog", oController);
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
			var viewModel = oController.getView().getModel("viewModel");
			var filterId = oEvent.getSource().data("filterId");
			var filterBar = oController.getView().byId(filterId);
			filterBar.fireSearch();
		},
		onVFDialogSearch: function (oEvent) {
			var oController = this;
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
			var viewModel = oController.getView().getModel("viewModel");
			var VFModel = oController.getView().getModel("VFModel");
			var VFDialogModel = oController.getView().getModel("VFDialogModel");
			var source = oEvent.getSource();
			source.getParent().close()
		},
		onAdaptFilterDialogRestorePress: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var VFModel = oController.getView().getModel("VFModel");
			var VFDialogModel = oController.getView().getModel("VFDialogModel");
			var VFData = $.extend(true, {}, VFModel.getProperty("/VFData"));
			VFDialogModel.setProperty("/VFData", VFData);
		},
		onAdaptFilterDialogSavePress: function (oEvent) {
			var oController = this;
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
							oControl.setShowValueHelp(false);
						}
					}
				}
			}
			if (filterEntity == "WorkspaceView_SR") {
				viewModel.setProperty("/filterBarInitialized", true)
				if (viewModel.getProperty("/visualFilterInitialized") == "1") {
					oController.initializeVisualFilter(oSource);
				}
			} else {
				oController.initializeVisualFilter(oSource);
			}
		},
		initializeVisualFilter: function (oFilterBar) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var oSource = oFilterBar;
			var VFModel = oController.getView().getModel("VFModel");
			var filterEntity = oSource.getEntitySet();
			var filterEntitySet = oMetaModel.getODataEntitySet(filterEntity);
			var filterEntityType = oMetaModel.getODataEntityType(filterEntitySet.entityType);
			if (!filterEntityType || !filterEntityType["vui.bodc.SummaryFieldKeyfigure"]) {
				return;
			}
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
						//						VFDataEntry["deflt"] = chartproperty["deflt"];
						VFDataEntry["deflt"] = "X";
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
			//			var toEntity = oMetaModel.getODataAssociationEnd(filterEntityType,chartsData[i].fltent);
			//			var toEntityType = oMetaModel.getODataEntityType(toEntity.type);
			//			var keyfigProperty = _.find(toEntityType.property,{name:chartsData[i].measureBy.selected});
			//			var unitsFilterItem = oSource._getFilterItemByName(chartsData[i]["fltent"] + "." + keyfigProperty["sap:unit"]);
			//			if(!unitsFilterItem.getControl().data("name")){
			//			unitsFilterItem.getControl().addCustomData(new sap.ui.core.CustomData({key:"name",value:unitsFilterItem.getName()}));
			//			}
			//			if(!unitsFilterItem.getControl().data("keyFig")){
			//			unitsFilterItem.getControl().addCustomData(new sap.ui.core.CustomData({key:"keyFig",value:chartsData[i].measureBy.selected}));
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
						if (oData.vf_data) {
							var VFData = JSON.parse(decodeURIComponent(oData.vf_data));
							if (VFData) {
								VFModel.setProperty("/VFData", VFData);
							}
							if (viewModel.getProperty("/navigationFilterData")) {
								oController.setFilterBarInitialData(oSource);
							}
							console.log("Variant Read Successful");
						}
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

		//***** functions related to visual filter bar and visual filter dialog --- end

		onDSCSegmentedButtonChange: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var selectedKey = oEvent.getSource().getKey();
			//			var dynamicSideContent = oController.getDynamicSideContent(oEvent.getSource());
			var dynamicSideContent = oController.getResponsiveSplitter(oEvent.getSource());
			//			oController.DSCID = dynamicSideContent.getId();
			oController.DSCID = dynamicSideContent.content.getId();
			//			if(selectedKey === "details" || selectedKey === "codes"){
			//			dynamicSideContent.setEqualSplit(false);
			//			}else{
			//			dynamicSideContent.setEqualSplit(true);
			//			}
			if (!viewModel.getProperty("/disp_only")) {
				if (selectedKey === "details" && !oController.allRowsLocked) {
					dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[0].setVisible(false);
					//					dynamicSideContent.getSideContent()[0].getItems()[1].addStyleClass("vistex-display-none");
				} else {
					dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[0].setVisible(true);
					//					dynamicSideContent.getSideContent()[0].getItems()[1].removeStyleClass("vistex-display-none");
				}
			}
			if (!oController.allRowsLocked && selectedKey === "details" && dynamicSideContent.getMainContent()[0].getTable().getSelectedIndices().length > 1) {

				if (dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[1]) {
					dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[1].setVisible(true);
				}
				if (dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[2]) {
					dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[2].setVisible(true);
				}
				if (dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[3]) {
					dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[3].setVisible(true);
				}
			} else {
				if (dynamicSideContent.getMainContent()[0].getTable().getSelectedIndices().length == 1) {
					dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[0].setVisible(false);
				}
				if (dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[1]) {
					dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[1].setVisible(false);
				}
				if (dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[2]) {
					dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[2].setVisible(false);
				}
				if (dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[3]) {
					dynamicSideContent.getSideContent()[0].getItems()[1].getContent()[3].setVisible(false);
				}
			}

			if (selectedKey === "matchDialog") {
				if (oController._oMatchDialog) {
					oController._oMatchDialog.removeAllContent();
					delete oController._oMatchDialog;
				}
				oController._oMatchDialog = sap.ui.jsfragment("zvui.work.fragment.MatchDialog", oController);
				oController.getView().addDependent(oController._oMatchDialog);
				oController._oMatchDialog.open();
			} else if (selectedKey === "match") {
				dynamicSideContent.getSideContent()[0].getItems()[2].getContent()[0].getItems()[2].
					getContent()[0].getItems()[0].getContent()[0].getItems()[1].getMenu().getItems()[0].firePress();
				viewModel.setProperty("/DSCSegmentedButtonSelectedKey", selectedKey);
			} else if (selectedKey === "codes") {
				oController.onCodesSectionPrepare(oEvent);
				viewModel.setProperty("/DSCSegmentedButtonSelectedKey", selectedKey);
			} else if (selectedKey === "notes") {
				var entityName = oEvent.getSource().data().entityName;
				var itemTabBarId = oEvent.getSource().data().itemTabBarId;
				var selectedPath = oEvent.getSource().data().selectedPath;
				oController.noteSectionPrepare(entityName, itemTabBarId, selectedPath);
				viewModel.setProperty("/DSCSegmentedButtonSelectedKey", selectedKey);
			} else {
				viewModel.setProperty("/DSCSegmentedButtonSelectedKey", selectedKey);
			}
		},
		onManualMatchFilterInitialized: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var oSource = oEvent.getSource();
			var entitySet = oMetaModel.getODataEntitySet(oSource.getEntitySet());
			var entityType = oMetaModel.getODataEntityType(entitySet.entityType);
			var manualMatchMapping, DSCSource;
			if (viewModel.getProperty("/matchToolFromHeader")) {
				manualMatchMapping = entityType["vui.bodc.workspace.PymtMatchSourceFields"];
				var headerPath = viewModel.getProperty("/detailDetailHeaderPath");
				DSCSource = oModel.getProperty(headerPath);
			} else {
				manualMatchMapping = entityType["vui.bodc.workspace.ManualMatchMapping"];
				DSCSource = oModel.getProperty(oController.DSCSourcePath);
			}
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
			var currentRoute = viewModel.getProperty("/cuttentRoute");
			var flexibleColumnLayout = oController.getOwnerComponent().getRootControl().byId("idAppControl");
			if (currentRoute == "Detail") {
				content = oController.getView();
			} else if (currentRoute == "DetailDetail") {
				content = flexibleColumnLayout.getCurrentMidColumnPage().getContent()[0].getContent()[viewModel.getProperty("/currentDetailPageLevel")];
			} else {
				return;
			}
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
								aMainContent[y].invalidate();
								oController.refreshSmartTable(aMainContent[y]);
							}
						}
					} else if (oController.isControlOfType(oControl, "sap/ui/layout/ResponsiveSplitter")) {
						var aMainContent = oControl.getRootPaneContainer().getPanes()[0].getContent().getContent()[0].getContent();
						for (var y = 0; y < aMainContent.length; y++) {
							if (oController.isSmartTable(aMainContent[y])) {
								aMainContent[y].invalidate();
								oController.checkIsSummaryGroupTable(aMainContent[y].getEntitySet());
								oController.refreshSmartTable(aMainContent[y]);
								// Total and Average changes in analytical table --Start
								if (!aMainContent[y].data("columnSelectAttached") && aMainContent[y].getTable().attachColumnSelect) {
									aMainContent[y]
										.getTable()
										.attachColumnSelect(
											oController.onTableColumnSelect.bind(oController)
										);
									aMainContent[y].data("columnSelectAttached", true);
								}
								// Total and Average changes in analytical table --End
							} else if (oController.isControlOfType(aMainContent[y], "sap/ui/table/Table")) {
								oController.refreshSmartTable(aMainContent[y]);
							}
						}
					} else if (oController.isSmartTable(oControl)) {
						oControl.invalidate();
						oController.checkIsSummaryGroupTable(oControl.getEntitySet());
						oController.refreshSmartTable(oControl);
						// Total and Average changes in analytical table --Start
						if (
							!oControl.data("columnSelectAttached") &&
							oControl.getTable().attachColumnSelect
						) {
							oControl
								.getTable()
								.attachColumnSelect(
									oController.onTableColumnSelect.bind(oController)
								);
							oControl.data("columnSelectAttached", true);
						}
						// Total and Average changes in analytical table --End
					}
				}
			}
		},
		// Total and Average changes in analytical table --Start
		onTableColumnSelect: function (oEvent) {
			var oController = this;
			//			if(oEvent.getParameter("column") && oEvent.getParameter("column").getMenu){
			//				oEvent.getParameter("column").getMenu()._addFilterMenuItem = function(){
			//					//removing filter from column menu
			//				}
			//			}
			var viewModel = oController.getView().getModel("viewModel");
			viewModel.setProperty("/skipBusyIndicator", true);
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();

			if (
				oEvent.getParameter("column") &&
				oEvent.getParameter("column").getMenu
			) {
				var oColumn = oEvent.getParameter("column");
				var oTable = oEvent.getSource();
				var oSmarTable = oTable.getParent();
				var oEntity = oSmarTable.getEntitySet();
				if (!viewModel.getProperty("/footerData_" + oEntity)) {
					viewModel.setProperty("/footerData_" + oEntity, { data: [] });
				}
				var oEntityType = oMetaModel.getODataEntityType(
					oMetaModel.getODataEntitySet(oEntity).entityType
				);
				var oColumnKey = oColumn.data("p13nData").columnKey;
				if (
					oColumnKey &&
					oEntityType["vui.bodc.workspace.AggregationField"] &&
					oEntityType["vui.bodc.workspace.AggregationField"].length > 0
				) {
					var oField = oEntityType[
						"vui.bodc.workspace.AggregationField"
					].find(function (obj) {
						return obj.String.split("/")[0] == oColumnKey;
					});
					if (oField) {
						var oFieldProperties = oMetaModel.getODataProperty(
							oEntityType,
							oField.String.split("/")[0]
						);
						if (oFieldProperties) {
							oColumn.getMenu().onAfterRendering = function (oEvent) {
								if (oEvent && oEvent.srcControl) {
									var oMenu = oEvent.srcControl;
									var existingItems = oMenu.getItems();
									if (!oMenu.data("actionsAdded")) {
										if (
											oField.String.split("/")[1] == "X" ||
											oField.String.split("/")[1] == "1"
										) {
											oMenu.addItem(
												new sap.ui.unified.MenuItem({
													text: "{i18n>TOTAL}",
													tooltip: "{i18n>TOTAL}",
													select: [oController.onAggrAction, oController],
													customData: [
														new sap.ui.core.CustomData({
															key: "entity",
															value: oEntity,
														}),
														new sap.ui.core.CustomData({
															key: "field",
															value: oColumnKey,
														}),
														new sap.ui.core.CustomData({
															key: "tableId",
															value: oSmarTable.getId(),
														}),
														new sap.ui.core.CustomData({
															key: "text",
															value:
																oFieldProperties[
																"com.sap.vocabularies.Common.v1.Label"
																]["String"],
														}),
														new sap.ui.core.CustomData({
															key: "operation",
															value: "total",
														}),
													],
												})
											);
										}
										if (
											oField.String.split("/")[1] == "X" ||
											oField.String.split("/")[1] == "2"
										) {
											oMenu.addItem(
												new sap.ui.unified.MenuItem({
													text: "{i18n>AVERAGE}",
													tooltip: "{i18n>AVERAGE}",
													select: [oController.onAggrAction, oController],
													customData: [
														new sap.ui.core.CustomData({
															key: "entity",
															value: oEntity,
														}),
														new sap.ui.core.CustomData({
															key: "field",
															value: oColumnKey,
														}),
														new sap.ui.core.CustomData({
															key: "tableId",
															value: oSmarTable.getId(),
														}),
														new sap.ui.core.CustomData({
															key: "text",
															value:
																oFieldProperties[
																"com.sap.vocabularies.Common.v1.Label"
																]["String"],
														}),
														new sap.ui.core.CustomData({
															key: "operation",
															value: "average",
														}),
													],
												})
											);
										}
										oMenu.data("actionsAdded", true);
									} else {
										if (!oTable.getFooter()) {
											var totalMenuItem = existingItems.find(function (obj) {
												return obj.data("operation") == "total";
											});
											if (totalMenuItem && totalMenuItem.setIcon) {
												totalMenuItem.setIcon("");
												totalMenuItem.data("selected", false);
											}
											var avgMenuItem = existingItems.find(function (obj) {
												return obj.data("operation") == "average";
											});
											if (avgMenuItem && avgMenuItem.setIcon) {
												avgMenuItem.setIcon("");
												avgMenuItem.data("selected", false);
											}
										} else {
											var footerData = viewModel.getProperty(
												"/footerData_" + oEntity + "/data"
											);
											if (footerData && footerData.length > 0) {
												var totalMenuItem = existingItems.find(function (
													obj
												) {
													return obj.data("operation") == "total";
												});
												if (totalMenuItem) {
													var totalExists = footerData.find(function (obj) {
														if (
															obj.column == totalMenuItem.data("field") &&
															obj.operation == "total"
														) {
															return obj;
														}
													});
													if (!totalExists) {
														totalMenuItem.setIcon("");
														totalMenuItem.data("selected", false);
													} else {
														totalMenuItem.setIcon("sap-icon://accept");
														totalMenuItem.data("selected", true);
													}
												}
												var avgMenuItem = existingItems.find(function (obj) {
													return obj.data("operation") == "average";
												});
												if (avgMenuItem) {
													var avgExists = footerData.find(function (obj) {
														if (
															obj.column == totalMenuItem.data("field") &&
															obj.operation == "average"
														) {
															return obj;
														}
													});
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
							};
						}
					}
				}
			}
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
			var oSmartTable = sap.ui
				.getCore()
				.getElementById(oSource.data("tableId"));
			var oTable = oSmartTable.getTable();
			if (!oSource.data("selected")) {
				var AggregateEntityType = oMetaModel.getODataEntityType(
					oMetaModel.getODataEntitySet("Aggregate_Data").entityType
				);
				if (AggregateEntityType) {
					var urlParameters = {};
					urlParameters["field"] = field;
					urlParameters["operation"] = operation;
					urlParameters["entity"] = oEntity;
					sap.ui.core.BusyIndicator.show(0);
					oModel.read("/" + "Aggregate_Data", {
						urlParameters: urlParameters,
						success: function (oData, response) {
							if (oData.results && oData.results.length > 0) {
								var footerData = viewModel.getProperty(
									"/footerData_" + oEntity + "/data"
								);
								footerData.push({
									column: field,
									label: text,
									operation: operation,
									value: oData.results[0].agg_val,
								});
								viewModel.setProperty("/footerData_" + oEntity + "/data", []);
								viewModel.setProperty(
									"/footerData_" + oEntity + "/data",
									footerData
								);
								if (!oTable.getFooter()) {
									var footerText = new sap.m.Text({
										wrapping: true,
										text: {
											parts: [
												{
													path: "viewModel>/footerData_" + oEntity + "/data",
												},
											],
											formatter: function (values) {
												var text = "";
												if (values && values.length > 0) {
													values.forEach(function (obj, index) {
														if (obj.operation == "total") {
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
													// CI#21066->Total and Average are not working properly->Ready For Topic Owner Review  --Start
													viewModel.setProperty("/footerData_" + oEntity + "/data", []);
													// CI#21066->Total and Average are not working properly->Ready For Topic Owner Review  --End
												}
												return text;
											},
										},
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
						},
					});
				}
			} else {
				var footerData = viewModel.getProperty(
					"/footerData_" + oEntity + "/data"
				);
				var selectedProp = footerData.filter(function (obj) {
					if (obj.column != field || obj.operation != operation) {
						return obj;
					}
				});
				// CI#21066->Total and Average are not working properly->Ready For Topic Owner Review  --Start
				// viewModel.setProperty("/footerData_" + oEntity + "/data", []);
				// CI#21066->Total and Average are not working properly->Ready For Topic Owner Review  --End
				if (selectedProp.length == 0) {
					oTable.destroyFooter();
					oTable.destroyFooter();
					// CI#21066->Total and Average are not working properly->Ready For Topic Owner Review  --Start
					viewModel.setProperty("/footerData_" + oEntity + "/data", []);
					// CI#21066->Total and Average are not working properly->Ready For Topic Owner Review  --End
				} else {
					viewModel.setProperty(
						"/footerData_" + oEntity + "/data",
						selectedProp
					);
				}
				oSource.setIcon("");
				oSource.data("selected", false);
			}
		},
		// Total and Average changes in analytical table --End
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
			var viewModel = oController.getView().getModel("viewModel");
			var urlParameters = {}, rowIDs = [], facetParentTable, selectedRows = [];
			var currentRoute = viewModel.getProperty("/cuttentRoute");
			var content, sections, showingSideContent;
			content = oController.getView();
			var flexibleColumnLayout = oController.getOwnerComponent().getRootControl().byId("idAppControl");
			if (currentRoute == "Detail") {
				content = oController.getView();
			} else if (currentRoute == "DetailDetail") {
				content = flexibleColumnLayout.getCurrentMidColumnPage().getContent()[0].getContent()[viewModel.getProperty("/currentDetailPageLevel")];
			}
			while (!content.getSections) {
				content = content.getContent()[0];
			}
			var sections = content.getSections();
			var oEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(updatedEntityName).entityType);
			if (oEntityType["vui.bodc.workspace.CodesEditable"]) {
				facetParentTable = oController.getFacetParentTable(updatedEntityName);
			} else {
				facetParentTable = oController.getFacetParentTable(updatedEntityName, true);
				showingSideContent = viewModel.getProperty("/" + updatedEntityName + "showingSideContent");
				if (facetParentTable) {
					if (!showingSideContent) {
						oModel.read(changedPath, {
							_refresh: true,
							urlParameters: oController.readQueryPrepare(updatedEntityName)
						});

						//****					Patch 11 - For Header update call is required as sometimes snapping header value will also get change by changing any item data	
						if (viewModel.getProperty("/cuttentRoute") == 'DetailDetail') {
							var sPath = flexibleColumnLayout.getCurrentMidColumnPage().getContent()[0].getContent()[viewModel.getProperty("/currentDetailPageLevel")].getBindingContext().getPath();
							var entitySet = sPath.split("/")[sPath.split("/").length - 1].split("(")[0];
							oController.readPath(entitySet, sPath);
						}
						//****
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
				//****			Patch 11 - For Header update call is required as sometimes snapping header value will also get change by changing any item data	
				if (viewModel.getProperty("/cuttentRoute") == 'DetailDetail') {
					var sPath = flexibleColumnLayout.getCurrentMidColumnPage().getContent()[0].getContent()[viewModel.getProperty("/currentDetailPageLevel")].getBindingContext().getPath();
					var entitySet = sPath.split("/")[sPath.split("/").length - 1].split("(")[0];
					oController.readPath(entitySet, sPath);
				}
				//****
				if (selectedRows && selectedRows.length == 1) {
					var selectedPath = selectedRows[0].getPath();
					var sEntitySet = facetParentTable.getEntitySet();
					var row_id = oModel.getProperty(selectedPath).row_id;
					var correction_row_id;
					if (oController.correction_row_id && oController.correction_row_id[sEntitySet] &&
						oController.correction_row_id[sEntitySet][row_id]) {
						correction_row_id = oController.correction_row_id[sEntitySet][row_id];
						selectedPath = selectedPath.replace(row_id, correction_row_id);
					}
					oModel.read(selectedPath, {
						_refresh: true,
						urlParameters: oController.readQueryPrepare(facetParentTableEntityName)
					});
				} else {
					oController.refreshSmartTable(facetParentTable, true);
				}
				//				oModel.read(changedPath,{
				//				_refresh: true
				//				});
				if (oEntityType["vui.bodc.workspace.CodesEditable"]) {
					//					var dynamicSideContent = oController.getDynamicSideContent(facetParentTable);
					var dynamicSideContent = oController.getResponsiveSplitter(facetParentTable);
					var codes = dynamicSideContent.getSideContent()[0].getItems()[2].getContent()[0].getItems()[1].getContent();
					for (var i = 0; i < codes.length; i++) {
						if (codes[i].getEntitySet) {
							codes[i].rebindList();
						} else if (codes[i].data().refresh) {
							codes[i].getBindingInfo("items").binding.refresh()
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
				if (!oMetaModel.getODataEntitySet(entityName)) {
					oModel = oController.getOwnerComponent().getModel();
				}
			}
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			var content, sections, tableEntityName, facetTableEntityName, facetParentTable;
			var currentRoute = viewModel.getProperty("/cuttentRoute");
			var flexibleColumnLayout = oController.getOwnerComponent().getRootControl().byId("idAppControl");
			if (currentRoute == "Detail") {
				content = oController.getView();
			} else if (currentRoute == "DetailDetail") {
				content = flexibleColumnLayout.getCurrentMidColumnPage().getContent()[0].getContent()[viewModel.getProperty("/currentDetailPageLevel")];
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
		onDrilldownButtonActionChange: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var data = oEvent.getSource().data();
			viewModel.setProperty("/navigateActionType", data.Action);
			viewModel.setProperty("/navigateAction_" + data.entitySet, data.Action);
		},
		onShowSectionInPopover: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oData = oEvent.getSource().data();
			var oModel = oController.getOwnerComponent().getModel();
			var oMetaModel = oModel.getMetaModel();
			var oSource = oEvent.getSource();
			var sEntitySet = oData.entitySet;
			var oEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(sEntitySet).entityType);
			oController.removeTransientMessages();
			var errorMessages = oController.checkErrorMessageExist(oModel);
			var content = oEvent.getSource();
			while (!content.getTable) {
				content = content.getParent();
			}
			var controlId = content.getId();

			if (errorMessages) {
				oController.showMessagePopover(oController.messageButtonId);
				return;
			} else {
				var path = oEvent.getSource().getBindingContext().getPath();
				viewModel.setProperty("/sectionPopover", { open: true, entitySet: oData.targetEntity });
				viewModel.setProperty("/skipHideBusyIndicatorOnBatchComplete", true);
				sap.ui.core.BusyIndicator.show(0);
				if (oController.popoverSection && oController.popoverSection.content.isOpen()) {
					oController.popoverSection.content.close();
				}
				var popoverTitle = oModel.getProperty(path)[oEntityType["com.sap.vocabularies.UI.v1.HeaderInfo"].Title.Value.Path];
				if (!oController.popoverSection || oController.popoverSection.entitySet !== oData.targetEntity) {
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
					oEntities[oListEntityType.name] = "Responsive";
					hierarchyModel.setProperty("/entities", oEntities);
					viewModel.setProperty("/entities", oEntities);
					var oEntitySetContext = oMetaModel.createBindingContext(oMetaModel.getODataEntitySet(sEntitySet, true));
					var oEntityTypeContext = oMetaModel.createBindingContext(oEntityType.$path);
					var oFacetsContext = oMetaModel.createBindingContext(oEntityType.$path + "/com.sap.vocabularies.UI.v1.Facets");
					var oFacetContext = oMetaModel.createBindingContext(oEntityType.$path + "/com.sap.vocabularies.UI.v1.Facets/" + facetPath);
					window.fromPopoverSection = true;
					var oFragment = XMLTemplateProcessor.loadTemplate("zvui.work.fragment.SmartTablePopover", "fragment");
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
						oController.popoverSection = {};
						oController.popoverSection.entitySet = oData.targetEntity;

						var oPopover = new sap.m.Popover({
							title: "{path:'" + oEntityType["com.sap.vocabularies.UI.v1.HeaderInfo"].Title.Value.Path + "'}",
							contentWidth: "700px",
							content: oFragment,
							placement: sap.m.PlacementType.Auto
						});
						oPopover.bindElement(path);
						jQuery.sap.syncStyleClass(oController.getOwnerComponent().getContentDensityClass(), oController.getView(), oPopover);
						oController.getView().addDependent(oPopover);
						oController.popoverSection.content = oPopover;
						setTimeout(function () {
							oController.popoverSection.content.openBy(oSource);
							viewModel.setProperty("/skipHideBusyIndicatorOnBatchComplete", false);
							sap.ui.core.BusyIndicator.hide();
						}, 2000);
					});
				} else {
					oController.popoverSection.content.bindElement(path);
					//					oController.popoverSection.content.setTitle(popoverTitle);
					setTimeout(function () {
						oController.popoverSection.content.openBy(oSource);
						viewModel.setProperty("/skipHideBusyIndicatorOnBatchComplete", false);
						sap.ui.core.BusyIndicator.hide();
					}, 2000);
				}
			}
		},
		getSelectionsDateFieldsFromEntity: function (sEntitySet) {
			var oController = this;
			var oModel = oController.getOwnerComponent().getModel("workspaceModel");
			var oMetaModel = oModel.getMetaModel();
			var oEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(sEntitySet).entityType);
			var oSelectionFields = oEntityType["com.sap.vocabularies.UI.v1.SelectionFields"];
			var keys = [];
			if (oSelectionFields) {
				for (var i = 0; i < oSelectionFields.length; i++) {
					var property = oEntityType.property.find(function (prop) { return prop.name == oSelectionFields[i].PropertyPath })
					if (property && property["sap:display-format"] == "Date") {
						keys.push({ key: oSelectionFields[i].PropertyPath });
					}
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
			oController._oMatchDialog = sap.ui.jsfragment("zvui.work.fragment.MatchDialog", oController);
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
					} if (oController.isControlOfType(oControl, "sap/ui/layout/ResponsiveSplitter")) {
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
		onTableFieldChange: function (oEvent) {
			//			Don't change anything without approval
			var oController = this;
			var oViewModel = oController.getOwnerComponent().getModel("viewModel");
			var uiModel = oController.getView().getModel("ui");
			var editMode = uiModel.getProperty("/editable");
			var skipHashChange = oViewModel.getProperty("/skipHashChange");
			var oContext = oEvent.getSource().getBindingContext();
			var currentRoute = oViewModel.getProperty("/cuttentRoute");
			var flexibleColumnLayout = oController.getOwnerComponent().getRootControl().byId("idAppControl");
			var bundle = oController.getView().getModel("i18n").getResourceBundle();
			var changedPath = oContext.getPath();
			var entityType, entitySet, entityName, oSource, oSourceEvent = $.extend(true, {}, oEvent);
			var path, fieldPath;
			if (oSourceEvent.getParameter("changeEvent")) {
				entityName = oSourceEvent.getParameter("changeEvent").getSource().getBindingContext().getPath().split("(")[0].split("/")[1];
				oSource = oSourceEvent.getParameter("changeEvent").getSource();
				path = oSourceEvent.getParameter("changeEvent").getSource().getBindingInfo("value").binding.getPath();
				fieldPath = oSourceEvent.getParameter("changeEvent").getSource().getBindingContext().getPath() + "/" + path;
			} else {
				entityName = oSourceEvent.getSource().getBindingContext().getPath().split("(")[0].split("/")[1];
				oSource = oSourceEvent.getSource();
				path = oSourceEvent.getSource().getBindingInfo("value").binding.sPath;
				fieldPath = oSourceEvent.getSource().getBindingContext().getPath() + "/" + path;
			}

			var oModel = oController.getView().getModel();
			if (oModel) {
				var oMetaModel = oModel.getMetaModel();
				if (!oMetaModel.getODataEntitySet(entityName)) {
					oModel = oController.getOwnerComponent().getModel();
				}
			}
			var oMetaModel = oModel.getMetaModel();

			if (oSourceEvent.getParameter("validated") || oSourceEvent.getParameter("value") == "" || oSourceEvent.getParameter("selectionChange") ||
				(oSourceEvent.getParameter("changeEvent") && (oSourceEvent.getParameter("changeEvent").getParameter("validated")
					|| oSourceEvent.getParameter("changeEvent").getParameter("value") == "" || oSourceEvent.getParameter("changeEvent").getParameter("selectionChange")))) {
				if (entityName) {
					entitySet = oMetaModel.getODataEntitySet(entityName);
					entityType = oMetaModel.getODataEntityType(entitySet.entityType);

					var property = oMetaModel.getODataProperty(entityType, path);
					var value;
					if (oSourceEvent.getParameter("value") || oSourceEvent.getParameter("value") == "") {
						value = oSourceEvent.getParameter("value");
					} else if (oSourceEvent.getParameter("changeEvent").getParameter("value") || oSourceEvent.getParameter("changeEvent").getParameter("value") == "") {
						value = oSourceEvent.getParameter("changeEvent").getParameter("value");
					}
					if (oViewModel.getProperty("/cuttentRoute") == 'Detail') {
						oController.noBackPlease(); //for preventing the browser back
					}
					if (property["sap:value-list"] == "fixed-values") {
						if (oEvent.getParameter("value") == "") {//changes for issue when empty value in dropdown is not sending merge
							oModel.setProperty(fieldPath, "");
						}
					}
					if (property && (property["com.sap.vocabularies.Common.v1.ValueList"]
					)) {
						oViewModel.setProperty("/modelChanged", true);
						oModel.submitChanges({
							batchGroupId: "changes",
							success: function (oData, response) {
								//								sap.ui.core.BusyIndicator.hide();
								oController.optimizedUpdateCalls(entityName, changedPath);
								//								oModel.refresh();
							},
							error: function (data, response) {
								sap.ui.core.BusyIndicator.hide();
							}
						});
					} else if (oEvent.getSource().getValueState() == "Error") {
						var errorText = oEvent.getSource().getValueStateText();
						setTimeout(function () {
							oSourceEvent.getSource().setValueStateText(errorText);
						}, 200);
					} else {
						setTimeout(function () {
							if (oController.checkErrorMessageExist(oModel)) {
								for (var key in oModel.mMessages) {
									if (key.indexOf(path) !== -1) {
										oSourceEvent.getSource().setValueState("Error");
										oSourceEvent.getSource().setValueStateText(oModel.mMessages[key][0].message);
										break;
									}
								}
							}
						}, 1000);
					}
				}
			} else {

				if (entityName) {
					entitySet = oMetaModel.getODataEntitySet(entityName);
					entityType = oMetaModel.getODataEntityType(entitySet.entityType);
					var property = oMetaModel.getODataProperty(entityType, oEvent.getSource().getBindingInfo("value").binding.sPath);
					if (property && (property["com.sap.vocabularies.Common.v1.ValueList"]
						&& property["sap:value-list"] == "fixed-values"
					)) {
						if (oEvent.getParameter("selectionChange")) {
							oEvent.getSource().setValueState();
							oEvent.getSource().setValueStateText();
						} else {
							oEvent.getSource().setValueState("Error");
							oEvent.getSource().setValueStateText(bundle.getText("ENTERVALIDVALUE"));
						}
					} else if (oEvent.getSource().getValueState() == "Error") {
						var errorText = oEvent.getSource().getValueStateText();
						setTimeout(function () {
							oSourceEvent.getSource().setValueStateText(errorText);
						}, 200);
					} else {
						setTimeout(function () {
							if (oController.checkErrorMessageExist(oModel)) {
								for (var key in oModel.mMessages) {
									if (key.indexOf(path) !== -1) {
										oSourceEvent.getSource().setValueState("Error");
										oSourceEvent.getSource().setValueStateText(oModel.mMessages[key][0].message);
										break;
									}
								}
							}
						}, 1000);
					}
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
			if (dynamicSideContent.getMainContent()[1]) {
				var oTable = dynamicSideContent.getMainContent()[1].getTable();
			} else {
				var oTable = dynamicSideContent.getMainContent()[0].getTable();
			}
			var customData = oEvent.getSource().data();
			//			var sEntitySet = oTable.getParent().getEntitySet();
			//			var showingSideContent = viewModel.getProperty("/" + sEntitySet + "showingSideContent");	
			if (customData.Action == "SELECT_ALL") {
				if (oTable.getRows) {
					oTable._toggleSelectAll();
				} else {
					oTable.selectAll(true);
				}
			} else {
				if (oTable.getRows) {
					oTable.clearSelection();
				} else {
					oTable.removeSelections();
				}
				oController.onCloseTableDSC(oEvent);
			}
		},
		onDSCSizeChange: function (oEvent) {
			var oController = this;
			//			var dynamicSideContent = oController.getDynamicSideContent(oEvent.getSource());
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
			var oModel = oController.getOwnerComponent().getModel();
			var gridTable = oEvent.getSource().getParent().getParent().getParent();
			if (oEvent.getSource().data("CONTENTDENSITY") == "COMPACT") {
				gridTable.addStyleClass("vistexCompactStyle");
				gridTable.setVisibleRowCount(22);
				gridTable.setRowHeight(19);
				viewModel.setProperty("/CompactMode", true);
			} else {
				gridTable.removeStyleClass("vistexCompactStyle");
				gridTable.setVisibleRowCount(12);
				gridTable.setRowHeight(0);
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
			if (oEvent.getParameter("state") == true) {
				if (mainTable.setSelectionMode) {
					mainTable.setSelectionMode("MultiToggle");
				} else {
					mainTable.setMode("MultiSelect");
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
			}
			oController.onCloseTableDSC(oEvent);
		},
		onCodesSectionPrepare: function (oEvent) {
			var oController = this;

			if (!oController.prepareCodesSection) return;
			oController.prepareCodesSection = false;
			sap.ui.core.BusyIndicator.show();
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var dynamicSideContent = oController.getResponsiveSplitter(oEvent.getSource());
			var viewModel = oController.getView().getModel("viewModel");
			var oSmartTable, oTargetEntity, segmentedButton;
			var DSCId = dynamicSideContent.content.getId();

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
						if (oneRowSelected) {
							var listEntity = oMetaModel.getODataAssociationSetEnd(entity, entity.navigationProperty[i].name).entitySet;
							var oAcgrpField = oTargetEntity.property.find(function (obj) { return obj.name == "acgrp" });
							if (oAcgrpField) {
								var customListItem;
								if (oController.codesDataEnabled === "1") {
									customListItem = new sap.m.CustomListItem({
										content: new sap.m.CheckBox({
											selected: "{seltd}",
											enabled: "{= ${seltd_fc} === 3}",
											partiallySelected: "{psltd}",
											text: "{text}"
										})
									});
								} else {
									customListItem = new sap.m.CustomListItem({
										content: new sap.m.CheckBox({
											selected: "{seltd}",
											enabled: false,
											partiallySelected: "{psltd}",
											text: "{text}"
										})
									});
								}
								var codesList = new sap.m.List().data({ "entity": listEntity, "refresh": true });
								var codeListItemPath = "/" + listEntity;
								var sorter = new sap.ui.model.Sorter("acgrp_txt", false, true);
								codesList.bindAggregation("items", { path: codeListItemPath, template: customListItem, sorter: sorter });

								var oCodesToolbar = new sap.m.Toolbar();
								oCodesToolbar.addContent(new sap.m.Title({
									text: oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"]["TypeName"].String
								}));
								codesList.setHeaderToolbar(oCodesToolbar);
							} else {
								var codesList = new sap.ui.comp.smartlist.SmartList({
									entitySet: listEntity,
									header: oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"]["TypeName"].String,
									showRowCount: false,
									enableAutoBinding: true
								});

								var customListItem;
								if (oController.codesDataEnabled === "1") {
									customListItem = new sap.m.CustomListItem({
										content: new sap.m.CheckBox({
											selected: "{seltd}",
											enabled: "{= ${seltd_fc} === 3}",
											partiallySelected: "{psltd}",
											text: "{text}"
										})
									});
								} else {
									customListItem = new sap.m.CustomListItem({
										content: new sap.m.CheckBox({
											selected: "{seltd}",
											enabled: false,
											partiallySelected: "{psltd}",
											text: "{text}"
										})
									});
								}

								codesList.setListItemTemplate(customListItem);


							}
						} else {
							var editablelistEntity = oMetaModel.getODataAssociationSetEnd(entity, entity.navigationProperty[i].name).entitySet;
							viewModel.setProperty("/bulkEditCode/" + editablelistEntity, {});
							viewModel.setProperty("/bulkEditCode/" + editablelistEntity + "/entityName", editablelistEntity);
							var codesList = new sap.m.List();
							var singleSelect = false;
							if (oTargetEntity["vui.bodc.workspace.SingleSelect"] &&
								oTargetEntity["vui.bodc.workspace.SingleSelect"].Bool) {
								singleSelect = true;
							}
							var sorter = null;
							var oAcgrpField = oTargetEntity.property.find(function (obj) { return obj.name == "acgrp" });
							if (oAcgrpField) {
								sorter = new sap.ui.model.Sorter("acgrp_txt", false, true);
							}
							var codeListItemPath = "viewModel>/bulkEditCode/" + editablelistEntity + "/itemsData";
							codesList.bindAggregation("items", {
								path: codeListItemPath, factory: function (sId, oContext) {
									if (oController.codesDetails.allRowsLocked) {
										return new sap.m.CustomListItem({
											content: new sap.m.CheckBox({
												selected: "{viewModel>seltd}",
												enabled: false,
												partiallySelected: "{viewModel>psltd}",
												text: "{viewModel>text}"
											})
										});
									} else {
										return new sap.m.CustomListItem({
											content: new sap.m.CheckBox({
												select: [oController.onCodeListSelectionChange, oController],
												selected: "{viewModel>seltd}",
												enabled: "{= ${viewModel>seltd_fc} === 3 }",
												partiallySelected: "{viewModel>psltd}",
												text: "{viewModel>text}"
											}).data("singleSelect", singleSelect)
												.data("entity", editablelistEntity)
										});
									}
								}, sorter: sorter
							});
							var oCodesToolbar = new sap.m.Toolbar();
							oCodesToolbar.addContent(new sap.m.Title({
								text: oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"]["TypeName"].String
							}));
							oCodesToolbar.addContent(new sap.m.ToolbarSpacer());
							if (oController.codesDetails && !oController.codesDetails.allRowsLocked) {
								var oCodesApplyButton = new sap.m.Button({
									type: "Emphasized",
									press: [oController.onDscApply, oController],
									text: "{i18n>APPLY}",
									visible: "{viewModel>/" + sEntitySet + "showDscApply}"
								}).data("codes", true);
								oCodesApplyButton.data("codeEntity", editablelistEntity);
								oCodesToolbar.addContent(oCodesApplyButton);
							}

							codesList.setHeaderToolbar(oCodesToolbar);
							//										codesList.bindElement("/" + listEntity);
							itemTabBar.getItems()[1].addContent(codesList);

							oModel.read("/" + editablelistEntity, {
								urlParameters: oController.codesDetails.urlParameters,
								success: function (oData, response, test) {
									if (oData.results[0]) {
										var responseEntity = oData.results[0].__metadata.type.split(".")[oData.results[0].__metadata.type.split(".").length - 1].split("Type")[0];
										viewModel.setProperty("/bulkEditCode/" + responseEntity + "/itemsData", $.extend(true, {}, oData.results));
										viewModel.setProperty("/bulkEditCode/" + responseEntity + "/referenceItemsData", $.extend(true, {}, oData.results));
									}
								}
							});

						}


						itemTabBar.getItems()[1].addContent(codesList);
					} else if (oTargetEntity && oTargetEntity['vui.bodc.workspace.CodesNonEditable']) {
						var listEntity = oMetaModel.getODataAssociationSetEnd(entity, entity.navigationProperty[i].name).entitySet;
						var codesList = new sap.ui.comp.smartlist.SmartList({
							entitySet: listEntity,
							header: oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"]["TypeName"].String,
							showRowCount: false,
							enableAutoBinding: true,
							listItemTemplate:
								new sap.m.StandardListItem({
									title: "{text}",
									//									description:"{text}"
								})
						});
						var oAcgrpField = oTargetEntity.property.find(function (obj) { return obj.name == "acgrp" });
						if (oAcgrpField) {
							codesList.attachBeforeRebindList(function (oEvent) {
								var bindingParams = oEvent.getParameter("bindingParams");
								debugger;
							});
						}
						itemTabBar.getItems()[1].addContent(codesList);
					}
				}
			}
		},
		readQueryPrepare: function (entitySet) {
			var oController = this;
			var oModel = oController.getView().getModel();
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
					//					select.push(object['sap:text']);
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
			var urlParameters = {
				//					"$select" : select.toString()
				"$select": fields
			};
			if (expand.length > 0) {
				urlParameters["$expand"] = expand.toString();
			}

			return urlParameters;
		},
		onFilterSearch: function (oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var viewModel = oController.getView().getModel("viewModel");
			viewModel.setProperty("/searchEvent", true);
			viewModel.setProperty("/searchedEntity", oEvent.getSource().getEntitySet());

			var errorMessages = oController.checkErrorMessageExist(oModel);
			if (!errorMessages) {
				oController.removeMessages(oController);
			}

			var content;
			var currentRoute = viewModel.getProperty("/cuttentRoute");
			var flexibleColumnLayout = oController.getOwnerComponent().getRootControl().byId("idAppControl");
			if (currentRoute == "Detail") {
				content = oController.getView();
			} else if (currentRoute == "DetailDetail") {
				content = flexibleColumnLayout.getCurrentMidColumnPage().getContent()[0].getContent()[viewModel.getProperty("/currentDetailPageLevel")];
			}
			while (!content.getSections) {
				content = content.getContent()[0];
			}
			var sections = content.getSections();

			var currentRoute = viewModel.getProperty("/cuttentRoute");
			if (currentRoute == "Detail") {
				viewModel.setProperty("/DetailshowHideDsc", false)
			} else if (currentRoute == "DetailDetail") {
				viewModel.setProperty("/DetailDetailshowHideDsc", false)
			}

			_.each(sections, function (section) {
				if (section.getSubSections()[0] && section.getSubSections()[0].getBlocks()[0] &&
					section.getSubSections()[0].getBlocks()[0]) {
					var dynamicSideContent;
					if (oController.isControlOfType(section.getSubSections()[0].getBlocks()[0].getContent()[0], "sap/ui/layout/ResponsiveSplitter")) {
						dynamicSideContent = oController.getResponsiveSplitter(section.getSubSections()[0].getBlocks()[0].getContent()[0]);
					} else {
						dynamicSideContent = oController.getResponsiveSplitter(section.getSubSections()[0].getBlocks()[0].getContent()[1]);
					}
					if (dynamicSideContent.getMainContent()[1]) {
						var oTable = dynamicSideContent.getMainContent()[1].getTable();
					} else {
						var oTable = dynamicSideContent.getMainContent()[0].getTable();
					}
					if (oTable instanceof sap.ui.table.Table && oTable._setFirstVisibleRowIndex) {
						oTable._setFirstVisibleRowIndex(0);
						oTable._iRenderedFirstVisibleRow = 0;
					}

					oController.onClosingDscSideContent(dynamicSideContent);
				}
			});

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
		setDropdownItems: function (entity, oComboBox) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var viewModel = oController.getOwnerComponent().getModel("viewModel");
			if (oComboBox.getItems().length > 2) return;
			var valueHelpField = entity.property.find(function (obj) { return obj.name == oComboBox.data().field })
			var textField = valueHelpField["com.sap.vocabularies.Common.v1.Text"].Path.split("/")[1];
			var keyField = _.find(valueHelpField["com.sap.vocabularies.Common.v1.ValueList"].Parameters, function (parameter) {
				if (parameter["LocalDataProperty"] && parameter["LocalDataProperty"].PropertyPath == valueHelpField.name) {
					return parameter;
				}
			});
			keyField = keyField.ValueListProperty.String;
			viewModel.setProperty("/skipBusyIndicator", true);
			//			valueHelpData.key = valueHelpField.name;
			oModel.read("/" + valueHelpField["com.sap.vocabularies.Common.v1.ValueList"].CollectionPath.String, {
				success: function (oData, response) {
					viewModel.setProperty("/skipBusyIndicator", false);
					oComboBox.addItem(new sap.ui.core.Item({
						text: "< Keep Existing Values >", key: "< Keep Existing Values >"
					}));
					oComboBox.addItem(new sap.ui.core.Item({
						text: "< Leave Blank >", key: "< Leave Blank >"
					}));
					var Data = [];
					_.each(oData.results, function (result) {
						//						cellData.push({"Text": result["value"],
						//						"Key": result["key"],
						//						"field": item.Value.Path});
						var text;
						if (result[textField]) {
							text = result[textField] + " (" + result[keyField] + ")";
						} else {
							text = result[keyField];
						}
						oComboBox.addItem(new sap.ui.core.Item({
							text: text, key: result[keyField]
						}));
					});
				}
			});
		},
		checkIsSummaryGroupTable: function (sEntitySet) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			if (oModel) {
				var oMetaModel = oModel.getMetaModel();
				if (!oMetaModel.getODataEntitySet(sEntitySet)) {
					oModel = oController.getOwnerComponent().getModel();
				}
			}
			var oMetaModel = oModel.getMetaModel();
			if (!sEntitySet) return;
			var oEntitySet = oModel.getMetaModel().getODataEntitySet(sEntitySet);
			var oEntityType = oModel.getMetaModel().getODataEntityType(oEntitySet.entityType);
			if (oEntityType["vui.bodc.workspace.SummaryGroup"] && viewModel.getProperty("/SummaryGroupSmrid") &&
				!oController.drilldownToSummary) {
				//				oController.drilldownToSummary = true;
				oController.summaryGroupEntity = sEntitySet;
			}
		},
		drilldownToSummaryByRowid: function () {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oSmartTable = oController.getFacetParentTable(oController.summaryGroupEntity, true);
			setTimeout(function () {
				var oTable = oSmartTable.getTable();
				var oItems = oTable.getItems();
				var selectedItem;
				if (oItems.length > 0) {
					for (var i = 0; i < oItems.length; i++) {
						var sPath = oItems[i].getBindingContext().getPath();
						if (sPath.indexOf(viewModel.getProperty("/SummaryGroupSmrid")) !== -1) {
							selectedItem = oItems[i];
							break;
						}
					}
					oTable.fireItemPress({ "listItem": selectedItem });
				}
			}, 500);
		},
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
		clearTableSelections: function (oContent, onlyCloseDSC) {
			var oController = this;
			var content, sections;
			var viewModel = oController.getView().getModel("viewModel");
			var currentRoute = viewModel.getProperty("/cuttentRoute");
			var flexibleColumnLayout = oController.getOwnerComponent().getRootControl().byId("idAppControl");
			if (currentRoute == "Detail") {
				content = oController.getView();
			} else if (currentRoute == "DetailDetail") {
				content = flexibleColumnLayout.getCurrentMidColumnPage().getContent()[0].getContent()[viewModel.getProperty("/currentDetailPageLevel")];
			} else {
				return;
			}
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
							} else if (oController.isControlOfType(aMainContent[y], "sap/ui/table/Table")) {
								if (aMainContent[y].getRows) {
									aMainContent[y].clearSelection();
								} else {
									aMainContent[y].removeSelections();
								}
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
		onToggleOpenState: function (oEvent) {
			var oController = this;
			var viewModel = oController.getOwnerComponent().getModel("viewModel");
			var uiModel = oController.getView().getModel("ui");
			var oModel = oController.getOwnerComponent().getModel();
			var oTable = oEvent.getSource();
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
		readPath: function (entitySet, sPath) {
			var oController = this;

			var oModel = oController.getView().getModel();
			if (oModel) {
				var oMetaModel = oModel.getMetaModel();
				if (!oMetaModel.getODataEntitySet(entitySet)) {
					oModel = oController.getOwnerComponent().getModel();
				}
			}
			var mParameters = oController.readQueryPrepare(entitySet);
			mParameters["$skip"] = 0;
			mParameters["$top"] = 25;
			//			var oModel = oController.getOwnerComponent().getModel();
			oModel.read(sPath, {
				urlParameters: mParameters
			});
		},
		onMatchItemPress: function (oEvent) {
			var oController = this;
			var viewModel = oController.getOwnerComponent().getModel("viewModel");
			var oSource = oEvent.getSource();
			var oPanel = oSource.getParent();
			var sPath = oEvent.getParameter("listItem").getBindingContext("viewModel").getPath();
			while (!(oPanel instanceof sap.m.Panel)) {
				oPanel = oPanel.getParent();
			}
			if (!oPanel) return;
			var columnData = [{ "col": "field", "label": "Field" }, { "col": "source", "label": "Source" }, { "col": "target", "label": "Target" }];
			viewModel.setProperty("/matchColumnData", columnData);

			oPanel.getContent()[0].setVisible(false);
			oPanel.getContent()[1].setVisible(false);
			var length = oPanel.getContent()[1].getItems()[0].getVisibleItems().length;
			var index = parseInt(sPath.split("/")[sPath.split("/").length - 1]) + 1;
			oController.prepareMatchItemDetails(oPanel, sPath, length, index);
		},
		prepareMatchItemDetails: function (oPanel, sPath, length, index) {
			var oController = this;
			var viewModel = oController.getOwnerComponent().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var previousButtonEnable = true, nextButtonEnable = true;

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
						press: [oController.onMatchItemBackPress, oController]
					}),
					new sap.m.Text({
						text: index + " of " + length
					}).addStyleClass("sapUiTinyMarginTop"),
					new sap.m.HBox({
						items: [
							new sap.m.Button({
								type: sap.m.ButtonType.Transparent,
								icon: "sap-icon://navigation-up-arrow",
								enabled: previousButtonEnable,
								tooltip: "{i18n>PREVIOUS}",
								press: [oController.onMatchNextItem, oController]
							}).data({ length: length, index: index, sPath: sPath }),
							new sap.m.Button({
								type: sap.m.ButtonType.Transparent,
								icon: "sap-icon://navigation-down-arrow",
								enabled: nextButtonEnable,
								tooltip: "{i18n>NEXT}",
								press: [oController.onMatchNextItem, oController]
							}).data({ length: length, index: index, sPath: sPath })
						]
					})
				]
			});
			oVBox.addItem(oHBox);
			oVBox.addItem(new sap.m.Toolbar({
				width: "100%",
				height: "1px"
			}));
			var resultEntityName = viewModel.getProperty("/matchDetails/resultEntityName");
			var oTargetEntity = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(resultEntityName).entityType);
			var oLineItems = oTargetEntity["vui.bodc.ResponsiveLineItem"];

			var title = "", subtitle = "", quickViewField, TitleField, oContent;
			oHBox = new sap.m.HBox({
				justifyContent: "SpaceBetween",
			}).addStyleClass("sapUiTinyMarginTop");
			var collectionField = oLineItems.find(function (obj) { return obj.RecordType == "com.sap.vocabularies.UI.v1.CollectionField" });
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
					oList.data("QuickviewEnitity", quickViewField.Quickview_Enitity.String);
				}
				if (quickViewField.HREF) {
					oList.data("HREF", quickViewField.HREF.Path);
				}
				oContent = new sap.m.VBox({//design
					items: [new sap.m.Label({
						text: "{viewModel>" + TitleField.Value.Path + "}",
						design: "Bold"
					}),
						oList
					]
				});

			} else {
				if (oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"] && oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"].Title) {
					title = "{viewModel>" + oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"].Title.Value.Path + "}";
				}

				if (oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"] && oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"].Description) {
					subtitle = "{viewModel>" + oTargetEntity["com.sap.vocabularies.UI.v1.HeaderInfo"].Description.Value.Path + "}";
				}
				oContent = new sap.m.ObjectIdentifier({
					title: title,
					text: subtitle,
					titleActive: false,
				}).addStyleClass("matchTitleObjectIdentifier sapUiTinyMarginBegin");
			}
			oHBox.addItem(new sap.m.HBox({
				items: [oContent]
			}));
			var buttonLineItem = oLineItems.find(function (obj) { return obj.RecordType == "com.sap.vocabularies.UI.v1.DataFieldForAction" });
			oHBox.addItem(new sap.m.Button({
				icon: "sap-icon://accept",
				text: "{i18n>APPLY}",
				enabled: "{viewModel>/matchDetails/enabled}",
				type: {
					path: "viewModel>mqlfr", formatter: function (mqlfr) {
						var sButtonType;
						if (mqlfr) {
							sButtonType = sap.m.ButtonType.Emphasized;
						} else {
							sButtonType = sap.m.ButtonType.Default;
						}
						return sButtonType;
					}
				},
				press: oController.onMatchResultAction.bind(oController),
			}).data({ "Action": buttonLineItem.Action.String, fromMatchDetails: true, sPath: sPath }));
			oVBox.addItem(oHBox);
			var mtpctField = oLineItems.find(function (obj) { return obj.Value.Path == "mtpct" });
			if (mtpctField) {
				//				Radial Microchart
				var mtpctFieldProp = oTargetEntity.property.find(function (obj) { return obj.name == "mtpct" });
				oVBox.addItem(new sap.m.HBox({
					alignItems: "Center",
					items: [
						new sap.m.Label({
							text: "{i18n>CONFIDENCE} :"
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
							value: {
								path: "viewModel>mtpct", formatter: function (mtpct) {
									var value;
									if (mtpct) {
										value = parseFloat(mtpct) / 20;
										return Math.round(value);
									} else {
										return 0;
									}
								}
							}
						})
					],
				}).addStyleClass("sapUiSmallMarginTopBottom"));
			}

			oVBox.addItem(new sap.m.Label({
				text: "{i18n>MATCHDETAILS}"
			}).addStyleClass("sapUiTinyMarginBeginEnd"));

			var oTable = new sap.m.Table({
				autoPopinMode: false,
				columns: [
					new sap.m.Column({
						visible: true,
						header: new sap.m.Text({
							text: "{i18n>MATCHINGFIEDS}"
						})
					}),
					new sap.m.Column({
						visible: true,
						header: new sap.m.Text({
							text: "{i18n>SOURCE}"
						})
					}),
					new sap.m.Column({
						visible: true,
						header: new sap.m.Text({
							text: "{i18n>SUGGESTED}"
						})
					})
				]
			});

			oTable.bindAggregation("items", "viewModel>/matchItemsData" + oTargetEntity.name, function (sId, oContext) {
				var contextObject = oContext.getObject();
				var fcat_data = viewModel.getProperty("/matchColumnData");
				var cells = [];
				_.each(fcat_data, function (obj) {
					if (obj.col == "field") {
						var text = new sap.m.Label({ design: "Bold", wrapping: true }).bindProperty("text", "viewModel" + ">" + obj["col"], null, sap.ui.model.BindingMode.OneWay);
						cells.push(text);
					} else if (obj.col == "source") {
						var input = new sap.m.Text({ text: "{" + contextObject.source + "}", wrapping: true });
						//						input.bindElement(oController.DSCSourcePath);
						cells.push(input);
					} else if (obj.col == "target") {
						var input = new sap.m.Text({ text: "{viewModel>" + sPath + "/" + contextObject.target + "}", wrapping: true });
						cells.push(input);
					}
				});
				return new sap.m.ColumnListItem({
					cells: cells,
					type: "Active",
				}).addStyleClass("noPadding");
			});
			oTable.bindElement(oController.DSCSourcePath);

			oVBox.addItem(oTable);

			oVBox.bindElement("viewModel>" + sPath);
			if (oPanel.getContent().length == 2) {
				oPanel.addContent(oVBox);
			} else {
				oPanel.removeContent(2);
				oPanel.addContent(oVBox);
			}

		},
		onMatchItemBackPress: function (oEvent) {
			var oController = this;
			var oSource = oEvent.getSource();
			var oPanel = oSource.getParent();
			while (!(oPanel instanceof sap.m.Panel)) {
				oPanel = oPanel.getParent();
			}
			if (!oPanel) return;
			oPanel.getContent()[0].setVisible(true);
			oPanel.getContent()[1].setVisible(true);
			oPanel.removeContent(2);
		},
		onMatchNextItem: function (oEvent) {
			var oController = this;
			var oSource = oEvent.getSource();
			var sIcon = oSource.getIcon();
			var oCustomData = oSource.data();
			var oPanel, sPath, length, index, sPathIndex;
			index = oCustomData.sPath.split("/")[oCustomData.sPath.split("/").length - 1];
			sPath = oCustomData.sPath.slice(0, oCustomData.sPath.length - index.length);
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
			oController.prepareMatchItemDetails(oPanel, sPath, length, index);
		},
		handleTreeTableExpandLevel: function (oEvent, oTreeTable) {
			var oController = this;
			var oButton = oEvent.getSource();
			var customData = oButton.data();
			if (customData.Label == "Expand All") {
				oButton.data("Label", "Collapse All");
				oButton.setText("Collapse All");
				oTreeTable.expandToLevel(1);
			} else {
				oButton.data("Label", "Expand All")
				oButton.setText("Expand All");
				oTreeTable.collapseAll();
				oTreeTable.expandToLevel(0);
			}
		},
		onHeaderAction: function (oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var uiModel = oController.getView().getModel("ui");
			var viewModel = oController.getView().getModel("viewModel");
			var bundle = oController.getView().getModel("i18n").getResourceBundle();
			var urlParameters = {};
			var errorMessages = oController.checkErrorMessageExist(oModel);
			if (errorMessages) {
				sap.ui.core.BusyIndicator.hide();
				oController.showMessagePopover(oController.messageButtonId);
				return;
			}
			var functionImportName = oEvent.getSource().data("FImport");
			var functionImport = oMetaModel.getODataFunctionImport(functionImportName);
			if (functionImport["vui.bodc.workspace.ActionProperties"] &&
				functionImport["vui.bodc.workspace.ActionProperties"].ManlMtchPopup) {
				viewModel.setProperty("/matchToolFromHeader", { "entity": functionImport["vui.bodc.workspace.ActionProperties"].ParentEntity.String });
				if (oController._oMatchDialog) {
					oController._oMatchDialog.removeAllContent();
					delete oController._oMatchDialog;
				}
				oController._oMatchDialog = sap.ui.jsfragment("zvui.work.fragment.MatchDialog", oController);
				oController.getView().addDependent(oController._oMatchDialog);
				oController._oMatchDialog.open();
			}
		}
	});

});