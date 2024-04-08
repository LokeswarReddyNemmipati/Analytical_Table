sap.ui.define([
	"zvui/work/controller/BaseController",
	"sap/ui/core/routing/History",
	"sap/m/MessageBox",
	"sap/ui/core/Component",
	"sap/ui/core/XMLTemplateProcessor",
	"sap/ui/core/util/XMLPreprocessor",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageToast",
	"sap/m/MessageStrip",
	"sap/ui/core/ResizeHandler"
], function (Controller, History, MessageBox, Component, XMLTemplateProcessor, XMLPreprocessor, JSONModel, MessageToast, MessageStrip, ResizeHandler) {
	"use strict";

	return Controller.extend("zvui.work.controller.detailPage", {

		model: new sap.ui.model.json.JSONModel(),
		messageButtonId: 'messageButton',
		columnPosition: 'beginColumn',

		onBeforeRendering: function () {
		},
		onAfterRendering: function () {
			var oController = this;
			if (oController.getView().getContent()[0].getContent()[0]._bHeaderExpanded) {
				oController.getView().getContent()[0].getContent()[0]._handleDynamicTitlePress();
			}
			if (oController.getView().getContent()[0].getContent()[0].getFooter &&
				oController.getView().getContent()[0].getContent()[0].getFooter()) {
				oController.getView().getContent()[0].getContent()[0].getFooter().onAfterRendering = function (oEvent) {
					if (this.getVisible()) {
						this.getParent()._$footerWrapper.removeClass("vistexHideFooterWrapper");
					}
				}
				if (!oController.getView().getContent()[0].getContent()[0].getFooter().getVisible()) {
					oController.getView().getContent()[0].getContent()[0]._$footerWrapper.addClass("vistexHideFooterWrapper");
				}
			}
		},
		onInit: function () {
			var oController = this;
			var viewModel = oController.getOwnerComponent().getModel("viewModel");
			if (viewModel.getProperty("/currentRoute") !== "Detail") {
				oController.messageButtonId = "messageButton1";
			}
			if (viewModel.getProperty("/currentRoute") !== "DetailDetail") {
				viewModel.setProperty("/enableMultiedit", false);
				viewModel.setProperty("/showingSideContent", false);
				viewModel.setProperty("/showDscApply", false);
				viewModel.setProperty("/tableType", "ResponsiveTable");
				viewModel.setProperty("/DetailshowHideDsc", false);
				viewModel.setProperty("/DetailDetailshowHideDsc", false);
				viewModel.setProperty("/CompactMode", false);

				var bundle = oController.getOwnerComponent().getModel("i18n").getResourceBundle();
				if (sap.ui.getCore().byId("backBtn")) {
					sap.ui.getCore().byId("backBtn").attachPress(function () {
						if (viewModel.getProperty("/insideWorkspaceApp")) {
							window.launchpadBackTriggered = true
						}
					});
				}
				//**** new launchpad back button --start ****
				if (sap.ui.getCore().byId("__button0") && sap.ui.getCore().byId("__button0").attachPress) {
					sap.ui.getCore().byId("__button0").attachPress(function () {
						if (viewModel.getProperty("/insideWorkspaceApp")) {
							window.launchpadBackTriggered = true
						}
					});
				}
				if (sap.ui.getCore().byId("__button1") && sap.ui.getCore().byId("__button1").attachPress) {
					sap.ui.getCore().byId("__button1").attachPress(function () {
						if (viewModel.getProperty("/insideWorkspaceApp")) {
							window.launchpadBackTriggered = true
						}
					});
				}
				if (sap.ui.getCore().byId("__item1") && sap.ui.getCore().byId("__item1").attachPress) {
					sap.ui.getCore().byId("__item1").attachPress(function () {
						if (viewModel.getProperty("/insideWorkspaceApp")) {
							window.launchpadBackTriggered = true
						}
					});
				}
				//**** new launchpad back button --end ****		
				$('#shell-header-logo').click(function () {
					window.launchpadBackTriggered = true
				});
				$('.sapUiUfdShellHeadItm').click(function () {
					window.launchpadBackTriggered = true;
				});

				document.onmouseover = function () {
					// User's mouse is inside the page.
					window.innerDocClick = true;
				}
				document.onmouseleave = function () {
					// User's mouse has left the page.
					window.innerDocClick = false;
				}
				window.addEventListener("unload", function (oEvent) {
					var oModel = oController.getView().getModel();
					if (!oModel) return;
					var oMetaModel = oModel.getMetaModel();
					var viewModel = oController.getView().getModel("viewModel");
					var urlParameters = {};

					if (viewModel.getProperty("/cancelNotRequiredonExit")) {
						viewModel.setProperty("/cancelNotRequiredonExit", false);
						return;
					}
					urlParameters["infocus_clear"] = true;
					urlParameters["exit"] = true;
					oModel.callFunction("/CANCEL", {
						method: "POST",
						urlParameters: urlParameters,
						success: function (oData, response) {
						},
						error: function (oData, response) {
						}
					});
					var url = oModel.sServiceUrl.split("/WS/VUI")[0];
					url = url + '?sap-terminate=session';
					if ("sendBeacon" in navigator) {
						navigator.sendBeacon(url);
					} else {
						$.ajax({
							url: url,
							async: false
						});
					}
				});



				oController.registerNavigationFilter();
				window.onbeforeunload = function () {
					if (viewModel.getProperty("/insideWorkspaceApp")) {
						oController.onbeforeunloadTriggered = true;
						oController.onExit();

					}
				}
				window.onunload = function () {
					if (viewModel.getProperty("/insideWorkspaceApp") && !oController.onbeforeunloadTriggered) {
						oController.onExit();
					}
				}
			}
			//			var aSections;
			//			var oObjectPageLayout = oController.getView();
			//			while(true){
			//			if(oObjectPageLayout.getSections){
			//			aSections = oObjectPageLayout.getSections();
			//			break;
			//			}else{
			//			oObjectPageLayout = oObjectPageLayout.getContent()[0];
			//			}
			//			}
			//			for( var i = 0; i < aSections.length ; i++){
			//			var aSubSections = aSections[i].getSubSections();
			//			for(var j = 0 ; j < aSubSections.length ; j++) {
			//			var oBlock = aSubSections[j].getBlocks()[0];
			//			var aContent = oBlock.getContent();

			//			for( var z = 0; z < aContent.length; z++){
			//			var oControl = aContent[z];
			//			oControl =
			//			oControl.getRootPaneContainer().getPanes()[0].getContent().getContent()[0].getContent()[0];
			//			if(oController.isSmartTable(oControl)){
			//			oController.registerResizeHandler(oControl,oObjectPageLayout);
			//			}
			//			}
			//			}
			//			}
		},
		registerNavigationFilter: function () {
			var oController = this;
			var viewModel = oController.getOwnerComponent().getModel("viewModel");
			var bundle = oController.getOwnerComponent().getModel("i18n").getResourceBundle();
			var hashChanger = sap.ui.core.routing.HashChanger.getInstance();
			if (hashChanger && hashChanger['registerNavigationFilter']) {
				hashChanger['registerNavigationFilter'](oController.fnNavigationFilter.bind(this));
			} else {

				window.onhashchange = function () {

					if (viewModel.getProperty("/insideWorkspaceApp")) {
						if (!viewModel.getProperty("/preventHashChange")) {
							if (window.innerDocClick != false && !window.launchpadBackTriggered) {
								window.innerDocClick = false;
							} else {
								// Browser back button was clicked
								if (window.launchpadBackTriggered) {
									window.launchpadBackTriggered = false;
								}
								var oModel = oController.getView().getModel();
								var errorMessages = oController.checkErrorMessageExist(oModel);
								if (errorMessages) {
									history.go(1);
									oController.showMessagePopover(oController.messageButtonId);
									return;
								}
								var modelChanged = viewModel.getProperty("/modelChanged");
								var currentRoute = viewModel.getProperty("/currentRoute");
								if (currentRoute == "Detail" && modelChanged && viewModel.getProperty("/previousRoute") == "Detail") {
									if (modelChanged) {
										MessageBox.confirm(bundle.getText('BACKTOWORKSPACE'), {
											title: bundle.getText('CONFIRM'),
											actions: [MessageBox.Action.YES, MessageBox.Action.NO],
											onClose: function (oAction) {
												if (oAction == 'YES') {
													if (window.launchpadBackTriggered && viewModel.getProperty("/fromWorklist")) {
														var urlParameters = {};
														var oModel = oController.getView().getModel();
														var oMetaModel = oModel.getMetaModel();
														viewModel.setProperty("/cancelNotRequiredonExit", true);
														urlParameters["infocus_clear"] = true;
														urlParameters["exit"] = true;
														oModel.callFunction("/CANCEL", {
															method: "POST",
															urlParameters: urlParameters,
															success: function (oData, response) {
															},
															error: function (oData, response) {
															}
														});
													} else {
														oController.onDiscard();
													}
													history.go(-1);
												} else {
													oController.noBackPlease();
													sap.ui.core.BusyIndicator.hide();
												}
											}
										});
									} else {
										if (window.launchpadBackTriggered && viewModel.getProperty("/fromWorklist")) {
											var urlParameters = {};
											var oModel = oController.getView().getModel();
											var oMetaModel = oModel.getMetaModel();
											viewModel.setProperty("/cancelNotRequiredonExit", true);
											urlParameters["infocus_clear"] = true;
											urlParameters["exit"] = true;
											oModel.callFunction("/CANCEL", {
												method: "POST",
												urlParameters: urlParameters,
												success: function (oData, response) {
												},
												error: function (oData, response) {
												}
											});
										} else {
											oController.onDiscard();
										}
									}
									//									138624 - Changes for Performance Improvement During Save and Refresh in
									//									Workspace - Started
									//									After making any changes navigation not working
									//									}else if(currentRoute == "DetailDetail" &&
									//									viewModel.getProperty("/detaildetailRoute") && modelChanged &&
									//									viewModel.getProperty("/currentDetailPageLevel") !==
									//									viewModel.getProperty("/previousDetailPageLevel") &&
									//									viewModel.getProperty("/currentDetailPageLevel") == 0){
									//									oController.noBackPlease();

								} else if (currentRoute == "DetailDetail" && viewModel.getProperty("/detaildetailRoute") && modelChanged
									//										&& viewModel.getProperty("/currentDetailPageLevel") == 0
								) {
									//									138624 - Changes for Performance Improvement During Save and Refresh in
									//									Workspace - Ended
									MessageBox.confirm(bundle.getText('BACKTOWORKSPACE'), {
										title: bundle.getText('CONFIRM'),
										actions: [MessageBox.Action.YES, MessageBox.Action.NO],
										onClose: function (oAction) {
											if (oAction == 'YES') {
												var flexibleColumnLayout = oController.getOwnerComponent().getRootControl().byId("idAppControl");
												var midPageController = flexibleColumnLayout.getCurrentMidColumnPage().getContent()[0].getContent()[viewModel.getProperty("/currentDetailPageLevel")].getController();
												// 138624 - Changes for
												// Performance Improvement
												// During Save and Refresh in
												// Workspace - Started
												midPageController.onDiscard().then(() => {
													viewModel.setProperty("/skipPageRefresh", true);
													setTimeout(function () {
														viewModel.setProperty("/skipPageRefresh", false);
														history.go(-1);
													}, 1000);
												});
												// 138624 - Changes for
												// Performance Improvement
												// During Save and Refresh in
												// Workspace - Ended
											} else {
												oController.noBackPlease();
												sap.ui.core.BusyIndicator.hide();
											}
										}
									});
								} else if (currentRoute == "Detail" && modelChanged && viewModel.getProperty("/previousRoute") == "DetailDetail") {
									oController.noBackPlease();
								} else if (currentRoute == "Detail" && viewModel.getProperty("/detaildetailRoute") && !viewModel.getProperty("/summaryGroupCase")) {
									oController.onDiscard();
								} else if (currentRoute == "Worklist") {
									viewModel.setProperty("/fromSaveBackActionRequired", true);
									oController.onDiscard();
								}
							}
						} else {
							viewModel.setProperty("/preventHashChange", false);
						}
					}
				}
			}

		},
		fnNavigationFilter: function (target, source) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var bundle = oController.getOwnerComponent().getModel("i18n").getResourceBundle();
			var currentRoute = viewModel.getProperty("/currentRoute");
			var modelChanged = viewModel.getProperty("/modelChanged");

			if (viewModel.getProperty("/insideWorkspaceApp")) {
				if (!viewModel.getProperty("/preventHashChange")) {
					if (window.innerDocClick != false && !window.launchpadBackTriggered) {
						window.innerDocClick = false;
					} else {
						// Browser back button was clicked
						if (window.launchpadBackTriggered) {
							window.launchpadBackTriggered = false;
						}
						var oModel = oController.getView().getModel();
						var errorMessages = oController.checkErrorMessageExist(oModel);
						if (errorMessages) {
							history.go(1);
							oController.showMessagePopover(oController.messageButtonId);
							return;
						}
						var modelChanged = viewModel.getProperty("/modelChanged");
						var currentRoute = viewModel.getProperty("/currentRoute");
						if (currentRoute == "Detail" && modelChanged && viewModel.getProperty("/previousRoute") == "Detail") {
							if (modelChanged) {
								MessageBox.confirm(bundle.getText('BACKTOWORKSPACE'), {
									title: bundle.getText('CONFIRM'),
									actions: [MessageBox.Action.YES, MessageBox.Action.NO],
									onClose: function (oAction) {
										if (oAction == 'YES') {
											if (window.launchpadBackTriggered && viewModel.getProperty("/fromWorklist")) {
												var urlParameters = {};
												var oModel = oController.getView().getModel();
												var oMetaModel = oModel.getMetaModel();
												viewModel.setProperty("/cancelNotRequiredonExit", true);
												urlParameters["infocus_clear"] = true;
												urlParameters["exit"] = true;
												oModel.callFunction("/CANCEL", {
													method: "POST",
													urlParameters: urlParameters,
													success: function (oData, response) {
													},
													error: function (oData, response) {
													}
												});
											} else {
												oController.onDiscard();
											}
											history.go(-1);
										} else {
											oController.noBackPlease();
											sap.ui.core.BusyIndicator.hide();
										}
									}
								});
							} else {
								if (window.launchpadBackTriggered && viewModel.getProperty("/fromWorklist")) {
									var urlParameters = {};
									var oModel = oController.getView().getModel();
									var oMetaModel = oModel.getMetaModel();
									viewModel.setProperty("/cancelNotRequiredonExit", true);
									urlParameters["infocus_clear"] = true;
									urlParameters["exit"] = true;
									oModel.callFunction("/CANCEL", {
										method: "POST",
										urlParameters: urlParameters,
										success: function (oData, response) {
										},
										error: function (oData, response) {
										}
									});
								} else {
									oController.onDiscard();
								}
							}
							//									138624 - Changes for Performance Improvement During Save and Refresh in
							//									Workspace - Started
							//									After making any changes navigation not working
							//									}else if(currentRoute == "DetailDetail" &&
							//									viewModel.getProperty("/detaildetailRoute") && modelChanged &&
							//									viewModel.getProperty("/currentDetailPageLevel") !==
							//									viewModel.getProperty("/previousDetailPageLevel") &&
							//									viewModel.getProperty("/currentDetailPageLevel") == 0){
							//									oController.noBackPlease();

						} else if (currentRoute == "DetailDetail" && viewModel.getProperty("/detaildetailRoute") && modelChanged
							//										&& viewModel.getProperty("/currentDetailPageLevel") == 0
						) {
							//									138624 - Changes for Performance Improvement During Save and Refresh in
							//									Workspace - Ended
							MessageBox.confirm(bundle.getText('BACKTOWORKSPACE'), {
								title: bundle.getText('CONFIRM'),
								actions: [MessageBox.Action.YES, MessageBox.Action.NO],
								onClose: function (oAction) {
									if (oAction == 'YES') {
										var flexibleColumnLayout = oController.getOwnerComponent().getRootControl().byId("idAppControl");
										var midPageController = flexibleColumnLayout.getCurrentMidColumnPage().getContent()[0].getContent()[viewModel.getProperty("/currentDetailPageLevel")].getController();
										// 138624 - Changes for
										// Performance Improvement
										// During Save and Refresh in
										// Workspace - Started
										midPageController.onDiscard().then(() => {
											viewModel.setProperty("/skipPageRefresh", true);
											setTimeout(function () {
												viewModel.setProperty("/skipPageRefresh", false);
												history.go(-1);
											}, 1000);
										});
										// 138624 - Changes for
										// Performance Improvement
										// During Save and Refresh in
										// Workspace - Ended
									} else {
										oController.noBackPlease();
										sap.ui.core.BusyIndicator.hide();
									}
								}
							});
						} else if (currentRoute == "Detail" && modelChanged && viewModel.getProperty("/previousRoute") == "DetailDetail") {
							oController.noBackPlease();
						} else if (currentRoute == "Detail" && viewModel.getProperty("/detaildetailRoute") && !viewModel.getProperty("/summaryGroupCase")) {
							oController.onDiscard();
						} else if (currentRoute == "Worklist") {
							viewModel.setProperty("/fromSaveBackActionRequired", true);
							oController.onDiscard();
						}
					}
				} else {
					viewModel.setProperty("/preventHashChange", false);
				}
			}



		},
		registerResizeHandler: function (smartTable, layout) {
			var oController = this;
			if (!oController._sResizeHandlerId && layout) {
				oController._sResizeHandlerId = ResizeHandler.register(layout, oController.adjustGridHeight.bind(smartTable));

			}
		},
		adjustGridHeight: function (oEvent) {
			var oSmartTable = this, htmDivParentTop, cssStringCalc;
			var oView = oSmartTable.getParent();
			while (!(oView instanceof sap.ui.core.mvc.XMLView)) {
				oView = oView.getParent();
			}
			var oController = oView.getController();
			if (!oController._sResizeHandlerId) {
				return;
			}
			window.setTimeout(function () {
				//				oSmartTable.getTable().setVisibleRowCount(Math.ceil(oEvent.size.height/27));
				if (oSmartTable.getTable() &&
					oSmartTable.getTable().$().length > 0) {
					htmDivParentTop = $('.' + "vistexResponsiveSplitterMainPanel")[0].getBoundingClientRect().top;
					cssStringCalc = "calc(100vh - 25px - " + Math.ceil(htmDivParentTop) + "px)";
					//					oSmartTable.$().find('.sapUiTableCnt').css("height", cssStringCalc);
					var cellHeight = oSmartTable.$().find('.sapUiTableRow')[1].style["height"];
					cellHeight = cellHeight.split("px")[0];
					var changedHeight = oEvent.size.height - oEvent.oldSize.height;
					if (changedHeight != 0) {
						var newCells = changedHeight / parseInt(cellHeight);
						newCells = oSmartTable.getTable().getVisibleRowCount() + newCells;
						oSmartTable.getTable().setVisibleRowCount(Math.floor(newCells));
					}
					//					var noofR0ws = (oEvent.size.height - Math.ceil(htmDivParentTop) -
					//					2)/cellHeight;
					//					noofR0ws = Math.floor(noofR0ws);
					//					oSmartTable.getTable().setVisibleRowCount(noofR0ws);
				}
			}, 100);
		},
		onExit: function () {
			var oController = this;
			//			if(sap.ui.getCore().byId("backBtn"))
			//			sap.ui.getCore().byId("backBtn").mEventRegistry.press[0].fFunction =
			//			oController.fBackButton;

			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			var urlParameters = {};

			if (viewModel.getProperty("/pageDestroyFromCreateView")) {
				viewModel.setProperty("/pageDestroyFromCreateView", false);
				return;
			}

			var functionImport = oMetaModel.getODataFunctionImport('CANCEL');
			if (functionImport && functionImport.parameter) {
				var length = functionImport.parameter.length;
			}
			if (length > 0) {
				var object = oController.getView().getBindingContext().getObject();
				for (var i = 0; i < length; i++) {
					urlParameters[functionImport.parameter[i].name] = object[functionImport.parameter[i].name];
				}
			}
			//			var currentSectionId =
			//			oController.getView().getContent()[0].getSelectedSection();
			//			var currentSection = oController.getView().byId(currentSectionId);
			//			var dynamicSideContent =
			//			currentSection.getSubSections()[0].getBlocks()[0].getContent()[0];
			urlParameters["infocus_clear"] = true;
			urlParameters["exit"] = true;
			oModel.callFunction("/CANCEL", {
				method: "POST",
				urlParameters: urlParameters
			});
		},
		onBackToSearch: function () {
			var sPreviousHash = History.getInstance().getPreviousHash();
			if (sPreviousHash !== undefined) {
				history.go(-1);
			} else {
				this.getOwnerComponent().getRouter().navTo("Worklist", {}, true);
			}
		},

		onPreviousButton: function (oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			var currentPath = oEvent.getSource().getParent().getBindingContext().getPath();
			var currentRowId = currentPath.split("row_id='");
			currentRowId = currentRowId[1].split("',")[0];
			var currentRowIdLenght = currentRowId.length;
			var Id = parseInt(currentRowId);
			if (Id > 1) {
				Id--;
				var newRowId = Id.toString();
				while (newRowId.length < currentRowIdLenght) {
					newRowId = 0 + newRowId;
				}
				var newPath = currentPath.replace(currentRowId, newRowId);
				oController.getView().bindElement(newPath);
			}

		},

		onNextButton: function (oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			var currentPath = oEvent.getSource().getParent().getBindingContext().getPath();
			var currentRowId = currentPath.split("row_id='");
			currentRowId = currentRowId[1].split("',")[0];
			var currentRowIdLenght = currentRowId.length;
			var Id = parseInt(currentRowId);
			var rowCount = viewModel.getProperty("/DetailPageMaxRows");
			if (Id < rowCount) {
				Id++;
				var newRowId = Id.toString();
				while (newRowId.length < currentRowIdLenght) {
					newRowId = 0 + newRowId;
				}
				var newPath = currentPath.replace(currentRowId, newRowId);
				oController.getView().bindElement(newPath);
			}
		},
		//		138624 - Changes for Performance Improvement During Save and Refresh in
		//		Workspace - Started
		onTableDrilldownNavigationClick: function (oEvent) {
			var oController = this;
			var oSource = oEvent.getSource();
			var listItem = oEvent.getParameter("listItem");
			var row = oEvent.getParameter("row");
			var viewModel = oController.getView().getModel("viewModel");
			var modelChanged = viewModel.getProperty("/modelChanged");
			var bundle = oController.getView().getModel("i18n").getResourceBundle();
			//			var currentRoute = viewModel.getProperty("/currentRoute");
			//			if(modelChanged) {
			//			MessageBox.confirm(bundle.getText('BACKTOWORKSPACE'), {
			//			title: bundle.getText('CONFIRM'),
			//			actions: [MessageBox.Action.YES, MessageBox.Action.NO],
			//			onClose: function (oAction) {
			//			oController.onDiscard().then(function(){
			//			viewModel.setProperty("/skipPageRefresh", true);
			//			setTimeout(function(){
			//			oController.onHandleTableDrilldown(oSource, listItem, row);
			//			},3000);

			//			// viewModel.setProperty("/processDrilldown", {oSource: oSource, listItem:
			//			listItem, row: row});
			//			});
			//			}
			//			});
			//			}else{
			oController.onHandleTableDrilldown(oSource, listItem, row);
			//			}
		},
		onHandleTableDrilldown: function (oSource, listItem, row) {
			//			138624 - Changes for Performance Improvement During Save and Refresh in
			//			Workspace - Ended
			var oController = this;
			//			var oSource = oEvent.getSource();
			var oModel = oController.getView().getModel();
			var viewModel = oController.getView().getModel("viewModel");

			var oSmartTable = oController.getSmartTableControl(oSource);
			var oTable = oSmartTable.getTable();

			var oSelected;
			//			138624 - Changes for Performance Improvement During Save and Refresh in
			//			Workspace - Started
			viewModel.setProperty("/skipPageRefresh", false);
			//			138624 - Changes for Performance Improvement During Save and Refresh in
			//			Workspace - Ended
			viewModel.setProperty("/DetailPageSet", false);
			var sEntitySet = oSmartTable.getEntitySet();

			if (listItem) {
				oSelected = listItem;
				if (sEntitySet == "IPB") {
					oTable.$().find(".vistexSelectedItemColor").removeClass("vistexSelectedItemColor");
					viewModel.setProperty("/selectedParentItemId", listItem.getId());
				}
			} else if (row) {
				oSelected = row;
				if (sEntitySet == "IPB") {
					oTable.$().find(".vistexSelectedItemColor").removeClass("vistexSelectedItemColor");
					viewModel.setProperty("/selectedParentItemId", row.getId());
				}
			} else {
				oSelected = oSource.getParent();
				//				viewModel.setProperty("/DetailDetailTitle",oEvent.getSource().getText());
			}



			viewModel.setProperty("/" + sEntitySet + "showSideContent", false);

			viewModel.setProperty("/DetailPageMainTablePath", "/" + sEntitySet + "showSideContent");
			var oMetaModel = oModel.getMetaModel();
			var oEntityType = oMetaModel.getODataEntityType(oMetaModel.getODataEntitySet(sEntitySet).entityType);
			var oContext = oSelected.getBindingContext();
			if (oContext.getObject() && oContext.getObject().errcd) {
				viewModel.setProperty("/parentData", oContext.getObject());
				//Triggering metadata request
				var cellProperties = _.find(oEntityType["property"], {
					name: 'errcd',
				});
				var errDescr = oModel.getProperty("/" + oContext.getObject()[cellProperties["sap:text"].split("/")[0]].__ref)[cellProperties["sap:text"].split("/")[1]];
				viewModel.setProperty("/errDescr", errDescr);
				//Triggering metadata request
				//viewModel.setProperty("/parentData", oContext.getObject());
			}
			// calc table changes
			// if (oEntityType["com.sap.vocabularies.UI.v1.Facets"] == undefined)
			// 	return;

			oController.removeTransientMessages();

			var errorMessages = oController.checkErrorMessageExist(oModel);
			if (errorMessages) {
				oController.showMessagePopover(oController.messageButtonId);
				return;
			} else {
				//				if(oTable.setSelectedIndex) {
				//				oTable.setSelectedIndex(oSelected.getIndex());
				//				}else{
				//				oTable.removeSelections()
				//				oTable.setSelectedItem(oSelected);
				//				}
				if (oEntityType["vui.bodc.workspace.SummaryGroup"]) {
					viewModel.setProperty("/fromInprocess", false);
					viewModel.setProperty("/summaryGroupCase", true);
					var oObject = oContext.getObject();
					var newPath = oObject.sectn + "_PRX(row_id='" + encodeURI(oObject.row_id) + "')";
					oController.onDrillDown(sEntitySet, oContext, oSmartTable, oSelected, newPath);
					viewModel.setProperty("/fromSummaryGroup", true);
					viewModel.setProperty("/inprocessCase", false);
					viewModel.setProperty("/summaryGroupChildEntity", oObject.sectn + "_PRX");
				} else if (sEntitySet == "IPB") {
					var oObject = oContext.getObject();// oObject.sectn
					var newPath = oObject.req_sectn + "_PRX(row_id='" + encodeURI(oObject.row_id) + "')";
					oController.onDrillDown(sEntitySet, oContext, oSmartTable, oSelected, newPath);
					viewModel.setProperty("/fromInprocess", true);
					viewModel.setProperty("/inprocessCase", true);
					viewModel.setProperty("/inprocessRequestedEntity", oObject.sectn + "_PRX");
				} else {
					viewModel.setProperty("/fromSummaryGroup", false);
					if (oEntityType["vui.bodc.workspace.SwitcherSectionRelation"]) {
						var arr = oEntityType["vui.bodc.workspace.SwitcherSectionRelation"].String.split("/");
						if (arr[1]) {
							var sPath = oContext.getPath().slice(1);
							var replaceText = arr[1] + "__" + arr[0] + "_PRX"
							sPath = sPath.replace(sEntitySet, replaceText);
							if (!viewModel.getProperty("/switcherSectionRelations")) {
								viewModel.setProperty("/switcherSectionRelations", {})
							}
							viewModel.setProperty("/switcherSectionRelations/" + replaceText, true);
							oController.onDrillDown(sEntitySet, oContext, oSmartTable, oSelected, sPath);
						} else {
							oController.onDrillDown(sEntitySet, oContext, oSmartTable, oSelected);
						}
					} else {
						oController.onDrillDown(sEntitySet, oContext, oSmartTable, oSelected);
					}
				}
			}
		},

		onCallAction: function (oEvent) {
			var oController = this;
			oController.removeTransientMessages();
			sap.ui.core.BusyIndicator.show(0);

			var oModel = oController.getView().getModel();
			var errorMessages = oController.checkErrorMessageExist(oModel);
			if (errorMessages) {
				sap.ui.core.BusyIndicator.hide();
				oController.showMessagePopover(oController.messageButtonId);
				return;
			} else {
				var oMetaModel = oModel.getMetaModel();
				var oContext = oController.getView().getBindingContext();
				var object = oContext.getObject();

				var urlParameters = {};

				var oButton = oEvent.getSource();
				var functionName = oButton.data("Action");

				var functionImport = oMetaModel.getODataFunctionImport(functionName);
				var length = functionImport.parameter.length;

				urlParameters["_row_id"] = object.row_id;

				oModel.callFunction("/" + functionImport.name, {
					method: "POST",
					urlParameters: urlParameters,
					success: function (oData, response) {
						oModel.read(oContext.getPath());
						sap.ui.core.BusyIndicator.hide();
						var messageExists = oController.checkResponseForMessages(oData, response);
						if (messageExists) {
							setTimeout(function () {
								oController.showMessagePopover(oController.messageButtonId);
							}, 1000);
						}
					},
					error: function (oData, response) {
						sap.ui.core.BusyIndicator.hide();
						setTimeout(function () {
							oController.showMessagePopover(oController.messageButtonId);
						}, 1000);
					}
				});
			}
		},

		onItemPress: function (oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = this.getView().getModel("viewModel");
			var oSource = oEvent.getSource();
			var oSmartTable = oController.getSmartTableControl(oSource);
			var sEntitySet = oSmartTable.getEntitySet();
			var showingSideContent = viewModel.getProperty("/" + sEntitySet + "showingSideContent");

			oController.onCloseTableDSC(oEvent);
			oController.onTableDrilldownNavigationClick(oEvent);
		},

		onListNavigate: function (oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = this.getView().getModel("viewModel");
			var oSource = oEvent.getSource();
			var oSmartTable = oController.getSmartTableControl(oSource);
			var sEntitySet = oSmartTable.getEntitySet();
			var showingSideContent = viewModel.getProperty("/" + sEntitySet + "showingSideContent");

			oController.onCloseTableDSC(oEvent);
			oController.onTableDrilldownNavigationClick(oEvent);
		},


		onRowEdit: function (oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var viewModel = oController.getView().getModel("viewModel");

			var oRow = oEvent.getParameter("row");
			//			sap.ui.core.BusyIndicator.show(0);

			var oSmartTable = oRow.getParent().getParent();
			var sEntitySet = oSmartTable.getEntitySet();
			oController.removeTransientMessages();

			var errorMessages = oController.checkErrorMessageExist(oModel);
			if (errorMessages) {
				oController.showMessagePopover(oController.messageButtonId);
				return;
			} else {
				var oContext = oRow.getBindingContext();
				var object = oContext.getObject();

				var oMetaModel = oModel.getMetaModel();

				var functionImport = oMetaModel.getODataFunctionImport(sEntitySet + "_LOCK");

				var urlParameters = {};
				urlParameters["_row_id"] = object.row_id;

				oModel.callFunction("/" + functionImport.name, {
					method: "POST",
					batchGroupId: "changes",
					urlParameters: urlParameters
				});
				oModel.submitChanges({
					batchGroupId: "changes",
					success: function (oData, response) {
						oController.showMessagePopover(oController.messageButtonId);
						//						sap.ui.core.BusyIndicator.hide();\
						oModel.read(oContext.getPath());
						var messageExists = oController.checkResponseForMessages(oData, response);
						if (messageExists) {
							setTimeout(function () {
								oController.showMessagePopover(oController.messageButtonId);
							}, 1000);
						}
					},
					error: function (oData, response) {
						//						sap.ui.core.BusyIndicator.hide();
						setTimeout(function () {
							oController.showMessagePopover(oController.messageButtonId);
						}, 1000);
					}
				});
			}
		},

		onResponsiveAddToFilter: function (oEvent) {
			var oController = this;
			var oContext = oEvent.getSource().getParent().getBindingContext();
			var oSmartTable = oController.getSmartTableControl(oEvent.getSource());
			oController.addToFilter(oContext, oSmartTable);
		},

		onAddFilter: function (oEvent) {
			var oController = this;
			var oRow = oEvent.getParameter("row");

			var oSmartTable = oRow.getParent().getParent();
			var oContext = oRow.getBindingContext();

			oController.addToFilter(oContext, oSmartTable);
		},

		addToFilter: function (oContext, oSmartTable) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var viewModel = oController.getView().getModel("viewModel");

			oController.removeTransientMessages();

			var errorMessages = oController.checkErrorMessageExist(oModel);
			if (errorMessages) {
				oController.showMessagePopover(oController.messageButtonId);
				return;
			} else {

				var object = oContext.getObject();

				var oMetaModel = oModel.getMetaModel();

				var sEntitySet = oSmartTable.getEntitySet();

				var functionImport = oMetaModel.getODataFunctionImport(sEntitySet + "_ADD_FILTER");

				var urlParameters = {};
				urlParameters["_row_id"] = object.row_id;

				oModel.callFunction("/" + functionImport.name, {
					method: "POST",
					batchGroupId: "changes",
					urlParameters: urlParameters
				});
				oModel.submitChanges({
					batchGroupId: "changes",
					success: function (oData, response) {
						oController.showMessagePopover(oController.messageButtonId);
						oModel.refresh();

						var entst = "";
						if (oData && oData.__batchResponses && oData.__batchResponses.length > 0) {
							for (var i = 0; i < oData.__batchResponses.length; i++) {
								if (oData.__batchResponses[i].__changeResponses && oData.__batchResponses[i].__changeResponses.length) {
									for (var j = 0; j < oData.__batchResponses[i].__changeResponses.length; j++) {
										if (oData.__batchResponses[i].__changeResponses[j].data) {
											entst = oData.__batchResponses[i].__changeResponses[j].data.entst;
											break;
										}
									}
								}
								if (entst != "")
									break;
							}
							if (entst != "") {
								var aChildEntities = entst.split(",");
								oController.addMessageStrip(aChildEntities, oSmartTable);
							}
						}
					},
					error: function (oData, response) {
						//						sap.ui.core.BusyIndicator.hide();
						setTimeout(function () {
							oController.showMessagePopover(oController.messageButtonId);
						}, 1000);
					}
				});
			}
		},

		addMessageStrip: function (aChildEntities, oSmartTable) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");

			var aDocumentFilters = viewModel.getProperty("/aDocFilters");
			if (aDocumentFilters == null)
				aDocumentFilters = [];

			var entitySet = oSmartTable.getEntitySet();
			var oDocFilter = _.findWhere(aDocumentFilters, { entitySet: entitySet });

			var sChildEntitiesLabel = "";
			var oBundle = this.getView().getModel("i18n").getResourceBundle();

			if (oDocFilter == null || oDocFilter == undefined) {
				oDocFilter = {};
				oDocFilter.entitySet = entitySet;
				oDocFilter.children = [];

				var oSubSection = oSmartTable.getParent();
				while (true) {
					if (oController.isControlOfType(oSubSection, "sap/uxap/ObjectPageSubSection"))
						break;
					else
						oSubSection = oSubSection.getParent();
				}
				var sParentLabel = oSubSection.data("Label");

				var aSections;
				var oObjectPageLayout = oController.getView().getContent()[0];
				while (true) {
					if (oObjectPageLayout.getSections) {
						aSections = oObjectPageLayout.getSections();
						break;
					} else {
						oObjectPageLayout = oObjectPageLayout.getContent()[0];
					}
				}

				_.each(aSections, function (oSection) {
					_.each(oSection.getSubSections(), function (oSubSection) {
						var oBlock = oSubSection.getBlocks()[0];
						_.each(oBlock.getContent(), function (oControl) {
							if (oController.isControlOfType(oControl, "sap/ui/layout/DynamicSideContent")) {
								var aMainContent = oControl.getMainContent();
								for (var y = 0; y < aMainContent.length; y++) {
									if (oController.isSmartTable(aMainContent[y])) {
										var index = _.indexOf(aChildEntities, aMainContent[y].getEntitySet());
										if (index != -1) {
											var sectionLabel = oSubSection.data("Label");
											var text = oBundle.getText("sectionFilteredByParent", [sectionLabel, sParentLabel]);
											if (sChildEntitiesLabel == "")
												sChildEntitiesLabel = sectionLabel;
											else
												sChildEntitiesLabel = sChildEntitiesLabel + "/" + sectionLabel;

											oDocFilter.children.push({
												entitySet: aMainContent[y].getEntitySet(),
												text: text,
												label: sectionLabel
											});
										}
									}
								}
							} else if (oController.isControlOfType(oControl, "sap/ui/layout/ResponsiveSplitter")) {
								var aMainContent = oControl.getRootPaneContainer().getPanes()[0].getContent().getContent()[0].getContent();
								for (var y = 0; y < aMainContent.length; y++) {
									if (oController.isSmartTable(aMainContent[y])) {
										var index = _.indexOf(aChildEntities, aMainContent[y].getEntitySet());
										if (index != -1) {
											var sectionLabel = oSubSection.data("Label");
											var text = oBundle.getText("sectionFilteredByParent", [sectionLabel, sParentLabel]);
											if (sChildEntitiesLabel == "")
												sChildEntitiesLabel = sectionLabel;
											else
												sChildEntitiesLabel = sChildEntitiesLabel + "/" + sectionLabel;

											oDocFilter.children.push({
												entitySet: aMainContent[y].getEntitySet(),
												text: text,
												label: sectionLabel
											});
										}
									}
								}
							} else if (oController.isSmartTable(oControl)) {
								var index = _.indexOf(aChildEntities, oControl.getEntitySet());
								if (index != -1) {
									var sectionLabel = oSubSection.data("Label");
									var text = oBundle.getText("sectionFilteredByParent", [sectionLabel, sParentLabel]);
									if (sChildEntitiesLabel == "")
										sChildEntitiesLabel = sectionLabel;
									else
										sChildEntitiesLabel = sChildEntitiesLabel + "/" + sectionLabel;

									oDocFilter.children.push({
										entitySet: oControl.getEntitySet(),
										text: text,
										label: sectionLabel
									});
								}
							}
						});
					});
				});
				aDocumentFilters.push(oDocFilter);
				viewModel.setProperty("/aDocFilters", aDocumentFilters);
				viewModel.setProperty("/aDocFiltersLength", aDocumentFilters.length);
			} else {
				for (var i = 0; i < oDocFilter.children.length; i++) {
					if (sChildEntitiesLabel == "")
						sChildEntitiesLabel = oDocFilter.children[i].label;
					else
						sChildEntitiesLabel = sChildEntitiesLabel + "/" + oDocFilter.children[i].label;
				}
			}
			var message = oBundle.getText("additionalFilterApplied", [sChildEntitiesLabel]);
			MessageToast.show(message);
		},

		onCancel: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var modelChanged = viewModel.getProperty("/modelChanged");

			if (modelChanged) {
				var DiscardButton = new sap.m.Button({
					text: "{i18n>DISCARD}",
					width: "120px",
					press: [oController.onDiscard, oController]
				});
				var DiscardChangesText = new sap.m.Text({
					text: "{i18n>DISCARDCHANGES}"
				});
				var cancelPopover = new sap.m.Popover({
					showHeader: false,
					contentWidth: "150px",
					contentHeight: "60px",
					content: [new sap.m.VBox({
						alignItems: "Center",
						alignContent: "Center",
						items: [DiscardChangesText, DiscardButton]
					})
					],
					placement: "Top"
				});
				oController.getView().addDependent(cancelPopover);
				cancelPopover.openBy(oEvent.getSource());
			} else {
				oController.onDiscard();
			}
		},
		//Triggering metadata request
		onDiscard: function (oEvent, callBackFunction) {
			//Triggering metadata request
			var oController = this;
			sap.ui.core.BusyIndicator.show(0);
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getView().getModel("viewModel");
			//			var columnModel = oController.getView().getModel("columnModel");
			var urlParameters = {};

			var functionImport = oMetaModel.getODataFunctionImport('CANCEL');
			if (functionImport && functionImport.parameter) {
				var length = functionImport.parameter.length;
			}
			if (length > 0 && oController.getView().getBindingContext && oController.getView().getBindingContext()) {
				var object = oController.getView().getBindingContext().getObject();
				for (var i = 0; i < length; i++) {
					urlParameters[functionImport.parameter[i].name] = object[functionImport.parameter[i].name];
				}
			}
			//			var currentSectionId =
			//			oController.getView().getContent()[0].getSelectedSection();
			//			var currentSection = oController.getView().byId(currentSectionId);
			//			var dynamicSideContent =
			//			currentSection.getSubSections()[0].getBlocks()[0].getContent()[0];
			//			138624 - Changes for Performance Improvement During Save and Refresh in
			//			Workspace - Started
			return new Promise(function (resolve, reject) {
				oModel.callFunction("/CANCEL", {
					method: "POST",
					urlParameters: urlParameters,
					success: function (oData, response) {
						var uiModel = oController.getView().getModel("ui");
						var viewModel = oController.getView().getModel("viewModel");
						var sections = oController.getView().getContent()[0].getContent()[0].getSections();
						var filterBar;
						if (oController.getView().getContent()[0].getContent()[0] && oController.getView().getContent()[0].getContent()[0].getHeaderContent &&
							oController.getView().getContent()[0].getContent()[0].getHeaderContent()[0] &&
							oController.getView().getContent()[0].getContent()[0].getHeaderContent()[0].getContent &&
							oController.getView().getContent()[0].getContent()[0].getHeaderContent()[0].getContent()[0] &&
							oController.getView().getContent()[0].getContent()[0].getHeaderContent()[0].getContent()[0].getItems &&
							oController.getView().getContent()[0].getContent()[0].getHeaderContent()[0].getContent()[0].getItems()[0] &&
							oController.getView().getContent()[0].getContent()[0].getHeaderContent()[0].getContent()[0].getItems()[0] instanceof sap.ui.comp.smartfilterbar.SmartFilterBar) {
							filterBar = oController.getView().getContent()[0].getContent()[0].getHeaderContent()[0].getContent()[0].getItems()[0];
						}

						//						uiModel.setProperty("/editable",false);
						viewModel.setProperty("/modelChanged", false);
						// confirmation popup changes nav from launchpad
						if (parent && parent.commonUtils && parent.commonUtils.dataChanged) {
							parent.commonUtils.dataChanged = false;
						}
						// confirmation popup changes nav from launchpad
						viewModel.setProperty("/skipPageRefresh", false);
						viewModel.setProperty("/dataChangedInPreviousRoute", false);
						viewModel.setProperty("/navBackOnSAVnRef", false);
						oController.getView().getContent()[0].getContent()[0]._$footerWrapper.addClass("vistexHideFooterWrapper");// for
						// hiding
						// footerWrapper
						if (viewModel.getProperty("/currentRoute") == "Detail") {
							viewModel.setProperty("/skipPageRefresh", false);
						}
						// for clearing flags used for navback during selectAll
						// and save and refresh
						oController.clearNavBackOnSAVnRef();
						//	Manual Correction Changes - start
						delete oController.correction_row_id;
						//	Manual Correction Changes - end
						oController.removenoBackHash();
						_.each(sections, function (section) {
							if (section.getSubSections()[0] && section.getSubSections()[0].getBlocks()[0] &&
								section.getSubSections()[0].getBlocks()[0]) {
								//								var dynamicSideContent =
								//								section.getSubSections()[0].getBlocks()[0].getContent()[0];
								//								if(!dynamicSideContent.getMainContent){
								//								dynamicSideContent =
								//								section.getSubSections()[0].getBlocks()[0].getContent()[1];
								//								}
								var dynamicSideContent;
								if (oController.isControlOfType(section.getSubSections()[0].getBlocks()[0].getContent()[0], "sap/ui/layout/ResponsiveSplitter")) {
									dynamicSideContent = oController.getResponsiveSplitter(section.getSubSections()[0].getBlocks()[0].getContent()[0]);
								} else {
									dynamicSideContent = oController.getResponsiveSplitter(section.getSubSections()[0].getBlocks()[0].getContent()[1]);
								}
								if (dynamicSideContent.getMainContent) {
									oController.onClosingDscSideContent(dynamicSideContent);
									if (dynamicSideContent.getMainContent()[1]) {
										var mainContentTable = dynamicSideContent.getMainContent()[1].getTable();
										dynamicSideContent.getMainContent()[1].data("optimized", false);
									} else {
										var mainContentTable = dynamicSideContent.getMainContent()[0].getTable();
										dynamicSideContent.getMainContent()[0].data("optimized", false);
									}
									if (mainContentTable.getRows) {
										mainContentTable.clearSelection();
									} else {
										mainContentTable.removeSelections();
									}
									var sEntitySet = mainContentTable.getParent().getEntitySet();
									//		Manual Correction Changes - start
									viewModel.setProperty("/addCorrectionLines" + sEntitySet, false);
									viewModel.setProperty("/" + sEntitySet + "showDscCorrectionLines", false);
									//		Manual Correction Changes - end
									// for back action during selectall and save
									// & refresh for summary
									oController.clearNavBackOnSAVnRef();
								}
							}
						});
						if (viewModel.getProperty("/fromSaveRefreshAction")) {
							//							oModel.invalidate();
							//							oController.getOwnerComponent().getModel().refresh();
							//							oModel.refresh();
							//							viewModel.setProperty("/fromSaveRefreshAction",false);
							//							viewModel.setProperty("/fromSaveBackActionRequired",false);
							//							setTimeout(function(){
							//							oController.optimizeSmartTable(oSmartTable);
							//							}, 1000);
						} else if (!viewModel.getProperty("/fromSaveBackActionRequired")) {
							oModel.invalidate();
							oModel.resetChanges();
							if (!viewModel.getProperty("/skipModelRefreshInDiscard")) {
								/*
								 * if(viewModel.getProperty("/currentRoute") ==
								 * "DetailDetail"){ var detailModel =
								 * oController.getOwnerComponent().getModel(); var
								 * detailMetaModel =
								 * detailModel.getMetaModel(),summryGroupEntity; var
								 * wrkspctype =
								 * detailMetaModel.getODataEntityType(detailMetaModel.getODataEntitySet("WorkspaceView").entityType);
								 * for(var i = 0; i<
								 * wrkspctype.navigationProperty.length; i++){ var
								 * childEntityType =
								 * detailMetaModel.getODataEntityType(detailMetaModel.getODataAssociationEnd(wrkspctype,wrkspctype.navigationProperty[i].name).type);
								 * if(childEntityType["vui.bodc.workspace.SummaryGroup"] &&
								 * childEntityType["vui.bodc.workspace.SummaryGroup"].Bool &&
								 * childEntityType["vui.bodc.workspace.SummaryGroup"].Bool ==
								 * "true"){ summryGroupEntity =
								 * childEntityType.name.split("Type")[0]; break; } }
								 * if(summryGroupEntity){ var urlparams =
								 * oController.readQueryPrepare(summryGroupEntity);
								 * urlparams["$skip"] = "0"; urlparams["$top"] =
								 * "100"; detailModel.read("/" + summryGroupEntity,{
								 * urlParameters: urlparams, success:
								 * function(odata,results){ oModel.refresh();
								 * oController.refreshKPITagEntity(); } }) }else{
								 * oModel.refresh();
								 * oController.refreshKPITagEntity(); } }else{
								 */
								//								oModel.refresh();
								if (filterBar) {
									filterBar.fireSearch();
								} else {
									oController.refreshTableEntitiesData();
								}
								//								oController.refreshKPITagEntity();
								//								}
							} else {
								viewModel.setProperty("/skipModelRefreshInDiscard", false);
							}
							//							oController.refreshTableEntitiesData();
						} else if (viewModel.getProperty("/fromSaveBackActionRequired")) {
							viewModel.setProperty("/fromSaveBackActionRequired", false);
						}
						if (viewModel.getProperty("/fromSaveDNCMessage")) {
							viewModel.setProperty("/fromSaveDNCMessage", false);
						} else {
							oController.removeMessages(oController);
						}

						//						oController.onClosingDscSideContent(dynamicSideContent);
						//						history.go(-1);

						if (viewModel.getProperty("/currentRoute") == "Worklist") {
							var flexibleColumnLayout = oController.getOwnerComponent().getRootControl().byId("idAppControl");
							var beginPage = flexibleColumnLayout.getBeginColumnPages().find(function (page) { return page.getViewName() == "vui.workspace.view.Detail" });
							var beginPageModel = beginPage.getModel();
							var url = beginPageModel.sServiceUrl;
							url = url + '?sap-terminate=session';
							if ("sendBeacon" in navigator) {
								navigator.sendBeacon(url);
							} else {
								$.ajax({
									url: url,
									async: false
								});
							}
						}
						/* ****Task 130330 - Changes for alternate views for summary in workspace - Changes Started	 */
						if (viewModel.getProperty("/performSummarySwitchAfterSave")) {
							viewModel.setProperty("/skipPageRefresh", true);
							oController.performSummarySwitch(viewModel.getProperty("/performSummarySwitchAfterSave"));
							viewModel.setProperty("/performSummarySwitchAfterSave");
						}
						/* ****Task 130330 - Changes for alternate views for summary in workspace - Changes Ended	*/
						sap.ui.core.BusyIndicator.hide();
						//Triggering metadata request
						setTimeout(function () {
							if (callBackFunction) {
								callBackFunction();
							}
						}, 1000);
						//Triggering metadata request
						resolve();

					},
					error: function (oData, response) {
						sap.ui.core.BusyIndicator.hide();
						setTimeout(function () {
							oController.showMessagePopover(oController.messageButtonId);
						}, 1000);
						reject();
					}
				});
			});
			//			138624 - Changes for Performance Improvement During Save and Refresh in
			//			Workspace - Ended
		},

		onSave: function (oEvent) {

			var oController = this;

			oController.removeTransientMessages();

			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getOwnerComponent().getModel("viewModel");
			var uiModel = oController.getView().getModel("ui");
			var bundle = oController.getView().getModel("i18n").getResourceBundle();
			var urlParameters = {};
			var section = oController.getView().getContent()[0].getContent()[0]._oCurrentTabSection;
			var dynamicSideContent = oController.getResponsiveSplitter(section.getSubSections()[0].getBlocks()[0].getContent()[0]);
			var oSmartTable = dynamicSideContent.getMainContent()[0];
			var sEntitySet = oSmartTable.getEntitySet();

			var currentPageLevel = viewModel.getProperty("/currentDetailPageLevel");

			var errorMessages = oController.checkErrorMessageExist(oModel);
			if (errorMessages) {
				sap.ui.core.BusyIndicator.hide();
				oController.showMessagePopover(oController.messageButtonId);
				return;
			} else {
				var functionImportName = oEvent.getSource().data("FImport");
				var functionImport = oMetaModel.getODataFunctionImport(functionImportName);
				if (functionImport.parameter) {
					var length = functionImport.parameter.length;
				}
				if (length > 0) {
					var object = oController.getView().getBindingContext().getObject();
					for (var i = 0; i < length; i++) {
						urlParameters[functionImport.parameter[i].name] = object[functionImport.parameter[i].name];
					}
				}

				if (functionImport["vui.bodc.workspace.ActionProperties"] &&
					functionImport["vui.bodc.workspace.ActionProperties"]["ConfirmationPopup"] &&
					functionImportName != "SAVE" && functionImportName != "SAVE_AS_RUN" &&
					functionImportName != "SAV_RUN_N_REFR") {
					oModel.read("/Message_Data(action='" + functionImport.name + "')", {
						success: function (oData, response) {
							MessageBox.confirm(oData.message, {
								title: bundle.getText('CONFIRM'),
								actions: [MessageBox.Action.YES, MessageBox.Action.NO],
								onClose: function (oAction) {
									if (oAction == 'YES') {
										sap.ui.core.BusyIndicator.show(0);
										oController.processSaveAction(functionImportName, urlParameters);
										//										oModel.callFunction("/" + functionImportName, {
										//										method: "POST",
										//										urlParameters: urlParameters,
										//										success : function(oData,response) {
										//										var backAction = false;
										//										if(functionImport["vui.bodc.workspace.ActionProperties"] &&
										//										functionImport["vui.bodc.workspace.ActionProperties"]["ActionType"] &&
										//										functionImport["vui.bodc.workspace.ActionProperties"]["ActionType"].String ==
										//										"Back"){
										//										backAction = true;
										//										viewModel.setProperty("/fromSaveBackActionRequired",true);
										//										}
										//										// var viewModel = oController.getView().getModel("viewModel");
										//										viewModel.setProperty("/modelChanged",false);
										//										viewModel.setProperty("/dataChangedInPreviousRoute",false);
										//										oController.getView().getContent()[0].getContent()[0]._$footerWrapper.addClass("vistexHideFooterWrapper");//for
										//										hiding footerWrapper
										//										if(viewModel.getProperty("/currentRoute") == "Detail"){
										//										viewModel.setProperty("/skipPageRefresh",true);
										//										}
										//										if(functionImportName == "SAVE" || functionImportName == "SAVE_AS_RUN"){
										//										viewModel.setProperty("/saveOnDetailPerformed",true);
										//										}
										//										oController.removenoBackHash();
										//										// oModel.invalidate();
										//										// oModel.refresh(true);
										//										sap.ui.core.BusyIndicator.hide();
										//										viewModel.setProperty("/fromSaveDNCMessage",true);
										//										if(backAction){
										//										oController.onDiscard();
										//										setTimeout(function(){
										//										if(viewModel.getProperty("/currentRoute") == "DetailDetail"){
										//										history.go(- currentPageLevel - 2);
										//										}else{
										//										oController.onBackToSearch();
										//										}
										//										}, 3000);
										//										}else{
										//										var messageExists = oController.checkResponseForMessages(oData,response);
										//										if(messageExists){
										//										setTimeout(function(){
										//										oController.showMessagePopover(oController.messageButtonId);
										//										oController.onDiscard();
										//										}, 1000);
										//										}else{
										//										oController.onDiscard();
										//										}
										//										}
										//										},
										//										error : function(oData,response){
										//										sap.ui.core.BusyIndicator.hide();
										//										setTimeout(function(){
										//										oController.showMessagePopover(oController.messageButtonId);
										//										}, 1000);
										//										}
										//										});
									}
								}
							});
						}
					});
				} else {
					sap.ui.core.BusyIndicator.show(0);
					oController.processSaveAction(functionImportName, urlParameters);
					//					oModel.callFunction("/" + functionImportName, {
					//					method: "POST",
					//					urlParameters: urlParameters,
					//					success : function(oData,response) {
					//					var backAction = false;
					//					if(functionImport["vui.bodc.workspace.ActionProperties"] &&
					//					functionImport["vui.bodc.workspace.ActionProperties"]["ActionType"] &&
					//					functionImport["vui.bodc.workspace.ActionProperties"]["ActionType"].String ==
					//					"Back" ){
					//					if(functionImportName != "SAV_RUN_N_REFR"){
					//					backAction = true;
					//					viewModel.setProperty("/fromSaveBackActionRequired",true);
					//					}else if(viewModel.getProperty("/currentRoute") == "DetailDetail"){
					//					viewModel.setProperty("/fromSaveRefreshAction",true);
					//					viewModel.setProperty("/fromSaveBackActionRequired",true);
					//					}
					//					}
					//					viewModel.setProperty("/modelChanged",false);
					//					oController.getView().getContent()[0].getContent()[0]._$footerWrapper.addClass("vistexHideFooterWrapper");//for
					//					hiding footerWrapper
					//					if(viewModel.getProperty("/currentRoute") == "Detail"){
					//					viewModel.setProperty("/skipPageRefresh",true);
					//					}
					//					if(functionImportName == "SAVE" || functionImportName == "SAVE_AS_RUN"){
					//					viewModel.setProperty("/saveOnDetailPerformed",true);
					//					}
					//					oController.removenoBackHash();
					//					// oModel.invalidate();
					//					// oModel.refresh(true);
					//					sap.ui.core.BusyIndicator.hide();
					//					viewModel.setProperty("/fromSaveDNCMessage",true);
					//					if(backAction){
					//					oController.onDiscard();
					//					setTimeout(function(){
					//					if(viewModel.getProperty("/currentRoute") == "DetailDetail"){
					//					history.go(- currentPageLevel - 2);
					//					}else{
					//					oController.onBackToSearch();
					//					}
					//					}, 3000);
					//					}else{
					//					if(viewModel.getProperty("/currentRoute") == "DetailDetail" &&
					//					functionImportName == "SAV_RUN_N_REFR"){
					//					var previouslyChanged = viewModel.getProperty("/dataChangedInPreviousRoute");
					//					var selectAllPerformed = viewModel.getProperty("/navBackOnSAVnRef");
					//					setTimeout(function(){
					//					if(previouslyChanged){
					//					viewModel.setProperty("/dataChangedInPreviousRoute",false);
					//					history.go(- currentPageLevel - 1);
					//					}else if(selectAllPerformed){
					//					viewModel.setProperty("/navBackOnSAVnRef",false);
					//					// history.go(-1)
					//					history.go(- currentPageLevel - 1);
					//					}
					//					}, 3000);
					//					viewModel.setProperty("/skipModelRefreshInDiscard",true);
					//					}
					//					var messageExists = oController.checkResponseForMessages(oData,response);
					//					if(messageExists){
					//					setTimeout(function(){
					//					oController.showMessagePopover(oController.messageButtonId);
					//					oController.onDiscard();
					//					}, 1000);
					//					}else{
					//					oController.onDiscard();
					//					}
					//					}
					//					},
					//					error : function(oData,response){
					//					sap.ui.core.BusyIndicator.hide();
					//					setTimeout(function(){
					//					oController.showMessagePopover(oController.messageButtonId);
					//					}, 1000);
					//					}
					//					});
				}
			}
		},
		processSaveAction: function (functionImportName, urlParameters) {
			var oController = this;
			var oContent = new sap.m.Panel();
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getOwnerComponent().getModel("viewModel");
			var oBatchMetricEntity = oMetaModel.getODataEntitySet("BATCH_METRIC");
			if (oBatchMetricEntity) {
				var oBatchMetricEntityType = oMetaModel.getODataEntityType(oBatchMetricEntity.entityType);
			}

			if (oBatchMetricEntityType && oBatchMetricEntityType["vui.bodc.workspace.BatchMetrics"] &&
				(functionImportName == "SAVE_AS_RUN" || functionImportName == "SAV_RUN_N_REFR")) {
				var oForm = new sap.ui.layout.form.SimpleForm({
					layout: "ResponsiveGridLayout",
					labelSpanXL: 3,
					labelSpanL: 3,
					labelSpanM: 3,
					labelSpanS: 4,
					adjustLabelSpan: false,
					emptySpanXL: 4,
					emptySpanL: 4,
					emptySpanM: 4,
					emptySpanS: 0,
					columnsXL: 1,
					columnsL: 1,
					columnsM: 1,
					singleContainerFullSize: false
				});
				for (var i = 0; i < oBatchMetricEntityType["vui.bodc.workspace.BatchMetrics"].length; i++) {
					var fieldname = oBatchMetricEntityType["vui.bodc.workspace.BatchMetrics"][i].String.toLowerCase();
					var oProperty = oBatchMetricEntityType["property"].find(function (prop) { return prop.name == fieldname });
					oForm.addContent(new sap.m.Label({
						text: oProperty["com.sap.vocabularies.Common.v1.Label"].String,
					}));
					if (oProperty["sap:unit"]) {
						oForm.addContent(new sap.m.Text({
							text: "{parts:[{path: 'viewModel>/BATCH_METRIC/" + fieldname + "'},{value: '2'}],formatter: 'zvui.work.controller.AnnotationHelper.formatDeimalValue'} {viewModel>/BATCH_METRIC/" + oProperty["sap:unit"] + "}"
						}));
					} else {
						oForm.addContent(new sap.m.Text({
							text: "{viewModel>/BATCH_METRIC/" + fieldname + "}"
						}));
					}
				}

				oForm.addContent(new sap.m.Label({
					text: "{i18n>BATCHREF}",
				}));
				oForm.addContent(new sap.m.Input({
					value: "{viewModel>/BATCH_METRIC/batchref}",
					layoutData: new sap.ui.layout.GridData({ span: "XL12 L12 M12 S12" })
				}));

				oContent.addContent(oForm);

				var oDialog = new sap.m.Dialog({
					title: "{i18n>CONFIRM}",
					icon: "sap-icon://question-mark",
					contentWidth: "10rem",
					content: [oContent],
					buttons: [new sap.m.Button({
						text: "{i18n>SAVE}",
						type: "Emphasized",
						press: function (oEvent) {
							oEvent.getSource().getParent().close();
							var value = oEvent.getSource().getParent().getContent()[0].getContent()[0].getContent()[oEvent.getSource().getParent().getContent()[0].getContent()[0].getContent().length - 1].getValue();
							if (value) {
								urlParameters["batchref"] = value;
							}
							oController.performSave(functionImportName, urlParameters);
						}
					}),
					new sap.m.Button({
						text: "{i18n>CANCEL}",
						press: function (oEvent) {
							sap.ui.core.BusyIndicator.hide();
							oEvent.getSource().getParent().close();
						}
					})]
				});
				jQuery.sap.syncStyleClass(oController.getOwnerComponent().getContentDensityClass(), oController.getView(), oDialog);
				oController.getView().addDependent(oDialog);
				oModel.read("/BATCH_METRIC", {
					urlParameters: oController.readQueryPrepare("BATCH_METRIC"),
					success: function (oData, response) {
						if (oData.results && oData.results.length > 0)
							viewModel.setProperty("/BATCH_METRIC", oData.results[0]);
						oDialog.open();
					}
				});
			} else {
				oController.performSave(functionImportName, urlParameters);
			}
		},
		performSave: function (functionImportName, urlParameters) {
			var oController = this;
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			var viewModel = oController.getOwnerComponent().getModel("viewModel");
			var functionImport = oMetaModel.getODataFunctionImport(functionImportName);
			oModel.callFunction("/" + functionImportName, {
				method: "POST",
				urlParameters: urlParameters,
				success: function (oData, response) {
					var backAction = false;
					if (functionImport["vui.bodc.workspace.ActionProperties"] &&
						functionImport["vui.bodc.workspace.ActionProperties"]["ActionType"] &&
						functionImport["vui.bodc.workspace.ActionProperties"]["ActionType"].String == "Back") {
						if (functionImportName != "SAV_RUN_N_REFR") {
							backAction = true;
							viewModel.setProperty("/fromSaveBackActionRequired", true);
						} else if (viewModel.getProperty("/currentRoute") == "DetailDetail") {
							viewModel.setProperty("/fromSaveRefreshAction", true);
							viewModel.setProperty("/fromSaveBackActionRequired", true);
						}
					}
					viewModel.setProperty("/modelChanged", false);
					// confirmation popup changes nav from launchpad
					if (parent && parent.commonUtils && parent.commonUtils.dataChanged) {
						parent.commonUtils.dataChanged = false;
					}
					// confirmation popup changes nav from launchpad
					viewModel.setProperty("/dataChangedInPreviousRoute", false);
					oController.getView().getContent()[0].getContent()[0]._$footerWrapper.addClass("vistexHideFooterWrapper");// for
					// hiding
					// footerWrapper
					if (viewModel.getProperty("/currentRoute") == "Detail") {
						viewModel.setProperty("/skipPageRefresh", false);
					}
					if (functionImportName == "SAVE" || functionImportName == "SAVE_AS_RUN") {
						viewModel.setProperty("/saveOnDetailPerformed", true);
					}
					oController.removenoBackHash();
					sap.ui.core.BusyIndicator.hide();
					viewModel.setProperty("/fromSaveDNCMessage", true);
					if (backAction) {
						//						138624 - Changes for Performance Improvement During Save and Refresh in
						//						Workspace - Started
						oController.onDiscard().then(() => {
							setTimeout(function () {
								if (viewModel.getProperty("/currentRoute") == "DetailDetail") {
									history.go(- currentPageLevel - 2);
								} else {
									oController.onBackToSearch();
								}
							}, 3000);
						});
						//						138624 - Changes for Performance Improvement During Save and Refresh in
						//						Workspace - Ended
					} else {
						if (viewModel.getProperty("/currentRoute") == "DetailDetail" &&
							functionImportName == "SAV_RUN_N_REFR") {
							var previouslyChanged = viewModel.getProperty("/dataChangedInPreviousRoute");
							var selectAllPerformed = viewModel.getProperty("/navBackOnSAVnRef");
							//							setTimeout(function(){
							//							if(previouslyChanged){
							//							viewModel.setProperty("/dataChangedInPreviousRoute",false);
							//							history.go(- currentPageLevel - 1);
							//							}else if(selectAllPerformed){
							//							viewModel.setProperty("/navBackOnSAVnRef",false);
							//							// history.go(-1)
							//							history.go(- currentPageLevel - 1);
							//							}
							//							}, 3000);
							//							viewModel.setProperty("/skipModelRefreshInDiscard",true);
						}
						var messageExists = oController.checkResponseForMessages(oData, response);
						//*************-Save Message is not getting display *********************-- start */
						if (messageExists) {
							var messageModel = oController.getOwnerComponent().getModel("message");
							var messageData = messageModel.getData();
							var messageCount = messageData.length;
							//						if(messageCount == 1 && messageData[0].type == "Success"){
							var myMessage = "";

							myMessage = messageData[0].message;



							if (messageCount == 1 && messageData[0].type == "Success") {
								MessageToast.show(myMessage, { duration: 5000, width: "100em" });
								$(".sapMMessageToast").addClass("messageToast");
								oController.removeMessages(oController);
							}
						}
						//*************-Save Message is not getting display *********************-- end */
						if (messageExists) {
							setTimeout(function () {
								oController.showMessagePopover(oController.messageButtonId);
								oController.onDiscard();
							}, 1000);
							// sap.ui.core.BusyIndicator.hide();
							// oController.showMessagePopover(oController.messageButtonId);
							// setTimeout(function () {
							// 	oController.onDiscard();

							// }, 3000);

						} else {
							oController.onDiscard();
						}
					}
				},
				error: function (oData, response) {
					sap.ui.core.BusyIndicator.hide();
					setTimeout(function () {
						oController.showMessagePopover(oController.messageButtonId);
					}, 3000);
				}
			});
		},
		onBacktoWorklist: function (oEvent) {
			var oController = this;
			this.getOwnerComponent().getRouter().navTo("Worklist", {}, true);
		},
		onFilterSearch: function (oEvent) {
			var oController = this;
			var oModel = oController.getView().getModel();

			var viewModel = oController.getView().getModel("viewModel");
			viewModel.setProperty("/searchEvent", true);
			viewModel.setProperty("/searchedEntity", oEvent.getSource().getEntitySet());
			var section = oController.getView().getContent()[0].getContent()[0]._oCurrentTabSection;
			var dynamicSideContent = oController.getResponsiveSplitter(section.getSubSections()[0].getBlocks()[0].getContent()[0]);
			oController.onClosingDscSideContent(dynamicSideContent);
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
		applyAndUp: function (oEvent) {
			var oController = this;
			history.go(-1);
		},
		onCollapse: function () {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var uiModel = oController.getView().getModel("ui");
			viewModel.setProperty("/layout", "TwoColumnsMidExpanded");
			viewModel.setProperty("/showDetailDetailClose", true);
			uiModel.setProperty("/showExpand", false);
			var sections = oController.getView().getContent()[0].getContent()[0].getSections();
			_.each(sections, function (section) {
				var dynamicSideContent = oController.getResponsiveSplitter(section.getSubSections()[0].getBlocks()[0].getContent()[0]);
				oController.onClosingDscSideContent(dynamicSideContent);
			});
			var dynamicSideContent = oController.getResponsiveSplitter(oController.getView().getContent()[0].getContent()[0]._oCurrentTabSection.getSubSections()[0].getBlocks()[0].getContent()[0]);
			oController.onClosingDscSideContent(dynamicSideContent);
			this._updateUIElements();
		},
		onExpand: function () {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var uiModel = oController.getView().getModel("ui");
			uiModel.setProperty("/showExpand", true);
			viewModel.setProperty("/layout", "MidColumnFullScreen");
			viewModel.setProperty("/showDetailDetailClose", true);
			this._updateUIElements();
		},
		onhandleClose: function (oEvent) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var sPath = viewModel.getProperty("/navigationPath");
			var modelChanged = viewModel.getProperty("/modelChanged");
			viewModel.setProperty("/DetailPageSet", true);
			oController.removeTransientMessages();
			oController.removeMessages(oController);
			sap.ui.core.BusyIndicator.show(0);
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();

			var urlParameters = {};
			var functionImport = oMetaModel.getODataFunctionImport('DETAIL_CANCEL');
			if (functionImport && functionImport.parameter) {
				var length = functionImport.parameter.length;
			}
			if (length > 0) {
				var object = oController.getView().getBindingContext().getObject();
				for (var i = 0; i < length; i++) {
					urlParameters[functionImport.parameter[i].name] = object[functionImport.parameter[i].name];
				}
			}

			viewModel.setProperty(viewModel.getProperty("/DetailPageMainTablePath"), true);

			oController.onDetailCancelFI(urlParameters, sPath);

		},

		onDetailCancelFI: function (urlParameters, sPath) {
			var oController = this;
			var viewModel = oController.getView().getModel("viewModel");
			var oModel = oController.getView().getModel();
			var oMetaModel = oModel.getMetaModel();
			viewModel.setProperty("/drilldown", false);
			viewModel.setProperty("/hideDetailFooter", false);
			viewModel.setProperty("/DetailDetailEntitySet", "");

			// for back action during selectall and save & refresh for summary
			viewModel.setProperty("/navBackOnSAVnRefOnSmry", false);

			oController.removenoBackHash();
			setTimeout(function () {
				viewModel.setProperty("/onDetailDetailClose", true);
				history.go(-1);
			}, 100);
			if (viewModel.getProperty("/disableBulkEdit")) {
				viewModel.setProperty("/disableBulkEdit", false);
			}
			oController._updateUIElements();
			sap.ui.core.BusyIndicator.hide();

		}
	});

});
//# sourceURL=https://usegsaplds4d.vistex.com/sap/bc/ui5_ui5/vui/bwsm/controller/dynamicPage.controller.js?eval